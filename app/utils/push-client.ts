// app/utils/push-client.ts
"use client";

import { mutate as globalMutate } from "swr";
import { playMessageChime } from "./notify";

let registered = false;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) out[i] = rawData.charCodeAt(i);
  return out;
}

export async function registerPush(
  role: "medic" | "patient",
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window))
    return false;
  if (typeof Notification === "undefined") return false;
  if (Notification.permission !== "granted") return false;

  // Verify the cached flag — don't trust it blindly. A restored tab
  // (bfcache) or a rotated FCM endpoint can leave `registered === true`
  // while the browser has no valid subscription. That used to leave the
  // server pushing to a dead endpoint (404/410).
  if (registered) {
    try {
      const existing = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await existing?.pushManager.getSubscription();
      if (sub) return true;
    } catch {}
    registered = false;
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.warn("[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set — push disabled");
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          vapidPublicKey,
        ) as BufferSource,
      });
    }

    const res = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ subscription: subscription.toJSON(), role }),
    });
    const json = await res.json().catch(() => ({}));
    if (json?.success) {
      registered = true;
      return true;
    }
  } catch (err) {
    console.warn("[push] registerPush failed", err);
  }
  return false;
}

export async function unregisterPush(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/notifications/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
  } catch {}
  registered = false;
}

/**
 * Listens for postMessage calls from the service worker:
 *  - DOZA_NEW_MESSAGE → invalidate open chat SWR key(s) + appointments
 *                       list + chime (push while tab is open)
 *  - DOZA_OPEN_CHAT   → dispatch doza:open-appointment-chat (click-through)
 */
export function listenForServiceWorkerMessages(): () => void {
  if (typeof window === "undefined") return () => {};
  if (!("serviceWorker" in navigator)) return () => {};

  const handler = (event: MessageEvent) => {
    const data = event.data;
    if (!data || typeof data !== "object") return;

    if (data.type === "DOZA_NEW_MESSAGE") {
      // Refresh the specific open chat (if any) AND the appointments list.
      // Before this change, only `/api/appointments` was invalidated, so
      // the open ChatPanel relied purely on its 8s SWR poll — which is
      // throttled when the tab is backgrounded, so users felt "not sent".
      if (data.appointmentId) {
        globalMutate(`/api/appointments/${data.appointmentId}/messages`);
      } else {
        // Fallback — revalidate every open chat message key we know about.
        globalMutate(
          (key) =>
            typeof key === "string" &&
            key.startsWith("/api/appointments/") &&
            key.endsWith("/messages"),
        );
      }
      globalMutate("/api/appointments");
      playMessageChime();
    }

    if (data.type === "DOZA_OPEN_CHAT" && data.appointmentId) {
      window.dispatchEvent(
        new CustomEvent("doza:open-appointment-chat", {
          detail: { appointmentId: data.appointmentId },
        }),
      );
    }
  };

  navigator.serviceWorker.addEventListener("message", handler);
  return () => navigator.serviceWorker.removeEventListener("message", handler);
}
