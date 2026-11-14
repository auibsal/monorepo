// Browser push is gone (decisions.md, The platform: notices are email and
// Hudhud only). A browser that registered the old worker gets this one,
// which removes itself and its subscription.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const subscription =
        await self.registration.pushManager?.getSubscription?.();
      await subscription?.unsubscribe?.();
      await self.registration.unregister();
    })()
  );
});
