// // app/api/cron/medication-reminders/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { adminDb } from "@/app/utils/firebaseAdmin";
// import { sendPush } from "@/app/utils/push";
// import logger from "@/app/utils/logger";

// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";
// export const maxDuration = 60;

// const WINDOW_MS = 90_000; // 90s window absorbs cron jitter
// const THRESHOLDS = [10, 5, 1, 0] as const;

// export async function GET(request: NextRequest) {
//   const secret = process.env.CRON_SECRET;
//   if (secret) {
//     const auth = request.headers.get("authorization");
//     if (auth !== `Bearer ${secret}`) {
//       return NextResponse.json(
//         { success: false, error: "Unauthorized" },
//         { status: 401 },
//       );
//     }
//   }

//   const now = Date.now();
//   const startedAt = now;

//   let pushed = 0;
//   let pruned = 0;
//   let skipped = 0;

//   try {
//     // Only reads rows where doseTime is in the next 11 minutes.
//     // The .indexOn rule for doseTime is required (see below).
//     const snap = await adminDb
//       .ref("doza/reminders")
//       .orderByChild("doseTime")
//       .startAt(now - WINDOW_MS)
//       .endAt(now + 11 * 60_000)
//       .once("value");

//     const all = snap.val() ?? {};

//     for (const [uid, meds] of Object.entries<any>(all)) {
//       for (const [medId, doses] of Object.entries<any>(meds)) {
//         for (const [doseId, row] of Object.entries<any>(doses)) {
//           if (!row || row.status !== "active") continue;

//           const diffMin = (row.doseTime - now) / 60_000;

//           for (const th of THRESHOLDS) {
//             const inWindow = diffMin <= th && diffMin > th - 1.5;
//             if (!inWindow) continue;

//             if (row.sent?.[String(th)]) {
//               skipped++;
//               continue;
//             }

//             const subsSnap = await adminDb
//               .ref(`doza/users/${uid}/pushSubscriptions`)
//               .once("value");

//             const subs = Object.values<any>(subsSnap.val() ?? {}).filter(
//               (s: any) => s?.endpoint && s?.keys?.p256dh && s?.keys?.auth,
//             );

//             for (const sub of subs) {
//               const res = await sendPush(sub, {
//                 title:
//                   th === 0
//                     ? "Dose due now"
//                     : `${th} minute${th === 1 ? "" : "s"} to dose`,
//                 body: `${row.medName || "Medication"}${row.dosage ? ` (${row.dosage})` : ""}`,
//                 tag: `${medId}-${doseId}`,
//               });

//               if (res.ok) {
//                 pushed++;
//               } else if (res.gone) {
//                 const k = Buffer.from(sub.endpoint)
//                   .toString("base64url")
//                   .slice(0, 48);
//                 await adminDb
//                   .ref(`doza/users/${uid}/pushSubscriptions/${k}`)
//                   .remove();
//                 pruned++;
//               }
//             }

//             // Mark sent - idempotency key for this threshold on this dose
//             await adminDb
//               .ref(`doza/reminders/${uid}/${medId}/${doseId}/sent/${th}`)
//               .set(true);
//           }
//         }
//       }
//     }

//     logger.info({
//       message: "Medication reminders cron run",
//       durationMs: Date.now() - startedAt,
//       pushed,
//       pruned,
//       skipped,
//     });

//     return NextResponse.json({
//       success: true,
//       durationMs: Date.now() - startedAt,
//       pushed,
//       pruned,
//       skipped,
//     });
//   } catch (error: any) {
//     logger.error({ message: "Medication reminders cron failed", error });
//     return NextResponse.json(
//       { success: false, error: error?.message || "Cron failed" },
//       { status: 500 },
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import webPush from "web-push";
import { adminDb } from "@/app/utils/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WINDOW_MS = 90_000;
const THRESHOLDS = [10, 5, 1, 0] as const;

let vapidConfigured = false;

function ensureVapid(): void {
  if (vapidConfigured) return;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:eddybames007@gmail.com";

  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID keys missing. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in env.",
    );
  }

  const decoded = Buffer.from(privateKey, "base64url");
  if (decoded.length !== 32) {
    throw new Error(
      `VAPID_PRIVATE_KEY must decode to 32 bytes. Got ${decoded.length}.`,
    );
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
  }

  try {
    ensureVapid();
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }

  const now = Date.now();
  const startedAt = now;

  let pushed = 0;
  let pruned = 0;
  let skipped = 0;

  try {
    const snap = await adminDb
      .ref("doza/reminders")
      .orderByChild("doseTime")
      .startAt(now - WINDOW_MS)
      .endAt(now + 11 * 60_000)
      .once("value");

    const all = snap.val() ?? {};

    for (const [uid, meds] of Object.entries<any>(all)) {
      for (const [medId, doses] of Object.entries<any>(meds)) {
        for (const [doseId, row] of Object.entries<any>(doses)) {
          if (!row || row.status !== "active") continue;

          const diffMin = (row.doseTime - now) / 60_000;

          for (const th of THRESHOLDS) {
            const inWindow = diffMin <= th && diffMin > th - 1.5;
            if (!inWindow) continue;

            if (row.sent?.[String(th)]) {
              skipped++;
              continue;
            }

            const subsSnap = await adminDb
              .ref(`doza/users/${uid}/pushSubscriptions`)
              .once("value");

            const subs = Object.values<any>(subsSnap.val() ?? {}).filter(
              (s: any) => s?.endpoint && s?.keys?.p256dh && s?.keys?.auth,
            );

            for (const sub of subs) {
              try {
                await webPush.sendNotification(
                  { endpoint: sub.endpoint, keys: sub.keys },
                  JSON.stringify({
                    title:
                      th === 0
                        ? "Dose due now"
                        : `${th} minute${th === 1 ? "" : "s"} to dose`,
                    body: `${row.medName || "Medication"}${
                      row.dosage ? ` (${row.dosage})` : ""
                    }`,
                    url: "/dashboard?panel=medications",
                    tag: `${medId}-${doseId}`,
                    icon: "/logo.png",
                    badge: "/logo.png",
                  }),
                  { TTL: 3600, urgency: "high" },
                );
                pushed++;
              } catch (err: any) {
                const status = err?.statusCode;
                if (status === 404 || status === 410) {
                  const k = Buffer.from(sub.endpoint)
                    .toString("base64url")
                    .slice(0, 48);
                  await adminDb
                    .ref(`doza/users/${uid}/pushSubscriptions/${k}`)
                    .remove();
                  pruned++;
                } else {
                  console.warn("[cron] push send failed", status, err?.message);
                }
              }
            }

            await adminDb
              .ref(`doza/reminders/${uid}/${medId}/${doseId}/sent/${th}`)
              .set(true);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      durationMs: Date.now() - startedAt,
      pushed,
      pruned,
      skipped,
    });
  } catch (error: any) {
    console.error("[cron] medication-reminders failed", error?.message);
    return NextResponse.json(
      { success: false, error: error?.message || "Cron failed" },
      { status: 500 },
    );
  }
}
