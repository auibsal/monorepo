import { formatClock } from "@repo/internationalization/format";
import { publicEvents } from "@repo/sal-data/events";
import { escapeHtml } from "@repo/telegram";
import { type Api, GrammyError, InlineKeyboard } from "grammy";
import { copy, type Lang } from "./copy";
import { anon, db, type Group, groups } from "./db";
import { groupText, postTo } from "./features/group/common";
import { pieceAuthor, publicPieces } from "./features/waraq";
import { label, pick, when } from "./format";
import { botLink, eventPage, piecePage } from "./links";
import { today } from "./word";

/**
 * What the bot posts to connected groups, every ten minutes (pg_cron calls
 * /cron/telegram): new public events (to the events topic), a "starting soon"
 * reply to each event's post three hours before, new Waraq pieces, and the
 * daily word at 9:00 AM Baghdad time. Each post is claimed in
 * core.telegram_posts before it is sent, so overlapping runs never post
 * twice; a failed send gives the claim back for the next run.
 */

const HOUR = 60 * 60 * 1000;
const SOON = 3 * HOUR;
const NEW_EVENT_WINDOW = 45 * 24 * HOUR;
const NEW_PIECE_WINDOW = 72 * HOUR;
const MAX_PER_RUN = 3;
const WORD_HOUR = 9;

type Kind = "event" | "event_soon" | "piece" | "word";

const posts = () => db().schema("core").from("telegram_posts");

const claim = async (chatId: number, kind: Kind, ref: string) => {
  const { data } = await posts()
    .upsert(
      { chat_id: chatId, kind, ref },
      { ignoreDuplicates: true, onConflict: "chat_id,kind,ref" }
    )
    .select("ref");
  return Boolean(data?.length);
};

const release = (chatId: number, kind: Kind, ref: string) =>
  posts().delete().eq("chat_id", chatId).eq("kind", kind).eq("ref", ref);

const posted = async (chatId: number, kind: Kind, ref: string) => {
  const { data } = await posts()
    .select("message_id")
    .eq("chat_id", chatId)
    .eq("kind", kind)
    .eq("ref", ref)
    .maybeSingle();
  return data?.message_id ?? undefined;
};

/** Claims, sends and records one post. Returns whether it went out. */
const once = async (
  group: Group,
  kind: Kind,
  ref: string,
  send: () => Promise<{ message_id: number } | null>
) => {
  if (!(await claim(group.chat_id, kind, ref))) {
    return false;
  }
  try {
    const message = await send();
    if (!message) {
      await release(group.chat_id, kind, ref);
      return false;
    }
    await posts()
      .update({ message_id: message.message_id })
      .eq("chat_id", group.chat_id)
      .eq("kind", kind)
      .eq("ref", ref);
    return true;
  } catch (error) {
    await release(group.chat_id, kind, ref);
    if (error instanceof GrammyError) {
      console.warn("Group post failed", group.chat_id, kind, error.description);
      return false;
    }
    throw error;
  }
};

const copyFor = (group: Group, build: (lang: Lang) => string) =>
  groupText(group, (_t, lang) => build(lang));

/** Links in a group post: Arabic pages for Arabic groups, else English. */
const linkLang = (group: Group): Lang => (group.lang === "ar" ? "ar" : "en");

type PublicEvent = NonNullable<
  Awaited<ReturnType<typeof publicEvents>>
>[number];

