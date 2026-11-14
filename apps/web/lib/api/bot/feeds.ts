import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { type Api, GrammyError, InlineKeyboard } from "grammy";
import { publicEvents } from "@/lib/data/events";
import { gameDay, gameNumber } from "@/lib/data/games";
import { hasDeadline, openCalls } from "@/lib/data/journal";
import { escapeHtml } from "@/lib/telegram";
import { copy, type Lang } from "./copy";
import { anon, db, type Group, groups } from "./db";
import { groupText, postTo } from "./features/group/common";
import { pieceAuthor, publicPieces } from "./features/qirtas";
import { label, pick, when } from "./format";
import { botLink, eventPage, mainApp, piecePage, web } from "./links";
import { staffPosts } from "./staff";

/**
 * What the bot posts to connected groups, every ten minutes (pg_cron calls
 * /cron/telegram): the Sunday note (the week's events and open calls), a
 * reminder for each event two days before, "doors open" an hour before it
 * starts, "voting is open" and "closes tomorrow" for members' elections,
 * and new Qirtas pieces; each post in English
 * with a button to the Arabic page (decisions §6). The daily word goes only
 * to members who asked for it in their chat with Hudhud (/me). Each post is claimed in
 * core.telegram_posts before it is sent, so overlapping runs never post
 * twice; a failed send gives the claim back for the next run.
 */

const HOUR = 60 * 60 * 1000;
// A reminder two days before, never on the day (decisions §6).
const SOON = 48 * HOUR;
const NOT_ON_THE_DAY = 24 * HOUR;
const NEW_PIECE_WINDOW = 72 * HOUR;
// The Sunday note: from 10:00 a.m. Baghdad time, the coming seven days.
const SUNDAY_HOUR = 10;
const WEEK = 7 * 24 * HOUR;
const MAX_PER_RUN = 3;
const WORD_HOUR = 9;
const DIRECT_WORDS_PER_RUN = 25;

export type Kind =
  | "event"
  | "event_soon"
  | "piece"
  | "word"
  | "brief"
  | "event_summary"
  | "announcement"
  | "sunday_note"
  | "paper"
  | "description"
  | "stream"
  | "doors"
  | "vote_open"
  | "vote_closing";

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
export const once = async (
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

export const copyFor = (group: Group, build: (lang: Lang) => string) =>
  groupText(group, (_t, lang) => build(lang));

/** Links in a group post: Arabic pages for Arabic groups, else English. */
export const linkLang = (group: Group): Lang =>
  group.lang === "ar" ? "ar" : "en";

type PublicEvent = NonNullable<
  Awaited<ReturnType<typeof publicEvents>>
>[number];

export interface FeedResult {
  groups: number;
  posted: number;
}

export interface Run {
  api: Api;
  group: Group;
  now: Date;
  username: string;
}

const startsIn = (event: PublicEvent, now: Date) =>
  Date.parse(event.starts_at) - now.getTime();

/** Claims and sends posts one after another (Telegram limits each chat). */
export const sequence = async (
  jobs: (() => Promise<boolean>)[],
  max: number
) => {
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

/** Two days before an event: a reminder in the members' group. */
const soonEvents = (run: Run, events: PublicEvent[]) =>
  sequence(
    events
      .filter((event) => {
        const lead = startsIn(event, run.now);
        return lead > NOT_ON_THE_DAY && lead <= SOON;
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
                copy[lang].postEventSoon(when(lang, event.starts_at)),
                `<b>${escapeHtml(pick(lang, event.title_en, event.title_ar))}</b>`,
                venue ? escapeHtml(venue) : null,
              ]
                .filter(Boolean)
                .join("\n");
            }),
            {
              reply_markup: new InlineKeyboard()
                .url(
                  label(run.group.lang, (t) => t.buttons.rsvp),
                  botLink(run.username, `ev_${event.id}`)
                )
                .url(copy.ar.buttons.arabic, eventPage("ar", event.slug)),
              reply_parameters: original
                ? { allow_sending_without_reply: true, message_id: original }
                : undefined,
            }
          )
        );
      }),
    MAX_PER_RUN
  );

/** Doors open within the hour: the one post on the day. */
const DOORS_LEAD = HOUR;

/**
 * On the day, an hour before it starts: "doors open" in the members'
 * group, answering the event's own post, with the ticket's place.
 */
