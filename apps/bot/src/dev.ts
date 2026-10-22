import { allowedUpdates, sharedBot } from "./bot";
import { runFeeds } from "./feeds";

/**
 * Local development with a separate test bot (its own token in
 * .env.local): long polling instead of the webhook, and the group posts
 * every minute. Never run this with the Society's production token: it
 * removes the webhook.
 */
const bot = sharedBot();
await bot.api.deleteWebhook();
await bot.init();
console.log(`@${bot.botInfo.username} is listening. Ctrl+C stops it.`);
setInterval(() => {
  runFeeds(bot.api, bot.botInfo.username).catch((error: unknown) =>
    console.error("Group posts failed", error)
  );
}, 60_000);
await bot.start({ allowed_updates: [...allowedUpdates] });
