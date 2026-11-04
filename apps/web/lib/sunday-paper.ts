import { zonedMonthStart } from "@repo/internationalization/format";

const DAY = 86_400_000;

/** An issue of the Sunday Paper: the month it is named for and its two windows. */
export interface Issue {
  /** "2026-11", for the address. */
  readonly key: string;
  /** The pieces it carried: the month before its Sunday. */
  readonly piecesFrom: Date;
  /** Its Sunday, the first of the month (Baghdad midnight). */
  readonly sunday: Date;
  /** What was on: the month after its Sunday. */
  readonly until: Date;
}

/** Baghdad midnight of a day of a month (months past 11 roll over). */
const dayOf = (year: number, monthIndex: number, day: number) => {
  const month = new Date(Date.UTC(year, monthIndex, 1));
  return new Date(
    zonedMonthStart(month.getUTCFullYear(), month.getUTCMonth()).getTime() +
      (day - 1) * DAY
  );
};

/** The day of the month of its first Sunday. */
const firstSundayDay = (year: number, monthIndex: number) =>
  1 + ((7 - new Date(Date.UTC(year, monthIndex, 1)).getUTCDay()) % 7);

/**
 * The issue named for a month (C17). The Sunday Paper is sent on the first
 * Sunday of the month (`private.queue_sunday_paper`) with the pieces of the
 * month before and the events of the month after, so its archive page is
 * rebuilt from the same records, the same way.
 */
export const issueOf = (year: number, monthIndex: number): Issue => {
  const day = firstSundayDay(year, monthIndex);
  return {
    key: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
    piecesFrom: dayOf(year, monthIndex - 1, day),
    sunday: dayOf(year, monthIndex, day),
    until: dayOf(year, monthIndex + 1, day),
  };
};

/** Every issue from the month of `from` to today's, newest first, sent already. */
export const issuesSince = (from: Date, now = new Date()) => {
  const issues: Issue[] = [];
  const start = from.getUTCFullYear() * 12 + from.getUTCMonth();
  const end = now.getUTCFullYear() * 12 + now.getUTCMonth();
  for (let at = start; at <= end; at += 1) {
    const issue = issueOf(Math.floor(at / 12), at % 12);
    if (issue.sunday <= now) {
      issues.push(issue);
    }
  }
  return issues.reverse();
};
