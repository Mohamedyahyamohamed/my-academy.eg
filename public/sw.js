const STATIC_CACHE = "my-academy-static-v3";
const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache authenticated pages or API responses: both may contain tenant-scoped data.
  const isStaticAsset = url.pathname.startsWith("/_next/static/") || ["/manifest.webmanifest", "/icon.svg", "/favicon.ico"].includes(url.pathname);
  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
    )
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "إشعار من MY Academy", body: "لديك إشعار جديد", url: "/" };
  try {
    data = { ...data, ...JSON.parse(event.data?.text() || "{}") };
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      dir: "rtl",
      lang: "ar",
      vibrate: [100, 50, 100],
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => "focus" in client);
      if (existing) return existing.focus();
      return clients.openWindow(destination);
    })
  );
});
