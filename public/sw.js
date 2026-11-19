// public/sw.js
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let data = {};
      try {
        data = event.data?.json() ?? {};
      } catch {
        data = { title: "Doza", body: event.data?.text() || "" };
      }

      const isChat = !!data.appointmentId;
      const defaultUrl = isChat
        ? `/dashboard?panel=appointment&appointmentId=${data.appointmentId}`
        : "/dashboard?panel=medications";

      // ── Forward to any open tab so it can chime / refresh / toast ──
      //
      // IMPORTANT: `appointmentId` and `role` are forwarded at the TOP
      // LEVEL of the message, not nested inside `payload`. The client
      // (`push-client.ts`) reads `data.appointmentId` to invalidate the
      // specific `/api/appointments/<id>/messages` SWR key. If you move
      // these fields into `payload`, the open chat will stop refreshing
      // when a push arrives.
      const tabs = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const c of tabs) {
        try {
          if (isChat) {
            c.postMessage({
              type: "DOZA_NEW_MESSAGE",
              appointmentId: data.appointmentId,
              role: data.role || null,
              payload: data,
            });
          }
        } catch {}
      }

      // ── For chat messages: skip OS notification if a tab is focused ──
      // (the app will play chime + toast itself). Medications always notify.
      if (isChat) {
        const hasFocused = tabs.some((c) => c.focused);
        if (hasFocused) return;
      }

      await self.registration.showNotification(data.title || "Doza", {
        body: data.body || "",
        icon: data.icon || "/logo.png",
        badge: data.badge || "/logo.png",
        tag: data.tag || (isChat ? data.appointmentId : "doza-dose"),
        silent: isChat, // chime handled by app when tab is present
        data: {
          url: data.url || defaultUrl,
          appointmentId: data.appointmentId || null,
          role: data.role || null,
          isChat,
        },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "close") return;

  const d = event.notification.data || {};
  const target = d.url || "/dashboard";
  const isChat = !!d.appointmentId;

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
            // Ask the app to open the chat inline (avoids full reload).
            if (isChat) {
              tab.postMessage({
                type: "DOZA_OPEN_CHAT",
                appointmentId: d.appointmentId,
                role: d.role,
              });
            } else if ("navigate" in tab && tab.url !== abs.href) {
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