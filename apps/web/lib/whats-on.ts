import {
  toZonedDateValue,
  WEEK_STARTS_ON,
  zonedMonthStart,
  zonedYearMonth,
} from "@repo/internationalization/format";

const MONTH = /^(\d{4})-(\d{2})$/;

export interface Month {
  /** First instant of the month (Baghdad midnight). */
  from: Date;
  monthIndex: number;
  /** First instant of the next month. */
  to: Date;
  year: number;
}

const make = (year: number, monthIndex: number): Month => {
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const y = start.getUTCFullYear();
  const m = start.getUTCMonth();
  const next = new Date(Date.UTC(y, m + 1, 1));
  return {
    from: zonedMonthStart(y, m),
    monthIndex: m,
    to: zonedMonthStart(next.getUTCFullYear(), next.getUTCMonth()),
    year: y,
  };
};

/** The month a `?month=YYYY-MM` names, or the current one in Baghdad. */
export const monthFrom = (value: string | undefined, now = new Date()) => {
  const match = MONTH.exec(value ?? "");
  const year = Number(match?.[1]);
  const month = Number(match?.[2]);
  if (match && month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
    return make(year, month - 1);
  }
  const current = zonedYearMonth(now);
  return make(current.year, current.monthIndex);
};

export const shiftMonth = (month: Month, by: number) =>
  make(month.year, month.monthIndex + by);

/** "2026-11", for the query string. */
export const monthParam = (month: Month) =>
  `${month.year}-${String(month.monthIndex + 1).padStart(2, "0")}`;

/** "YYYY-MM-DD" of a day in the month grid (no time zone of its own). */
const dayKey = (year: number, monthIndex: number, day: number) => {
  const d = new Date(Date.UTC(year, monthIndex, day));
  return d.toISOString().slice(0, 10);
};

/**
 * The month as weeks of seven day keys, starting on the Society's first day
 * of the week (Saturday); days outside the month are null.
 */
export const monthWeeks = (month: Month) => {
  const first = new Date(Date.UTC(month.year, month.monthIndex, 1));
  const days = new Date(
    Date.UTC(month.year, month.monthIndex + 1, 0)
  ).getUTCDate();
  const lead = (first.getUTCDay() - WEEK_STARTS_ON + 7) % 7;
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) =>
      dayKey(month.year, month.monthIndex, i + 1)
    ),
  ];
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
};

/** Events by their Baghdad day ("YYYY-MM-DD"). */
export const byDay = <T extends { starts_at: string }>(rows: readonly T[]) => {
  const days = new Map<string, T[]>();
  for (const row of rows) {
    const key = toZonedDateValue(row.starts_at);
    days.set(key, [...(days.get(key) ?? []), row]);
  }
  return days;
};

/** The weekday of each grid column, as noon UTC dates to format. */
export const weekdayColumns = () =>
  Array.from(
    { length: 7 },
    // 2026-01-03 is a Saturday.
    (_, i) =>
      new Date(Date.UTC(2026, 0, 3 + ((WEEK_STARTS_ON - 6 + 7 + i) % 7), 12))
  );
