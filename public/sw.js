// public/sw.js
// Service worker for Doza — handles:
//   1. Server-triggered push notifications (from cron / API)
//   2. Local notifications fired from MedicationPanel countdown
//   3. Notification clicks → focus or open /dashboard?panel=medications

// ─── Lifecycle ─────────────────────────────────────────────
self.addEventListener("install", () => {
  // Activate immediately on first install
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ─── Push handler (server-triggered) ───────────────────────
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { title: "Doza", body: event.data?.text() || "" };
  }

  const title = payload.title || "Doza Reminder";
  const body = payload.body || "You have a new notification.";
  const icon = payload.icon || "/logo.png";
  const badge = payload.badge || "/logo.png";
  const targetUrl =
    payload.data?.url || payload.url || "/dashboard?panel=medications";

  const options = {
    body,
    icon,
    badge,
    tag: payload.tag || "doza-notification",
    renotify: false,
    data: { url: targetUrl },
    // Actions appear on Android; ignored silently on iOS/desktop
    actions: [
      { action: "open", title: "View" },
      { action: "close", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Click handler ─────────────────────────────────────────
// Fires for BOTH:
//   • Server push (has actions)
//   • Local notifications from MedicationPanel (no actions,
//     just data.url — body click must work)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Explicit "Dismiss"
  if (event.action === "close") return;

  // Body tap OR "View" action
  const targetUrl =
    event.notification.data?.url || "/dashboard?panel=medications";

  event.waitUntil(
    (async () => {
      const absoluteTarget = new URL(targetUrl, self.location.origin);

      // Reuse an existing tab if one is open on our origin
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clientList) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === absoluteTarget.origin) {
            await client.focus();
            if ("navigate" in client && client.url !== absoluteTarget.href) {
              await client.navigate(absoluteTarget.href);
            }
            return;
          }
        } catch {
          // Ignore malformed client URLs
        }
      }

      // Otherwise open a fresh tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(absoluteTarget.href);
      }
    })(),
  );
});