self.addEventListener("push", function (event) {
  const data = event.data?.json() ?? {};
  const { title, body, icon, badge, data: payload } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: icon || "/icons/icon-192x192.png",
      badge: badge || "/icons/badge-72x72.png",
      data: payload,
      actions: [
        { action: "open", title: "View" },
        { action: "close", title: "Dismiss" },
      ],
    })
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  if (event.action === "open") {
    // Open the medication panel
    clients.openWindow("/dashboard?panel=medications");
  }
});