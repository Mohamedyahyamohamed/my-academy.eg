self.addEventListener("push", (event) => {
  let data = { title: "إشعار", body: "لديك إشعار جديد" };
  try {
    data = JSON.parse(event.data.text());
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "/favicon.ico",
      badge: "/favicon.ico",
      dir: "rtl",
      lang: "ar",
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow("/")
  );
});
