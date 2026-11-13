import "server-only";

import { siteUrl } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import type { Api } from "grammy";
import { GrammyError, InlineKeyboard, InputFile } from "grammy";
import { publicEvents } from "@/lib/data/events";
import { escapeHtml } from "@/lib/telegram";
import { copy, type Lang } from "./copy";
import { anon, db, type Group, groups } from "./db";
import { postTo, topicOf } from "./features/group/common";
import { baghdadDate, baghdadHour, copyFor, once } from "./feeds";
import { pick, when } from "./format";
import { eventPage, web } from "./links";
import { qrPng } from "./qr";

/** How long after an issue goes out Hudhud keeps bringing it to chats. */
const PAPER_DAYS = 3;
/** Members' chats a run, well within Telegram's limits. */
const PAPER_PER_RUN = 25;

/** Telegram's limit on a group's description. */
const DESCRIPTION_MAX = 255;

const SCHEME = /^https?:\/\//u;
const bare = (url: string) => url.replace(SCHEME, "");

/**
 * The members' group's description (decisions.md, Channels and email:
 * "Change Group Info keeps the description in sync"): the line decisions.md
 * gives, with the next public event in place of the events link while
 * there is one.
 */
export const membersDescription = (
  next: { slug: string; starts_at: string; title_en: string } | null
) => {
  const head = "The paper and the pen at @AUIB_BAG.";
  const join = `Join: ${bare(siteUrl("en", "/join"))}`;
  if (!next) {
    return `${head} Events: ${bare(siteUrl("en", "/events"))} · ${join}`;
  }
  const at = `${formatLongDate(next.starts_at, "en")}, ${formatClock(next.starts_at, "en")}`;
  const link = bare(siteUrl("en", `/events/${next.slug}`));
  const rest = `, ${at} · ${link} · ${join}`;
  const room = DESCRIPTION_MAX - head.length - " Next: ".length - rest.length;
  const title =
    next.title_en.length > room
      ? `${next.title_en.slice(0, Math.max(room - 1, 0)).trimEnd()}…`
      : next.title_en;
  return `${head} Next: ${title}${rest}`;
};

const quietly = async (call: Promise<unknown>) => {
  try {
    await call;
    return true;
  } catch (error) {
    if (error instanceof GrammyError) {
      return false;
    }
    throw error;
  }
};

const paperPage = (lang: Lang, month: string) =>
  web(lang, `/sunday-paper/${month}`);

/** The issues that went out by email in the last few days. */
const recentIssues = async (now: Date) => {
  const since = new Date(now.getTime() - PAPER_DAYS * 864e5).toISOString();
  const { data, error } = await db()
    .schema("content")
    .from("sunday_paper_drafts")
    .select("month")
    .gte("sent_at", since);
  if (error) {
    throw error;
  }
  return (data ?? []).map((d) => d.month);
};

/** One issue to one member's chat, claimed first so it goes once. */
const bringPaper = async (
  api: Api,
  month: string,
  chat: number,
  lang: Lang
) => {
  const { data: claimed } = await db()
    .schema("core")
    .from("paper_deliveries")
    .upsert(
      { month, telegram_id: chat },
      { ignoreDuplicates: true, onConflict: "month,telegram_id" }
    )
    .select("telegram_id");
  if (!claimed?.length) {
    return false;
  }
  try {
    await api.sendMessage(chat, copy[lang].paperOut, {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().url(
        copy[lang].buttons.readPaper,
        paperPage(lang, month)
      ),
    });
    return true;
  } catch (error) {
    if (error instanceof GrammyError && error.error_code === 403) {
      await db()
        .schema("core")
        .from("telegram_accounts")
        .update({ notify: false, paper: false })
        .eq("telegram_id", chat);
      return false;
    }
    await db()
      .schema("core")
      .from("paper_deliveries")
      .delete()
      .eq("month", month)
      .eq("telegram_id", chat);
    return false;
  }
};

/**
 * The Sunday Paper by Hudhud (one notices model): once an issue has gone
 * out by email, each linked member who keeps "The Sunday Paper" on in
 * Hudhud gets it in their chat, in their language, for three days; and the
 * members' group gets one post in Qirtas's topic.
 */
