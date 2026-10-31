import type { FeedEvent } from "./ical";

/**
 * The Society's terms come from the AUIB calendar (owner, Oct 30, 2026):
 * "First day of Fall Semester - UGRD" opens one and "Fall Semester Ends -
 * last day on campus" closes it. Nobody types them in.
 */
export interface Term {
  code: string;
  ends_on: string;
  name_ar: string;
  name_en: string;
  starts_on: string;
}

const SEASONS = {
  fall: { ar: "خريف", en: "Fall" },
  spring: { ar: "ربيع", en: "Spring" },
  summer: { ar: "صيف", en: "Summer" },
} as const;

type Season = keyof typeof SEASONS;

const OPENS = /first day of (fall|spring|summer) semester/i;
const CLOSES = /(fall|spring|summer) semester ends/i;

/** The calendar date in Baghdad, as YYYY-MM-DD. */
const baghdadDate = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad" }).format(
    new Date(iso)
  );

const seasonOf = (title: string, pattern: RegExp) =>
  (pattern.exec(title)?.[1]?.toLowerCase() as Season | undefined) ?? null;

/** Each term the feed opens and closes, oldest first. */
export const termsFromFeed = (events: readonly FeedEvent[]): Term[] => {
  const dated = [...events].sort((a, b) => a.start.localeCompare(b.start));
  const terms: Term[] = [];
  for (const opening of dated) {
    const season = seasonOf(opening.title, OPENS);
    if (!season) {
      continue;
    }
    const startsOn = baghdadDate(opening.start);
    const closing = dated.find(
      (e) =>
        seasonOf(e.title, CLOSES) === season && baghdadDate(e.start) > startsOn
    );
    if (!closing) {
      continue;
    }
    const year = startsOn.slice(0, 4);
    terms.push({
      code: `${season}-${year}`,
      ends_on: baghdadDate(closing.start),
      name_ar: `${SEASONS[season].ar} ${year}`,
      name_en: `${SEASONS[season].en} ${year}`,
      starts_on: startsOn,
    });
  }
  return terms;
};