const eventPost = (
  api: Api,
  group: Group,
  event: PublicEvent,
  username: string
) =>
  postTo(
    api,
    group,
    ["events", "announcements"],
    copyFor(group, (lang) => {
      const t = copy[lang];
      const venue = pick(lang, event.venue_en, event.venue_ar);
      const summary = pick(lang, event.summary_en, event.summary_ar);
      return [
        t.postEventNew,
        `<b>${escapeHtml(pick(lang, event.title_en, event.title_ar))}</b>`,
        when(lang, event.starts_at),
        venue ? escapeHtml(venue) : null,
        summary ? `\n${escapeHtml(summary)}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    }),
    {
      reply_markup: new InlineKeyboard()
        .url(
          label(group.lang, (t) => t.buttons.rsvp),
          botLink(username, `ev_${event.id}`)
        )
        .url(
          label(group.lang, (t) => t.buttons.details),
          eventPage(linkLang(group), event.slug)
        ),
    }
  );

export interface FeedResult {
  groups: number;
  posted: number;
}

interface Run {
  api: Api;
  group: Group;
  now: Date;
  username: string;
}

const startsIn = (event: PublicEvent, now: Date) =>
  Date.parse(event.starts_at) - now.getTime();

/** Claims and sends posts one after another (Telegram limits each chat). */
const sequence = async (jobs: (() => Promise<boolean>)[], max: number) => {
  let sent = 0;
  for (const job of jobs) {
    if (sent >= max) {
      break;
    }
    // biome-ignore lint/performance/noAwaitInLoops: one post at a time, in order
    if (await job()) {
      sent += 1;
    }
  }
  return sent;
};

/** New events, nearest first, a few per run (not those about to start). */
const newEvents = (run: Run, events: PublicEvent[]) =>
  sequence(
    events
      .filter((event) => {
        const lead = startsIn(event, run.now);
        return lead > SOON && lead <= NEW_EVENT_WINDOW;
      })
      .map(
        (event) => () =>
          once(run.group, "event", event.id, () =>
            eventPost(run.api, run.group, event, run.username)
          )
      ),
    MAX_PER_RUN
  );

/** Starting within three hours: a reply to the event's post. */
const soonEvents = (run: Run, events: PublicEvent[]) =>
  sequence(
    events
      .filter((event) => {
        const lead = startsIn(event, run.now);
        return lead > 0 && lead <= SOON;
      })
      .map((event) => async () => {
        const original = await posted(run.group.chat_id, "event", event.id);
        return once(run.group, "event_soon", event.id, () =>
          postTo(
            run.api,
            run.group,
            ["events", "announcements"],
            copyFor(run.group, (lang) => {
              const venue = pick(lang, event.venue_en, event.venue_ar);
              return [
                copy[lang].postEventSoon(formatClock(event.starts_at, lang)),
                `<b>${escapeHtml(pick(lang, event.title_en, event.title_ar))}</b>`,
                venue ? escapeHtml(venue) : null,
              ]
                .filter(Boolean)
                .join("\n");
            }),
            {
              reply_markup: new InlineKeyboard().url(
                label(run.group.lang, (t) => t.buttons.rsvp),
                botLink(run.username, `ev_${event.id}`)
              ),
              reply_parameters: original
                ? { allow_sending_without_reply: true, message_id: original }
                : undefined,
            }
          )
        );
      }),
    MAX_PER_RUN
  );

type PublicPiece = Awaited<ReturnType<typeof publicPieces>>[number];

/** Waraq pieces published in the last three days. */
const newPieces = (run: Run, pieces: PublicPiece[]) =>
  sequence(
    pieces
      .filter(
        (piece) =>
          run.now.getTime() - Date.parse(piece.published_at ?? "") <=
          NEW_PIECE_WINDOW
      )
      .map((piece) => () => {
        const url = piecePage(linkLang(run.group), piece.slug);
        return once(run.group, "piece", piece.id, () =>
          postTo(
            run.api,
            run.group,
            ["waraq", "announcements"],
            copyFor(run.group, (lang) => {
              const author = pieceAuthor(lang, piece);
              return [
                copy[lang].postPiece,
                `<b>${escapeHtml(pick(lang, piece.title_en, piece.title_ar))}</b>`,
                author ? escapeHtml(copy[lang].by(author)) : null,
              ]
                .filter(Boolean)
                .join("\n");
            }),
            {
              link_preview_options: { url },
              reply_markup: new InlineKeyboard().url(
                label(run.group.lang, (t) => t.buttons.read),
                url
              ),
            }
          )
        );
      }),
    MAX_PER_RUN
  );

/** The daily word, from 9:00 AM in Baghdad. */
const dailyWord = (run: Run) => {
  if (baghdadHour(run.now) < WORD_HOUR) {
    return Promise.resolve(0);
  }
  const round = today("en", run.now);
  return sequence(
    [
      () =>
        once(run.group, "word", String(round.day), () =>
          postTo(
            run.api,
            run.group,
            ["word", "waraq"],
            copyFor(run.group, (lang) =>
              copy[lang].postWord(String(round.number))
            ),
            {
              reply_markup: new InlineKeyboard().url(
                label(run.group.lang, (t) => t.buttons.play),
                botLink(run.username, "word")
              ),
            }
          )
        ),
    ],
    1
  );
};

export const runFeeds = async (
  api: Api,
  username: string,
  now = new Date()
): Promise<FeedResult> => {
  const connected = await groups();
  if (!connected.length) {
    return { groups: 0, posted: 0 };
  }
  const [upcoming, pieces] = await Promise.all([
    publicEvents(anon(), { from: now, limit: 20 }),
    publicPieces(10),
  ]);
  const events = upcoming ?? [];
  // Groups in parallel; each group's posts in order.
  const counts = await Promise.all(
    connected.map(async (group) => {
      const run = { api, group, now, username };
      const soon = await soonEvents(run, events);
      const fresh = await newEvents(run, events);
      const written = await newPieces(run, pieces);
      return soon + fresh + written + (await dailyWord(run));
    })
  );
  return {
    groups: connected.length,
    posted: counts.reduce((sum, n) => sum + n, 0),
  };
};

const hourFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  hourCycle: "h23",
  timeZone: "Asia/Baghdad",
});

export const baghdadHour = (date: Date) => Number(hourFormat.format(date));
