// public/sw.js
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: "Doza", body: event.data?.text() || "" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Doza", {
      body: data.body || "",
      icon: data.icon || "/logo.png",
      badge: data.badge || "/logo.png",
      tag: data.tag || "doza-dose",
      data: { url: data.url || "/dashboard?panel=medications" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "close") return;

  const target =
    event.notification.data?.url || "/dashboard?panel=medications";

  event.waitUntil(
    (async () => {
      const abs = new URL(target, self.location.origin);
      const tabs = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const tab of tabs) {
        try {
          if (new URL(tab.url).origin === abs.origin) {
            await tab.focus();
            if ("navigate" in tab && tab.url !== abs.href) {
              await tab.navigate(abs.href);
            }
            return;
          }
        } catch {}
      }

      return self.clients.openWindow(abs.href);
    })(),
  );
});