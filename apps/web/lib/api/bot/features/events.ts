import { escapeHtml } from "@repo/telegram";
import { Composer, InlineKeyboard } from "grammy";
import type { BotContext } from "../context";
import { db, type EventRow, visibleEvents } from "../db";
import { eventText, pick, when } from "../format";
import { botLink, eventCalendar, eventPage } from "../links";
import { followWithSticker } from "../stickers";
import { linkKeyboard } from "./account";

/**
 * Events: the list, one card per event, and RSVPs in one tap. A linked
 * member's RSVP runs core.telegram_rsvp, which calls events.rsvp() as the
 * member: the same rules as the Nexus (members only, capacity, waitlist).
 */
export const events = new Composer<BotContext>();

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
export const EVENT_PAYLOAD = new RegExp(`^ev_(${UUID})$`);
const MAX_LABEL = 48;

const short = (text: string) =>
  text.length > MAX_LABEL ? `${text.slice(0, MAX_LABEL - 1)}…` : text;

const listView = async (ctx: BotContext) => {
  await ctx.account();
  const list = await visibleEvents(ctx.from?.id ?? 0, { max: 6 });
  if (!list.length) {
    return { empty: true, keyboard: undefined, text: ctx.t.eventsNone };
  }
  const keyboard = new InlineKeyboard();
  const isPrivate = ctx.chat?.type === "private";
  for (const event of list) {
    const title = short(pick(ctx.lang, event.title_en, event.title_ar));
    if (isPrivate) {
      keyboard.text(title, `ev:${event.id}`).row();
    } else {
      keyboard.url(title, botLink(ctx.botUsername, `ev_${event.id}`)).row();
    }
  }
  const lines = list.map(
    (event) =>
      `<b>${escapeHtml(pick(ctx.lang, event.title_en, event.title_ar))}</b>\n${when(ctx.lang, event.starts_at)}`
  );
  return {
    keyboard,
    text: [ctx.t.eventsTitle, "", lines.join("\n\n")].join("\n"),
  };
};

const cardKeyboard = (ctx: BotContext, event: EventRow) => {
  const keyboard = new InlineKeyboard();
  const ended = new Date(event.ends_at ?? event.starts_at) < new Date();
  if (event.rsvp_enabled && !ended) {
    if (event.mine) {
      keyboard.text(ctx.t.buttons.cancel, `unrsvp:${event.id}`);
    } else {
      keyboard.text(ctx.t.buttons.rsvp, `rsvp:${event.id}`);
    }
    keyboard.row();
  }
  if (!event.members_only) {
    keyboard
      .url(ctx.t.buttons.details, eventPage(ctx.lang, event.slug))
      .url(ctx.t.buttons.calendar, eventCalendar(ctx.lang, event.slug))
      .row();
  }
  return keyboard.text(ctx.t.buttons.back, "evs");
};

const findEvent = async (ctx: BotContext, eventId: string) => {
  await ctx.account();
  const [event] = await visibleEvents(ctx.from?.id ?? 0, { eventId, max: 1 });
  return event;
};

/** Sends (or, from a button, edits into) an event's card. */
export const showEvent = async (ctx: BotContext, eventId: string) => {
  const event = await findEvent(ctx, eventId);
  if (!event) {
    await ctx.reply(ctx.t.eventMissing);
    return;
  }
  const text = eventText(ctx.lang, event);
  const reply_markup = cardKeyboard(ctx, event);
  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { reply_markup });
  } else {
    await ctx.reply(text, { reply_markup });
  }
};

events.command("events", async (ctx) => {
  const view = await listView(ctx);
  await ctx.reply(view.text, { reply_markup: view.keyboard });
  if ("empty" in view) {
    await followWithSticker(ctx, "asleep");
  }
});

const dm = events.chatType("private");

dm.callbackQuery("evs", async (ctx) => {
  const view = await listView(ctx);
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(view.text, { reply_markup: view.keyboard });
  if ("empty" in view) {
    await followWithSticker(ctx, "asleep");
  }
});

dm.callbackQuery(new RegExp(`^ev:(${UUID})$`), async (ctx) => {
  await ctx.answerCallbackQuery();
  await showEvent(ctx, ctx.match[1] ?? "");
});

/** Error codes from events.rsvp(), as the member sees them. */
const rsvpError = (
  ctx: BotContext,
  error: { code?: string; message?: string }
) => {
  if (error.code === "42501") {
    return ctx.t.rsvpNotMember;
  }
  if (error.code === "P0002") {
    return ctx.t.eventMissing;
  }
  if (error.code === "22023") {
    return error.message?.includes("ended")
      ? ctx.t.rsvpEnded
      : ctx.t.rsvpClosed;
  }
  return ctx.t.generic;
};

dm.callbackQuery(new RegExp(`^(rsvp|unrsvp):(${UUID})$`), async (ctx) => {
  const me = await ctx.account();
  if (!me) {
    await ctx.answerCallbackQuery();
    await ctx.reply(ctx.t.needLink, { reply_markup: linkKeyboard(ctx) });
    return;
  }
  const eventId = ctx.match[2] ?? "";
  const params = { event_id: eventId, telegram_id: ctx.from.id };
  let notice: string;
  let booked = false;
  if (ctx.match[1] === "rsvp") {
    const { data, error } = await db()
      .schema("core")
      .rpc("telegram_rsvp", params);
    notice = error
      ? rsvpError(ctx, error)
      : ({
          already: ctx.t.rsvpAlready,
          confirmed: ctx.t.rsvpConfirmed,
          waitlisted: ctx.t.rsvpWaitlisted,
        }[data as string] ?? ctx.t.rsvpConfirmed);
    booked = !error && data === "confirmed";
  } else {
    const { error } = await db()
      .schema("core")
      .rpc("telegram_cancel_rsvp", params);
    notice = error ? rsvpError(ctx, error) : ctx.t.rsvpCancelled;
  }
  await ctx.answerCallbackQuery({
    show_alert: notice.length > 60,
    text: notice,
  });
  await showEvent(ctx, eventId);
  if (booked) {
    await followWithSticker(ctx, "youreIn");
  }
});