const doorsOpen = (run: Run, events: PublicEvent[]) =>
  sequence(
    events
      .filter((event) => {
        const lead = startsIn(event, run.now);
        return lead > 0 && lead <= DOORS_LEAD;
      })
      .map((event) => async () => {
        const original =
          (await posted(run.group.chat_id, "event_soon", event.id)) ??
          (await posted(run.group.chat_id, "event", event.id));
        return once(run.group, "doors", event.id, () =>
          postTo(
            run.api,
            run.group,
            ["events", "announcements"],
            copyFor(run.group, (lang) =>
              [
                `<b>${escapeHtml(pick(lang, event.title_en, event.title_ar))}</b>`,
                copy[lang].postDoors(formatClock(event.starts_at, lang)),
              ].join("\n")
            ),
            {
              reply_markup: new InlineKeyboard()
                .url(
                  label(run.group.lang, (t) => t.buttons.ticket),
                  web(linkLang(run.group), "/account")
                )
                .url(copy.ar.buttons.arabic, eventPage("ar", event.slug)),
              reply_parameters: original
                ? { allow_sending_without_reply: true, message_id: original }
                : undefined,
            }
          )
        );
      }),
    MAX_PER_RUN
  );

interface Election {
  id: string;
  title_ar: string;
  title_en: string;
  voting_closes_at: string;
}

/** Members' elections in their voting days (Hudhud reads them with the key). */
const votingElections = async (now: Date) => {
  const { data, error } = await db()
    .schema("governance")
    .from("elections")
    .select("id, title_en, title_ar, voting_closes_at")
    .eq("status", "voting")
    .eq("electorate", "members")
    .lte("voting_opens_at", now.toISOString())
    .gt("voting_closes_at", now.toISOString());
  if (error) {
    throw error;
  }
  return (data ?? []) as Election[];
};

/**
 * Elections in the members' group: "voting is open" once it opens and
 * "closes tomorrow" in its last day, each with Vote.
 */
const electionPosts = (run: Run, elections: Election[]) =>
  sequence(
    elections.flatMap((election) => {
      const left = Date.parse(election.voting_closes_at) - run.now.getTime();
      const kind: Kind = left <= NOT_ON_THE_DAY ? "vote_closing" : "vote_open";
      return [
        () =>
          once(run.group, kind, election.id, () =>
            postTo(
              run.api,
              run.group,
              ["announcements"],
              copyFor(run.group, (lang) => {
                const title = escapeHtml(
                  pick(lang, election.title_en, election.title_ar)
                );
                const at = when(lang, election.voting_closes_at);
                return kind === "vote_open"
                  ? copy[lang].voteOpen(title, at)
                  : copy[lang].voteClosing(title, at);
              }),
              {
                reply_markup: new InlineKeyboard()
                  .url(
                    label(run.group.lang, (t) => t.buttons.vote),
                    web(linkLang(run.group), "/account")
                  )
                  .url(copy.ar.buttons.arabic, web("ar", "/account")),
              }
            )
          ),
      ];
    }),
    MAX_PER_RUN
  );

type OpenCall = NonNullable<Awaited<ReturnType<typeof openCalls>>>[number];

export const sundayText = (
  lang: Lang,
  week: PublicEvent[],
  calls: OpenCall[]
) => {
  const t = copy[lang];
  const lines = [t.postWeek];
  if (week.length > 0) {
    lines.push("", `<b>${t.postWeekEvents}</b>`);
    for (const event of week) {
      lines.push(
        `• ${escapeHtml(pick(lang, event.title_en, event.title_ar))}, ${when(lang, event.starts_at)}`
      );
    }
  }
  if (calls.length > 0) {
    lines.push("", `<b>${t.postWeekCalls}</b>`);
    for (const call of calls) {
      lines.push(
        `• ${escapeHtml(pick(lang, call.title_en, call.title_ar))}, ${t.postWeekCloses(formatLongDate(call.closes_at, lang))}`
      );
    }
  }
  return lines.join("\n");
};

/**
 * Hudhud's Sunday note (decisions.md, Hudhud): each Sunday, one post
 * listing the week's events and open calls, in place of a post for each
 * new event. A week with nothing (outside the semester) has no note.
 */