export const runPaper = async (api: Api, now = new Date()) => {
  const issues = await recentIssues(now);
  if (!issues.length) {
    return 0;
  }
  const { data: linked } = await db()
    .schema("core")
    .from("telegram_accounts")
    .select("telegram_id, user_id")
    .eq("paper", true);
  const { data: profiles } = await db()
    .schema("core")
    .from("profiles")
    .select("id, locale")
    .in(
      "id",
      (linked ?? []).map((a) => a.user_id)
    );
  const langOf = (userId: string): Lang =>
    profiles?.find((p) => p.id === userId)?.locale === "ar" ? "ar" : "en";
  const jobs = issues.flatMap((month) =>
    (linked ?? []).map((a) => ({ a, month }))
  );
  const sent = await Promise.all(
    jobs
      .slice(0, PAPER_PER_RUN)
      .map(({ a, month }) =>
        bringPaper(api, month, Number(a.telegram_id), langOf(a.user_id))
      )
  );
  const members = (await groups()).filter((g) => g.audience === "members");
  const posted = await Promise.all(
    members.flatMap((group) =>
      issues.map((month) =>
        once(group, "paper", month, () =>
          postTo(
            api,
            group,
            ["qirtas", "announcements"],
            copyFor(group, (lang) => copy[lang].paperOut),
            {
              parse_mode: "HTML",
              reply_markup: new InlineKeyboard()
                .url(copy.en.buttons.readPaper, paperPage("en", month))
                .url(copy.ar.buttons.arabic, paperPage("ar", month)),
            }
          )
        )
      )
    )
  );
  return sent.filter(Boolean).length + posted.filter(Boolean).length;
};

/**
 * Keeps the members' group's description as membersDescription has it,
 * checked every run so the next event shows as soon as it changes; the
 * photo stays Telegram's own setting.
 */
export const syncDescriptions = async (api: Api, now = new Date()) => {
  const members = (await groups()).filter((g) => g.audience === "members");
  if (!members.length) {
    return 0;
  }
  const [next] = (await publicEvents(anon(), { from: now, limit: 1 })) ?? [];
  const wanted = membersDescription(next ?? null);
  const done = await Promise.all(
    members.map(async (group) => {
      const chat = await api.getChat(group.chat_id).catch(() => null);
      if (!chat || ("description" in chat && chat.description === wanted)) {
        return false;
      }
      return quietly(api.setChatDescription(group.chat_id, wanted));
    })
  );
  return done.filter(Boolean).length;
};

/** Private reminders a run, well within Telegram's limits. */
const NUDGES_PER_RUN = 25;

/** Claims a private reminder so it goes once; false when already sent. */
const claimNudge = async (telegramId: number, kind: string, ref: string) => {
  const { data } = await db()
    .schema("core")
    .from("telegram_nudges")
    .upsert(
      { kind, ref, telegram_id: telegramId },
      { ignoreDuplicates: true, onConflict: "telegram_id,kind,ref" }
    )
    .select("telegram_id");
  return Boolean(data?.length);
};

const releaseNudge = (telegramId: number, kind: string, ref: string) =>
  db()
    .schema("core")
    .from("telegram_nudges")
    .delete()
    .eq("telegram_id", telegramId)
    .eq("kind", kind)
    .eq("ref", ref);

/** A reminder that reached a blocked chat: its reminders go off. */
const sendNudge = async (
  telegramId: number,
  kind: string,
  ref: string,
  send: () => Promise<unknown>
) => {
  if (!(await claimNudge(telegramId, kind, ref))) {
    return false;
  }
  try {
    await send();
    return true;
  } catch (error) {
    if (error instanceof GrammyError && error.error_code === 403) {
      await db()
        .schema("core")
        .from("telegram_accounts")
        .update({ reminders: false })
        .eq("telegram_id", telegramId);
      return false;
    }
    await releaseNudge(telegramId, kind, ref);
    return false;
  }
};

interface TicketRow {
  event_id: string;
  locale: string | null;
  slug: string;
  starts_at: string;
  telegram_id: number;
  ticket_code: string;
  title_ar: string;
  title_en: string;
  venue_ar: string | null;
  venue_en: string | null;
}

/**
 * On an event's day, within three hours of the start: each linked member
 * who booked gets their ticket in their chat, the same QR code as on Today,
 * when they keep Hudhud's reminders on.
 */
export const runTickets = async (api: Api) => {
  const { data, error } = await db()
    .schema("core")
    .rpc("telegram_tickets_soon");
  if (error) {
    throw error;
  }
  const rows = ((data ?? []) as TicketRow[]).slice(0, NUDGES_PER_RUN);
  const sent = await Promise.all(
    rows.map((row) => {
      const lang: Lang = row.locale === "ar" ? "ar" : "en";
      const t = copy[lang];
      const venue = pick(lang, row.venue_en, row.venue_ar);
      const caption = [
        t.ticket(
          escapeHtml(pick(lang, row.title_en, row.title_ar)),
          when(lang, row.starts_at)
        ),
        venue ? escapeHtml(venue) : null,
      ]
        .filter(Boolean)
        .join("\n");
      return sendNudge(Number(row.telegram_id), "ticket", row.event_id, () =>
        api.sendPhoto(
          Number(row.telegram_id),
          new InputFile(qrPng(`sal:ticket:${row.ticket_code}`), "ticket.png"),
          {
            caption,
            parse_mode: "HTML",
            protect_content: true,
            reply_markup: new InlineKeyboard()
              .url(t.buttons.ticket, web(lang, "/account"))
              .url(t.buttons.details, eventPage(lang, row.slug)),
          }
        )
      );
    })
  );
  return sent.filter(Boolean).length;
};

