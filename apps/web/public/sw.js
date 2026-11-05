// The Diwan service worker: shows Web Push notices sent by the API routes and opens
// the Diwan when one is tapped. It caches nothing; the Diwan stays online-only.

self.addEventListener("push", (event) => {
  let notice = {};
  try {
    notice = event.data ? event.data.json() : {};
  } catch {
    notice = {};
  }
  const title = typeof notice.title === "string" ? notice.title : "The Diwan";
  event.waitUntil(
    self.registration.showNotification(title, {
      badge: "/icons/sal-badge-96.png",
      body: typeof notice.body === "string" ? notice.body : "",
      data: { url: typeof notice.url === "string" ? notice.url : "/" },
      dir: notice.lang === "ar" ? "rtl" : "ltr",
      icon: "/icons/sal-avatar-192.png",
      lang: notice.lang === "ar" ? "ar" : "en",
      tag: typeof notice.tag === "string" ? notice.tag : undefined,
    })
  );
});

// Opens only Diwan pages: a notice can never send someone elsewhere.
const diwanUrl = (raw) => {
  try {
    const url = new URL(raw, self.location.origin);
    return url.origin === self.location.origin
      ? url.href
      : self.location.origin;
  } catch {
    return self.location.origin;
  }
};

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = diwanUrl(event.notification.data?.url ?? "/");
  event.waitUntil(
    self.clients
      .matchAll({ includeUncontrolled: true, type: "window" })
      .then((windows) => {
        for (const client of windows) {
          if (client.url === target && "focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      })
  );
});
