import { Composer } from "grammy";
import type { BotContext } from "../../context";
import { copy } from "../../copy";
import { group as loadGroup } from "../../db";
import { when } from "../../format";
import { postTo } from "./common";

/**
 * Live streams in the members' group (decisions.md: Manage Live Streams,
 * announcing streams; a bot can't run one). When an admin schedules or
 * starts one, Hudhud says so in Announcements, in English as every group
 * post is.
 */
export const streams = new Composer<BotContext>();
const groups = streams.chatType(["group", "supergroup"]);

groups.on("message:video_chat_scheduled", async (ctx) => {
  const group = await loadGroup(ctx.chat.id);
  if (group?.audience !== "members") {
    return;
  }
  const at = new Date(ctx.msg.video_chat_scheduled.start_date * 1000);
  await postTo(
    ctx.api,
    group,
    ["announcements"],
    copy.en.streamSoon(when("en", at.toISOString())),
    { parse_mode: "HTML" }
  ).catch(() => undefined);
});

groups.on("message:video_chat_started", async (ctx) => {
  const group = await loadGroup(ctx.chat.id);
  if (group?.audience !== "members") {
    return;
  }
  // Already in Announcements: Telegram's own line says it there.
  if (ctx.msg.message_thread_id === group.topics.announcements) {
    return;
  }
  await postTo(ctx.api, group, ["announcements"], copy.en.streamLive, {
    parse_mode: "HTML",
  }).catch(() => undefined);
});
