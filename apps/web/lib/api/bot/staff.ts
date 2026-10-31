import { nexusUrl } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { escapeHtml } from "@repo/telegram";
import { InlineKeyboard } from "grammy";
import { type Copy, copy, type Lang } from "./copy";
import { db, type Group } from "./db";
import { topicOf } from "./features/group/common";
import { baghdadHour, copyFor, linkLang, once, type Run } from "./feeds";
import { label, pick } from "./format";

/**
 * Hudhud in the Diwan group (/audience staff; owner, Oct 31, 2026): a
 * morning brief from 8:00 AM Baghdad time (today's events with their
 * bookings, and what waits in the Diwan, as counts) and a short summary
 * half an hour after each event ends (booked, came, walk-ins, no-shows,
 * waitlist). Officers only see these: the group lets in no one else. They
 * go to the topic set with /topic brief, else announcements, else General.
 */

const BRIEF_HOUR = 8;
const HOUR = 60 * 60 * 1000;
// The door closes; then the summary.
const AFTER_END = HOUR / 2;
// How far back a summary may still go out (a missed run catches up).
const SUMMARY_WINDOW = 12 * HOUR;

interface BriefEvent {
  booked: number;
  capacity: number | null;
  entry: string;
  slug: string;
  starts_at: string;
  title_ar: string;
  title_en: string;
  venue_ar: string | null;
  venue_en: string | null;
  waitlisted: number;
}

type WaitingKey = keyof Copy["briefCounts"];

interface Brief {
  events: BriefEvent[];
  waiting: Record<
    | "grants_asked"
    | "hiring_new"
    | "partner_applications"
    | "perks_waiting"
    | "requests_open"
    | "submissions_new",
    number
  >;
}

interface Summary {
  booked: number;
  booked_and_came: number;
  checked_in: number;
  id: string;
  slug: string;
  title_ar: string;
  title_en: string;
  waitlisted: number;
}

const WAITING: [keyof Brief["waiting"], WaitingKey][] = [
  ["partner_applications", "partnerApplications"],
  ["grants_asked", "grantsAsked"],
  ["perks_waiting", "perksWaiting"],
  ["submissions_new", "submissionsNew"],
  ["hiring_new", "hiringNew"],
  ["requests_open", "requestsOpen"],
];

/** The day in Baghdad as YYYY-MM-DD, one brief per day. */
const dayKey = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Baghdad",
    year: "numeric",
  }).format(date);

/** The brief's topic, else announcements, else General. */
const send = (run: Run, text: string, button: { text: string; url: string }) =>
  run.api.sendMessage(run.group.chat_id, text, {
    message_thread_id:
      topicOf(run.group, "brief", "announcements") || undefined,
    reply_markup: new InlineKeyboard().url(button.text, button.url),
  });

const eventLine = (lang: Lang, event: BriefEvent) => {
  const t = copy[lang];
  const title = `<b>${escapeHtml(pick(lang, event.title_en, event.title_ar))}</b>`;
  const venue = pick(lang, event.venue_en, event.venue_ar);
  let bookings: string | null = null;
  if (event.entry !== "open") {
    bookings =
      event.capacity === null
        ? t.briefBookedOpen(String(event.booked))
        : t.briefBooked(String(event.booked), String(event.capacity));
  }
  return [
    t.briefEvent(title, formatClock(event.starts_at, lang)),
    venue ? escapeHtml(venue) : null,
    bookings,
    event.waitlisted > 0 ? t.briefWaitlist(String(event.waitlisted)) : null,
  ]
    .filter(Boolean)
    .join(" · ");
};

export const briefText = (
  group: Pick<Group, "lang">,
  brief: Brief,
  now: Date
) =>
  copyFor(group as Group, (lang) => {
    const t = copy[lang];
    const waiting = WAITING.filter(([key]) => brief.waiting[key] > 0).map(
      ([key, name]) => `${t.briefCounts[name]}: ${brief.waiting[key]}`
    );
    return [
      t.briefTitle(formatLongDate(now.toISOString(), lang)),
      "",
      ...(brief.events.length
        ? brief.events.map((event) => eventLine(lang, event))
        : [t.briefNoEvents]),
      "",
      t.briefWaiting,
      ...(waiting.length ? waiting : [t.briefNothing]),
    ].join("\n");
  });

export const summaryText = (group: Pick<Group, "lang">, event: Summary) =>
  copyFor(group as Group, (lang) => {
    const t = copy[lang];
    const walkIns = Math.max(event.checked_in - event.booked_and_came, 0);
    const noShows = Math.max(event.booked - event.booked_and_came, 0);
    return [
      t.summaryTitle,
      `<b>${escapeHtml(pick(lang, event.title_en, event.title_ar))}</b>`,
      t.summaryCame(
        String(event.checked_in),
        String(event.booked_and_came),
        String(walkIns)
      ),
      noShows > 0 ? t.summaryNoShows(String(noShows)) : null,
      event.waitlisted > 0 ? t.briefWaitlist(String(event.waitlisted)) : null,
    ]
      .filter(Boolean)
      .join("\n");
  });

const morningBrief = async (run: Run) => {
  if (baghdadHour(run.now) < BRIEF_HOUR) {
    return 0;
  }
  const { data, error } = await db()
    .schema("core")
    .rpc("telegram_staff_brief", { at: run.now.toISOString() });
  if (error) {
    throw error;
  }
  const brief = data as unknown as Brief;
  const lang = linkLang(run.group);
  const sent = await once(run.group, "brief", dayKey(run.now), () =>
    send(run, briefText(run.group, brief, run.now), {
      text: label(run.group.lang, (t) => t.buttons.diwan),
      url: nexusUrl(lang, "/"),
    })
  );
  return sent ? 1 : 0;
};

const eventSummaries = async (run: Run) => {
  const until = new Date(run.now.getTime() - AFTER_END);
  const since = new Date(until.getTime() - SUMMARY_WINDOW);
  const { data, error } = await db()
    .schema("core")
    .rpc("telegram_event_summaries", {
      since: since.toISOString(),
      until: until.toISOString(),
    });
  if (error) {
    throw error;
  }
  const lang = linkLang(run.group);
  let sent = 0;
  for (const event of (data ?? []) as unknown as Summary[]) {
    // biome-ignore lint/performance/noAwaitInLoops: one post at a time, in order
    const posted = await once(run.group, "event_summary", event.id, () =>
      send(run, summaryText(run.group, event), {
        text: label(run.group.lang, (t) => t.buttons.diwan),
        url: nexusUrl(lang, `/events/${event.slug}`),
      })
    );
    sent += posted ? 1 : 0;
  }
  return sent;
};

/** Everything the Diwan group gets on a run. */
export const staffPosts = async (run: Run) =>
  (await eventSummaries(run)) + (await morningBrief(run));
