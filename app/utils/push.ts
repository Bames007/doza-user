// app/utils/push.ts
import "server-only";
import webpush, { type PushSubscription } from "web-push";
import { adminDb } from "@/app/utils/firebaseAdmin";

// Lazy VAPID init — runs only when a push is actually sent, not at build.
let vapidConfigured = false;

function ensureVapid(): void {
  if (vapidConfigured) return;

  const publicKey =
    process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:eddybames007@gmail.com";

  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID keys missing. Set VAPID_PUBLIC_KEY (or NEXT_PUBLIC_VAPID_PUBLIC_KEY) and VAPID_PRIVATE_KEY in env.",
    );
  }

  const decoded = Buffer.from(privateKey, "base64url");
  if (decoded.length !== 32) {
    throw new Error(
      `VAPID_PRIVATE_KEY must decode to 32 bytes. Got ${decoded.length}. ` +
        `Regenerate with: npx web-push generate-vapid-keys --json`,
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

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

async function pruneSubscriptions(uid: string, deadEndpoints: string[]) {
  const updates: Record<string, null> = {};
  for (const ep of deadEndpoints) updates[endpointKey(ep)] = null;
  await adminDb.ref(`doza/users/${uid}/pushSubscriptions`).update(updates);
}

export async function sendPushToUser(
  uid: string,
  payload: PushPayload,
): Promise<{ sent: number; pruned: number; total: number }> {
  ensureVapid();

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