/** The weekly reminders go on Mondays at 10:00 a.m. Baghdad time. */
const TODO_HOUR = 10;
const weekday = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Baghdad",
  weekday: "short",
});

interface TodoRow {
  assignment_id: string;
  kind: "handover" | "role_agreement";
  locale: string | null;
  role_ar: string;
  role_en: string;
  telegram_id: number;
}

/**
 * Once a week, a role holder's own to-dos in their chat: a handover to sign
 * and a role agreement not yet signed (Today in Your account keeps them too),
 * for those who keep Hudhud's reminders on.
 */
export const runRoleTodos = async (api: Api, now = new Date()) => {
  if (weekday.format(now) !== "Mon" || baghdadHour(now) < TODO_HOUR) {
    return 0;
  }
  const { data, error } = await db().schema("core").rpc("telegram_role_todos");
  if (error) {
    throw error;
  }
  const week = baghdadDate(now);
  const rows = ((data ?? []) as TodoRow[]).slice(0, NUDGES_PER_RUN);
  const sent = await Promise.all(
    rows.map((row) => {
      const lang: Lang = row.locale === "ar" ? "ar" : "en";
      const t = copy[lang];
      const role = escapeHtml(pick(lang, row.role_en, row.role_ar));
      const handover = row.kind === "handover";
      return sendNudge(
        Number(row.telegram_id),
        row.kind,
        `${row.assignment_id}:${week}`,
        () =>
          api.sendMessage(
            Number(row.telegram_id),
            handover ? t.todoHandover(role) : t.todoAgreement(role),
            {
              parse_mode: "HTML",
              reply_markup: new InlineKeyboard().url(
                handover ? t.buttons.handover : t.buttons.agreement,
                web(lang, handover ? "/account/roles/handover" : "/account")
              ),
            }
          )
      );
    })
  );
  return sent.filter(Boolean).length;
};

type Team =
  | "council"
  | "events"
  | "media"
  | "membership"
  | "partnerships"
  | "qirtas";

interface Alert {
  id: string;
  link: string | null;
  team: Team;
  text_ar: string;
  text_en: string;
  urgent: boolean;
}

/**
 * Writes a staff alert for the Diwan group's team topic and the Desk
 * (decisions.md: urgent at once, the rest in the daily digest). The same
 * key is written once. No names: what happened and where to look.
 */
export const staffAlert = async (alert: {
  key?: string;
  link?: string;
  team: Team;
  text_ar: string;
  text_en: string;
  urgent?: boolean;
}) => {
  await db()
    .schema("core")
    .from("staff_alerts")
    .upsert(
      {
        dedupe_key: alert.key ?? null,
        link: alert.link ?? null,
        team: alert.team,
        text_ar: alert.text_ar,
        text_en: alert.text_en,
        urgent: alert.urgent ?? false,
      },
      { ignoreDuplicates: true, onConflict: "dedupe_key" }
    );
};

const alertLine = (alert: Alert, lang: Lang) => {
  const text = escapeHtml(lang === "ar" ? alert.text_ar : alert.text_en);
  return alert.link ? `${text}\n${alert.link}` : text;
};

/** Posts to the team's topic in the Diwan group, else the brief's, else
 * Announcements, else General. */
const teamPost = (api: Api, group: Group, team: Team, text: string) => {
  const thread = topicOf(group, team, "brief", "announcements");
  return api.sendMessage(group.chat_id, text, {
    link_preview_options: { is_disabled: true },
    message_thread_id: thread || undefined,
    parse_mode: "HTML",
  });
};

/**
 * Every run: urgent alerts go to their team's topic at once; at 8:00 a.m.
 * Baghdad time the rest go as one digest per team.
 */
export const runAlerts = async (api: Api, now = new Date()) => {
  const staffGroups = (await groups()).filter((g) => g.audience === "staff");
  const { data, error } = await db()
    .schema("core")
    .from("staff_alerts")
    .select("id, team, urgent, text_en, text_ar, link")
    .is("posted_at", null)
    .order("created_at")
    .limit(100);
  if (error) {
    throw error;
  }
  const waiting = (data ?? []) as Alert[];
  const due = waiting.filter((a) => a.urgent || baghdadHour(now) === 8);
  if (!(due.length && staffGroups.length)) {
    return 0;
  }
  const byTeam = new Map<Team, Alert[]>();
  for (const alert of due) {
    byTeam.set(alert.team, [...(byTeam.get(alert.team) ?? []), alert]);
  }
  const sent = await Promise.all(
    staffGroups.flatMap((group) =>
      [...byTeam].map(([team, alerts]) => {
        const lang: Lang = group.lang === "ar" ? "ar" : "en";
        const text = alerts.map((a) => alertLine(a, lang)).join("\n\n");
        return quietly(teamPost(api, group, team, text));
      })
    )
  );
  await db()
    .schema("core")
    .from("staff_alerts")
    .update({ posted_at: now.toISOString() })
    .in(
      "id",
      due.map((a) => a.id)
    );
  return sent.filter(Boolean).length;
};