const sundayNote = (run: Run, events: PublicEvent[], calls: OpenCall[]) => {
  if (
    run.now.toLocaleDateString("en-US", {
      timeZone: "Asia/Baghdad",
      weekday: "long",
    }) !== "Sunday" ||
    baghdadHour(run.now) < SUNDAY_HOUR
  ) {
    return Promise.resolve(0);
  }
  const week = events.filter((event) => {
    const lead = startsIn(event, run.now);
    return lead > 0 && lead <= WEEK;
  });
  const open = calls.filter((call) => hasDeadline(call));
  if (week.length === 0 && open.length === 0) {
    return Promise.resolve(0);
  }
  return sequence(
    [
      () =>
        once(run.group, "sunday_note", baghdadDate(run.now), () =>
          postTo(
            run.api,
            run.group,
            ["events", "announcements"],
            copyFor(run.group, (lang) => sundayText(lang, week, open)),
            {
              reply_markup: new InlineKeyboard()
                .url(
                  label(run.group.lang, (t) => t.buttons.details),
                  web(linkLang(run.group), "/events")
                )
                .url(copy.ar.buttons.arabic, web("ar", "/events")),
            }
          )
        ),
    ],
    1
  );
};

type PublicPiece = Awaited<ReturnType<typeof publicPieces>>[number];

/** Qirtas pieces published in the last three days. */
const newPieces = (run: Run, pieces: PublicPiece[]) =>
  sequence(
    pieces
      .filter(
        (piece) =>
          run.now.getTime() - Date.parse(piece.published_at ?? "") <=
          NEW_PIECE_WINDOW
      )
      .map((piece) => () => {
        const url = piecePage(linkLang(run.group), piece);
        return once(run.group, "piece", piece.id, () =>
          postTo(
            run.api,
            run.group,
            ["qirtas", "announcements"],
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
              reply_markup: new InlineKeyboard()
                .url(
                  label(run.group.lang, (t) => t.buttons.read),
                  url
                )
                .url(copy.ar.buttons.arabic, piecePage("ar", piece)),
            }
          )
        );
      }),
    MAX_PER_RUN
  );

/**
 * The daily word in a member's own chat, for those who turned it on and
 * keep notices here on. Each chat is claimed for the day
 * (`telegram_accounts.word_sent_on`) before sending, so overlapping runs
 * never send it twice; a member who blocked the bot has their notices
 * turned off.
 */
const dailyWordDirect = async (api: Api, username: string, now: Date) => {
  if (baghdadHour(now) < WORD_HOUR) {
    return 0;
  }
  const day = gameDay(now);
  const today = baghdadDate(now);
  const accounts = () => db().schema("core").from("telegram_accounts");
  const { data: due } = await accounts()
    .select("telegram_id, user_id, word_sent_on")
    .eq("daily_word", true)
    .eq("notify", true)
    .or(`word_sent_on.is.null,word_sent_on.lt.${today}`);
  if (!due?.length) {
    return 0;
  }
  const { data: profiles } = await db()
    .schema("core")
    .from("profiles")
    .select("id, locale")
    .in(
      "id",
      due.map((a) => a.user_id)
    );
  const send = async (account: (typeof due)[number]) => {
    const chat = account.telegram_id;
    const { data: claimed } = await accounts()
      .update({ word_sent_on: today })
      .eq("telegram_id", chat)
      .or(`word_sent_on.is.null,word_sent_on.lt.${today}`)
      .select("telegram_id");
    if (!claimed?.length) {
      return false;
    }
    const lang: Lang =
      profiles?.find((p) => p.id === account.user_id)?.locale === "ar"
        ? "ar"
        : "en";
    try {
      await api.sendMessage(
        chat,
        copy[lang].postWord(String(gameNumber(day))),
        {
          parse_mode: "HTML",
          reply_markup: new InlineKeyboard().url(
            copy[lang].buttons.play,
            mainApp(username)
          ),
        }
      );
      return true;
    } catch (error) {
      const blocked = error instanceof GrammyError && error.error_code === 403;
      await accounts()
        .update(
          blocked ? { notify: false } : { word_sent_on: account.word_sent_on }
        )
        .eq("telegram_id", chat);
      if (!(error instanceof GrammyError)) {
        throw error;
      }
      return false;
    }
  };
  // A few dozen a run, well within Telegram's limits; the rest next run.
  return sequence(
    due.map((account) => () => send(account)),
    DIRECT_WORDS_PER_RUN
  );
};

// ── Announcements ─────────────────────────────────────────────────────────

