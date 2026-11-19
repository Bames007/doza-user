// app/utils/webpush.ts
import * as webpush from "web-push";
import { adminDb } from "@/app/utils/firebaseAdmin";
import logger from "@/app/utils/logger";

const PUBLIC =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  process.env.VAPID_PUBLIC_KEY ||
  "";
const PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:support@doza.app";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!PUBLIC || !PRIVATE) {
    console.warn("[web-push] VAPID keys missing — push disabled.");
    return false;
  }
  try {
    webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
    configured = true;
    return true;
  } catch (err) {
    logger.error({
      message: "web-push setVapidDetails failed",
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

export type PushPayload = {
  title: string;
  body: string;
  appointmentId?: string;
  role?: "medic" | "patient";
  url?: string;
  tag?: string;
  icon?: string;
};

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  if (!userId) return;
  if (!ensureConfigured()) return;

  try {
    const snap = await adminDb
      .ref(`doza_push_subscriptions/${userId}`)
      .once("value");
    const all = (snap.val() || {}) as Record<string, any>;
    const entries = Object.entries(all);
    if (!entries.length) return;

    const body = JSON.stringify(payload);

    await Promise.all(
      entries.map(async ([key, value]) => {
        if (!value?.endpoint || !value?.keys?.p256dh || !value?.keys?.auth)
          return;
        try {
          await webpush.sendNotification(
            {
              endpoint: value.endpoint,
              keys: { p256dh: value.keys.p256dh, auth: value.keys.auth },
            },
            body,
          );
        } catch (err: any) {
          const status = err?.statusCode;
          if (status === 404 || status === 410) {
            await adminDb
              .ref(`doza_push_subscriptions/${userId}/${key}`)
              .remove()
              .catch(() => {});
          } else {
            console.warn(
              "[web-push] send failed:",
              err?.message || String(err),
            );
          }
        }
      }),
    );
  } catch (err) {
    logger.error({
      message: "sendPushToUser failed",
      errorMessage: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function notifyNewChatMessage(opts: {
  appointmentId: string;
  meta: {
    medicId: string;
    patientId: string;
    medicName?: string;
    patientName?: string;
  };
  senderRole: "patient" | "medic";
  preview: string;
}): Promise<void> {
  const recipientRole: "medic" | "patient" =
    opts.senderRole === "patient" ? "medic" : "patient";

  const recipientUserId =
    recipientRole === "medic" ? opts.meta.medicId : opts.meta.patientId;

  if (!recipientUserId) return;

  const senderName =
    opts.senderRole === "patient"
      ? opts.meta.patientName || "Patient"
      : opts.meta.medicName || "Your medic";

  // ⚠️ CHANGED: patient URL now deep-links into the single-app dashboard.
  const url =
    recipientRole === "medic"
      ? "/dashboard"
      : `/dashboard?panel=appointment&appointmentId=${opts.appointmentId}`;

  await sendPushToUser(recipientUserId, {
    title: `New message · ${senderName}`,
    body: opts.preview || "New message",
    appointmentId: opts.appointmentId,
    role: recipientRole,
    tag: opts.appointmentId,
    url,
  });
}
