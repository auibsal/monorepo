#!/usr/bin/env bun
/**
 * Checks the date line of claude/decisions.md, the read-only mirror of the
 * Claude project's file (replaced whole, never edited here): the first line
 * must read "# SAL: current decisions (source of truth, Wednesday,
 * November 11, 2026)", a real day with its weekday right, not in the future.
 */
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
const DAY = 24 * 60 * 60 * 1000;

const problems: string[] = [];
const text = await readFile(FILE, "utf8");
const [first = ""] = text.split("\n");
const match = DATE_LINE.exec(first);

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
  }
} else {
  problems.push(
    `The first line must read "# SAL: current decisions (source of truth, <Weekday>, <Month> <D>, <YYYY>)"; it reads "${first}".`
  );
}

if (problems.length > 0) {
  for (const problem of problems) {
    console.error(`decisions.md: ${problem}`);
  }
  process.exit(1);
}
console.log(`decisions.md OK: ${first.slice(2)}`);
