/* Discipline PWA service worker */
const CACHE = "discipline-shell-v1";
const SHELL = ["/", "/today", "/manifest.webmanifest", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  // Network-first for navigations and API; cache-first for static icons
  if (url.pathname.startsWith("/icons/") || url.pathname === "/manifest.webmanifest") {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request)),
    );
    return;
  }
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/today").then((r) => r || caches.match("/"))),
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {
    title: "Discipline",
    body: "You have an open requirement.",
    url: "/today",
    badgeCount: 1,
  };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // ignore malformed payload
  }

  event.waitUntil(
    (async () => {
      if (self.registration.setAppBadge && data.badgeCount != null) {
        try {
          await self.registration.setAppBadge(data.badgeCount);
        } catch {
          // optional
        }
      }
      await self.registration.showNotification(data.title, {
        body: data.body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { url: data.url || "/today" },
        tag: data.url || "discipline",
        renotify: true,
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/today";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    }),
  );
});
