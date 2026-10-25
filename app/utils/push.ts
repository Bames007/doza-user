// app/utils/push.ts
import "server-only";
import webPush from "web-push";

const publicKey = process.env.VAPID_PUBLIC_KEY!;
const privateKey = process.env.VAPID_PRIVATE_KEY!;
const subject = process.env.VAPID_SUBJECT || "mailto:eddybames007@gmail.com";

if (!publicKey || !privateKey) {
  throw new Error(
    "VAPID keys missing. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in env.",
  );
}

webPush.setVapidDetails(subject, publicKey, privateKey);

export type StoredSub = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export async function sendPush(sub: StoredSub, payload: PushPayload) {
  try {
    await webPush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url ?? "/dashboard?panel=medications",
        tag: payload.tag,
        icon: "/logo.png",
        badge: "/logo.png",
      }),
      { TTL: 3600, urgency: "high" },
    );
    return { ok: true as const };
  } catch (err: any) {
    const status = err?.statusCode;
    return {
      ok: false as const,
      gone: status === 404 || status === 410,
      status,
    };
  }
}
