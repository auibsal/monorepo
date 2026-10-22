import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { escapeHtml } from "@repo/telegram";
import { type Copy, copy, type Lang } from "./copy";
import type { EventRow } from "./db";

/** The value in the language, falling back to the other one. */
export const pick = (
  lang: Lang,
  en: string | null | undefined,
  ar: string | null | undefined
) => (lang === "ar" ? (ar ?? en) : (en ?? ar)) ?? "";

/** A person's name from Telegram, escaped. */
export const displayName = (user: { first_name: string; last_name?: string }) =>
  escapeHtml([user.first_name, user.last_name].filter(Boolean).join(" "));

export const when = (lang: Lang, iso: string) =>
  copy[lang].when(formatLongDate(iso, lang), formatClock(iso, lang));

const placesLine = (t: Copy, event: EventRow) => {
  if (event.capacity === null) {
    return null;
  }
  const left = event.capacity - event.confirmed;
  if (left <= 0) {
    return t.full;
  }
  return left === 1 ? t.onePlaceLeft : t.placesLeft(String(left));
};

/** An event as a message: title, when, where, summary and the person's place. */
export const eventText = (lang: Lang, event: EventRow, withSummary = true) => {
  const t = copy[lang];
  const venue = pick(lang, event.venue_en, event.venue_ar);
  const summary = pick(lang, event.summary_en, event.summary_ar);
  const lines = [
    `<b>${escapeHtml(pick(lang, event.title_en, event.title_ar))}</b>`,
    when(lang, event.starts_at),
    venue ? escapeHtml(venue) : null,
    event.members_only ? t.membersOnly : null,
  ];
  if (withSummary && summary) {
    lines.push("", escapeHtml(summary));
  }
  const places = event.rsvp_enabled ? placesLine(t, event) : null;
  let mine: string | null = null;
  if (event.mine === "confirmed") {
    mine = t.going;
  } else if (event.mine === "waitlisted") {
    mine = t.waitlisted;
  }
  if (places || mine) {
    lines.push("", ...[mine ?? places].filter(Boolean));
  }
  return lines.filter((line) => line !== null).join("\n");
};

/** Both languages in one post: English, a rule, then Arabic. */
export const bilingual = (
  mode: "en" | "ar" | "both",
  build: (lang: Lang) => string
) => {
  if (mode !== "both") {
    return build(mode);
  }
  return `${build("en")}\n\n${build("ar")}`;
};

/** A button label in the group's language mode. */
export const label = (
  mode: "en" | "ar" | "both",
  pickLabel: (t: Copy) => string
) =>
  mode === "both"
    ? `${pickLabel(copy.en)} · ${pickLabel(copy.ar)}`
    : pickLabel(copy[mode]);

const DURATION = /^(\d{1,4})\s*([mhd])$/i;
const MAX_SECONDS = 366 * 24 * 60 * 60;

/** "30m", "2h", "1d" → seconds (Telegram's limit: up to 366 days). */
export const parseDuration = (text: string | undefined, fallback = 3600) => {
  const match = DURATION.exec(text?.trim() ?? "");
  if (!match) {
    return fallback;
  }
  const n = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  const seconds = n * ({ d: 86_400, h: 3600, m: 60 }[unit ?? "m"] ?? 60);
  return Math.min(Math.max(seconds, 60), MAX_SECONDS);
};

export const formatDuration = (lang: Lang, seconds: number) => {
  const t = copy[lang];
  if (seconds % 86_400 === 0) {
    return t.days(String(seconds / 86_400));
  }
  if (seconds % 3600 === 0) {
    return t.hours(String(seconds / 3600));
  }
  return t.minutes(String(Math.round(seconds / 60)));
};
