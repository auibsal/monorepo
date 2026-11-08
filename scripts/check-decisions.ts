#!/usr/bin/env bun
/**
 * Checks claude/decisions.md's date line, the first line of the file:
 * "# SAL: current decisions (source of truth, Saturday, November 7, 2026)".
 * The date must be a real day, its weekday right, and not in the future;
 * no "decided <Mon> <D>" in the file may be later than it. With a base
 * ref (DECISIONS_BASE, e.g. origin/main), a changed file must carry a
 * changed date line: the same text is kept in the Claude project, and the
 * date is how the two copies are matched.
 */
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const FILE = "claude/decisions.md";
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const DATE_LINE =
  /^# SAL: current decisions \(source of truth, (\w+), (\w+) (\d{1,2}), (\d{4})\)$/u;
const DECIDED = /decided ([A-Z][a-z]{2})\.? (\d{1,2})(?:, (\d{4}))?/gu;
const DAY = 24 * 60 * 60 * 1000;

const problems: string[] = [];
const text = await readFile(FILE, "utf8");
const [first = ""] = text.split("\n");
const match = DATE_LINE.exec(first);

const monthIndex = (name: string) =>
  MONTHS.findIndex((month) => month.startsWith(name));

if (match) {
  const [, weekday = "", monthName = "", dayText = "", yearText = ""] = match;
  const month = MONTHS.indexOf(monthName);
  const day = Number(dayText);
  const year = Number(yearText);
  const date = new Date(Date.UTC(year, month, day));
  if (month < 0 || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
    problems.push(`${monthName} ${dayText}, ${yearText} is not a date.`);
  } else {
    const named = WEEKDAYS[date.getUTCDay()];
    if (named !== weekday) {
      problems.push(
        `${monthName} ${day}, ${year} is a ${named}, not ${weekday}.`
      );
    }
    // A day's grace: Baghdad is ahead of UTC.
    if (date.getTime() > Date.now() + DAY) {
      problems.push(
        `The date line (${monthName} ${day}, ${year}) is in the future.`
      );
    }
    for (const [found, short = "", d = "", y] of text.matchAll(DECIDED)) {
      const at = Date.UTC(y ? Number(y) : year, monthIndex(short), Number(d));
      if (monthIndex(short) >= 0 && at > date.getTime()) {
        problems.push(`"${found}" is later than the date line.`);
      }
    }
  }
} else {
  problems.push(
    `The first line must read "# SAL: current decisions (source of truth, <Weekday>, <Month> <D>, <YYYY>)"; it reads "${first}".`
  );
}

const base = process.env.DECISIONS_BASE;
if (base) {
  const git = (...args: string[]) =>
    spawnSync("git", args, { encoding: "utf8" });
  const changed = git("diff", "--quiet", base, "--", FILE).status !== 0;
  const before = git("show", `${base}:${FILE}`);
  const existed = before.status === 0;
  const beforeLine = existed ? (before.stdout.split("\n")[0] ?? "") : "";
  if (changed && existed && beforeLine === first) {
    problems.push(
      `${FILE} changed but its date line did not: give it the date of this version.`
    );
  }
}

if (problems.length > 0) {
  for (const problem of problems) {
    console.error(`decisions.md: ${problem}`);
  }
  process.exit(1);
}
console.log(`decisions.md OK: ${first.slice(2)}`);