/** How long after the President's go a notice still goes out. */
const ANNOUNCEMENT_WINDOW = 72 * HOUR;
/** A group post carries both languages: each body stays well inside 4,096. */
const GROUP_BODY_MAX = 1500;
const DIRECT_NOTICES_PER_RUN = 25;

interface Notice {
  body_ar: string;
  body_en: string;
  id: string;
  link_path: string | null;
  title_ar: string;
  title_en: string;
}

/** Notices sent in the last three days, oldest first. */
const sentNotices = async (now: Date) => {
  const { data } = await db()
    .schema("core")
    .from("announcements")
    .select("id, title_en, title_ar, body_en, body_ar, link_path")
    .not("sent_at", "is", null)
    .gte("sent_at", new Date(now.getTime() - ANNOUNCEMENT_WINDOW).toISOString())
    .order("sent_at");
  return (data ?? []) as Notice[];
};

const clip = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

/**
 * The President's words as written (decisions.md, Channels and email): the title and body, in
 * the reader's language, with the site's own button. Nothing of Hudhud's
 * Iraqi copy is added, so a message never mixes the two registers.
 */
const noticeText = (notice: Notice, lang: Lang, max = 3500) =>
  [
    `<b>${escapeHtml(pick(lang, notice.title_en, notice.title_ar))}</b>`,
    escapeHtml(clip(pick(lang, notice.body_en, notice.body_ar), max)),
  ].join("\n\n");

const noticeButton = (notice: Notice, lang: Lang) =>
  new InlineKeyboard().url(
    copy[lang].buttons.site,
    web(lang, notice.link_path ?? "/")
  );

/** The members' group: the Announcements topic, once per notice. */
/**
 * Pins an announcement in its topic (decisions.md: Pin Messages, the pinned
 * notices), quietly, and unpins the one before it, so the newest is the one
 * pinned; the post stands whether or not the pin takes.
 */
const pinned = async (
  api: Api,
  chatId: number,
  post: Promise<{ message_id: number } | null>
) => {
  const message = await post;
  if (message) {
    const { data: before } = await posts()
      .select("message_id")
      .eq("chat_id", chatId)
      .eq("kind", "announcement")
      .not("message_id", "is", null)
      .neq("message_id", message.message_id)
      .order("posted_at", { ascending: false })
      .limit(1);
    const previous = before?.[0]?.message_id;
    await Promise.all([
      previous
        ? api.unpinChatMessage(chatId, previous).catch(() => undefined)
        : undefined,
      api
        .pinChatMessage(chatId, message.message_id, {
          disable_notification: true,
        })
        .catch(() => undefined),
    ]);
  }
  return message;
};

const groupNotices = (run: Run, notices: Notice[]) =>
  sequence(
    notices.map(
      (notice) => () =>
        once(run.group, "announcement", notice.id, () =>
          pinned(
            run.api,
            run.group.chat_id,
            postTo(
              run.api,
              run.group,
              ["announcements"],
              copyFor(run.group, (lang) =>
                noticeText(notice, lang, GROUP_BODY_MAX)
              ),
              {
                reply_markup: noticeButton(notice, linkLang(run.group)).url(
                  copy.ar.buttons.arabic,
                  web("ar", notice.link_path ?? "/")
                ),
              }
            )
          )
        )
    ),
    MAX_PER_RUN
  );

const deliveries = () => db().schema("core").from("announcement_deliveries");
const telegramAccounts = () => db().schema("core").from("telegram_accounts");

/**
 * One notice to one member's chat: claimed first; a member who blocked the
 * bot has their notices turned off, any other failure gives the claim back.
 */
const sendNotice = async (
  api: Api,
  notice: Notice,
  chat: number,
  lang: Lang
) => {
  const { data: claimed } = await deliveries()
    .upsert(
      { announcement_id: notice.id, telegram_id: chat },
      { ignoreDuplicates: true, onConflict: "announcement_id,telegram_id" }
    )
    .select("telegram_id");
  if (!claimed?.length) {
    return false;
  }
  try {
    await api.sendMessage(chat, noticeText(notice, lang), {
      parse_mode: "HTML",
      reply_markup: noticeButton(notice, lang),
    });
    return true;
  } catch (error) {
    if (error instanceof GrammyError && error.error_code === 403) {
      await telegramAccounts()
        .update({ notify: false })
        .eq("telegram_id", chat);
      return false;
    }
    await deliveries()
      .delete()
      .eq("announcement_id", notice.id)
      .eq("telegram_id", chat);
    if (!(error instanceof GrammyError)) {
      throw error;
    }
    return false;
  }
};

