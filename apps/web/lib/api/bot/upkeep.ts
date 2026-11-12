import "server-only";

import type { Api } from "grammy";
import { GrammyError, InlineKeyboard } from "grammy";
import { escapeHtml } from "@/lib/telegram";
import { copy, type Lang } from "./copy";
import { db, type Group, groups } from "./db";
import { postTo, topicOf } from "./features/group/common";
import { baghdadDate, baghdadHour, copyFor, once } from "./feeds";
import { web } from "./links";

/** How long after an issue goes out Hudhud keeps bringing it to chats. */
const PAPER_DAYS = 3;
/** Members' chats a run, well within Telegram's limits. */
const PAPER_PER_RUN = 25;

/**
 * The members' group's description (decisions.md, Channels and email:
 * "Change Group Info keeps the description in sync with the Diwan").
 */
const MEMBERS_DESCRIPTION =
  "The paper and the pen at @AUIB_BAG. Events: auibsal.org/events · Join: auibsal.org/join";

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
 * Keeps the members' group's description as decisions.md has it, checked
 * once a day; the photo and welcome message stay Telegram's own settings.
 */
export const syncDescriptions = async (api: Api, now = new Date()) => {
  if (baghdadHour(now) !== 7) {
    return 0;
  }
  const members = (await groups()).filter((g) => g.audience === "members");
  const done = await Promise.all(
    members.map((group) =>
      once(group, "description", baghdadDate(now), async () => {
        const chat = await api.getChat(group.chat_id).catch(() => null);
        if (
          chat &&
          "description" in chat &&
          chat.description !== MEMBERS_DESCRIPTION
        ) {
          await quietly(
            api.setChatDescription(group.chat_id, MEMBERS_DESCRIPTION)
          );
        }
        // Recorded with no message: the day is done.
        return { message_id: 0 };
      })
    )
  );
  return done.filter(Boolean).length;
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
