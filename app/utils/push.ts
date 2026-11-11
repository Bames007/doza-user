import "server-only";
import webpush, { type PushSubscription } from "web-push";
import { adminDb } from "@/app/utils/firebaseAdmin";

webpush.setVapidDetails(
  "mailto:eddybames007@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, // ✅ matches client subscribe key
  process.env.VAPID_PRIVATE_KEY!,
);

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
};

function endpointKey(endpoint: string): string {
  return Buffer.from(endpoint).toString("base64url").slice(0, 48);
}

function asArray(v: any): any[] {
  if (!v) return [];
  return Array.isArray(v) ? v : Object.values(v);
}

async function readSubscriptions(uid: string): Promise<PushSubscription[]> {
  const snap = await adminDb
    .ref(`doza/users/${uid}/pushSubscriptions`)
    .once("value");
  return asArray(snap.val()).filter(
    (s: any) => s && typeof s.endpoint === "string" && s.keys,
  ) as PushSubscription[];
}

// ✅ object-keyed pruning — matches the shape stored by /api/notifications/subscribe
async function pruneSubscriptions(uid: string, deadEndpoints: string[]) {
  const updates: Record<string, null> = {};
  for (const ep of deadEndpoints) updates[endpointKey(ep)] = null;
  await adminDb.ref(`doza/users/${uid}/pushSubscriptions`).update(updates);
}

export async function sendPushToUser(
  uid: string,
  payload: PushPayload,
): Promise<{ sent: number; pruned: number; total: number }> {
  const subs = await readSubscriptions(uid);
  if (subs.length === 0) return { sent: 0, pruned: 0, total: 0 };

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/dashboard?panel=medications",
    tag: payload.tag ?? "doza-dose",
    icon: payload.icon ?? "/logo.png",
  });

  const dead: string[] = [];
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, body);
        sent++;
      } catch (err: any) {
        const status = err?.statusCode;
        if (status === 404 || status === 410) {
          dead.push(sub.endpoint);
        } else {
          console.warn(
            `[push] failed uid=${uid} status=${status} msg=${err?.message}`,
          );
        }
      }
    }),
  );

  if (dead.length > 0) await pruneSubscriptions(uid, dead);

  return { sent, pruned: dead.length, total: subs.length };
}
