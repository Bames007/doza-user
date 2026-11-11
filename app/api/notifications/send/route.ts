// import { NextRequest, NextResponse } from "next/server";
// import { adminDb } from "@/app/utils/firebaseAdmin";
// import webPush from "web-push";
// import logger from "@/app/utils/logger";

// webPush.setVapidDetails(
//   "mailto:eddybames007@gmail.com",
//   process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
//   process.env.VAPID_PRIVATE_KEY!,
// );

// export async function POST(request: NextRequest) {
//   const auth = request.headers.get("authorization");
//   if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }

//   try {
//     const now = new Date();
//     const fiveMinsLater = new Date(now.getTime() + 5 * 60000);

//     const usersRef = adminDb.ref("doza/users");
//     const snapshot = await usersRef.once("value");
//     const users = snapshot.val() || {};

//     for (const [uid, userData] of Object.entries(users)) {
//       const medsRef = adminDb.ref(`doza/users/${uid}/medications`);
//       const medsSnap = await medsRef.once("value");
//       const meds: any[] = medsSnap.val() || [];

//       const dueDoses = meds.flatMap((med: any) =>
//         med.doses.filter(
//           (d: any) =>
//             !d.takenAt &&
//             new Date(d.scheduledTime) > now &&
//             new Date(d.scheduledTime) <= fiveMinsLater,
//         ),
//       );

//       if (dueDoses.length === 0) continue;

//       const subsRef = adminDb.ref(`doza/users/${uid}/pushSubscriptions`);
//       const subsSnap = await subsRef.once("value");
//       const subscriptions: any[] = subsSnap.val() || [];

//       for (const sub of subscriptions) {
//         const payload = JSON.stringify({
//           title: "Time for your medication",
//           body: `You have ${dueDoses.length} dose(s) due soon.`,
//           data: { uid },
//         });
//         try {
//           await webPush.sendNotification(sub, payload);
//         } catch (err) {
//           logger.error({
//             uid,
//             message: "Push notification failed",
//             error: err,
//           });
//         }
//       }
//     }

//     return NextResponse.json({ success: true });
//   } catch (error) {
//     logger.error({ message: "Send notifications failed", error });
//     return NextResponse.json(
//       { success: false, error: "Unable to send notifications" },
//       { status: 500 },
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import webPush from "web-push";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let vapidConfigured = false;

function ensureVapid(): void {
  if (vapidConfigured) return;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:eddybames007@gmail.com";

  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys missing.");
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

export async function POST(request: NextRequest) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    ensureVapid();
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const title = body?.title || "Doza test notification";
    const message = body?.body || "If you see this, push is working.";

    const subsSnap = await adminDb
      .ref(`doza/users/${uid}/pushSubscriptions`)
      .once("value");

    const subs = Object.values<any>(subsSnap.val() || {}).filter(
      (s: any) => s?.endpoint && s?.keys?.p256dh && s?.keys?.auth,
    );

    if (subs.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No push subscriptions for this user",
        sent: 0,
      });
    }

    let sent = 0;
    let pruned = 0;

    for (const sub of subs) {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify({
            title,
            body: message,
            url: "/dashboard?panel=medications",
            tag: "doza-test",
            icon: "/logo.png",
            badge: "/logo.png",
          }),
          { TTL: 3600, urgency: "high" },
        );
        sent++;
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
          console.warn("[send] push failed", status, err?.message);
        }
      }
    }

    return NextResponse.json({ success: true, sent, pruned });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to send" },
      { status: 500 },
    );
  }
}