/**
 * Each linked member who keeps Society news and events on (one notices
 * model), in their own language
 * (core.announcement_deliveries keeps who has had which).
 */
const directNotices = async (api: Api, notices: Notice[]) => {
  if (!notices.length) {
    return 0;
  }
  const { data: linked } = await telegramAccounts()
    .select("telegram_id, user_id")
    .eq("news", true);
  if (!linked?.length) {
    return 0;
  }
  const { data: profiles } = await db()
    .schema("core")
    .from("profiles")
    .select("id, locale")
    .in(
      "id",
      linked.map((a) => a.user_id)
    );
  const langOf = (userId: string): Lang =>
    profiles?.find((p) => p.id === userId)?.locale === "ar" ? "ar" : "en";
  const jobs = notices.flatMap((notice) =>
    linked.map(
      (account) => () =>
        sendNotice(api, notice, account.telegram_id, langOf(account.user_id))
    )
  );
  // A few dozen a run, well within Telegram's limits; the rest next run.
  return sequence(jobs, DIRECT_NOTICES_PER_RUN);
};

/**
 * Posts for events that are no longer on the site (canceled, unpublished
 * or deleted) are deleted from the group (decisions §6: posts are edited or
 * deleted when an event changes, is canceled or comes off the site).
 */
export const withdrawGone = async (api: Api) => {
  const { data: rows } = await posts()
    .select("chat_id, kind, ref, message_id")
    .in("kind", ["event", "event_soon"]);
  if (!rows?.length) {
    return 0;
  }
  const ids = [...new Set(rows.map((r) => r.ref))];
  const { data: live } = await db()
    .schema("events")
    .from("events")
    .select("id")
    .in("id", ids)
    .eq("status", "published");
  const still = new Set((live ?? []).map((e) => e.id));
  let withdrawn = 0;
  for (const row of rows) {
    if (still.has(row.ref)) {
      continue;
    }
    if (row.message_id) {
      // biome-ignore lint/performance/noAwaitInLoops: Telegram's rate limit
      await api
        .deleteMessage(row.chat_id, row.message_id)
        .catch(() => undefined);
    }
    await release(row.chat_id, row.kind as Kind, row.ref);
    withdrawn += 1;
  }
  return withdrawn;
};

export const runFeeds = async (
  api: Api,
  username: string,
  now = new Date()
): Promise<FeedResult> => {
  const withdrawn = await withdrawGone(api);
  const notices = await sentNotices(now);
  const direct =
    (await dailyWordDirect(api, username, now)) +
    (await directNotices(api, notices)) +
    withdrawn;
  const connected = await groups();
  if (!connected.length) {
    return { groups: 0, posted: direct };
  }
  const [upcoming, pieces, calls, elections] = await Promise.all([
    publicEvents(anon(), { from: now, limit: 20 }),
    publicPieces(10),
    openCalls(anon(), now),
    votingElections(now),
  ]);
  const events = upcoming ?? [];
  // Groups in parallel; each group's posts in order.
  const counts = await Promise.all(
    connected.map(async (group) => {
      // The members' group reads one post in English, with a button to the
      // Arabic page (decisions §6); the Diwan group keeps its own setting.
      const run = {
        api,
        group:
          group.audience === "staff"
            ? group
            : { ...group, lang: "en" as const },
        now,
        username,
      };
      // The Diwan group gets the morning brief and event summaries.
      if (group.audience === "staff") {
        return staffPosts(run);
      }
      const announced = await groupNotices(run, notices);
      const voting = await electionPosts(run, elections);
      const doors = await doorsOpen(run, events);
      const soon = await soonEvents(run, events);
      const week = await sundayNote(run, events, calls ?? []);
      const written = await newPieces(run, pieces);
      return announced + voting + doors + soon + week + written;
    })
  );
  return {
    groups: connected.length,
    posted: counts.reduce((sum, n) => sum + n, direct),
  };
};

const hourFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  hourCycle: "h23",
  timeZone: "Asia/Baghdad",
});

export const baghdadHour = (date: Date) => Number(hourFormat.format(date));

const dateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Baghdad",
});

/** The day in Baghdad, as yyyy-mm-dd. */
export const baghdadDate = (date: Date) => dateFormat.format(date);
