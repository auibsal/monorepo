import { cacheLife } from "next/cache";

/**
 * The current year, for a copyright line: kept a day at a time, so a
 * prerendered page needs no request to know it (Cache Components).
 */
export const thisYear = async () => {
  "use cache";
  cacheLife("days");
  return await Promise.resolve(new Date().getFullYear());
};

/**
 * Now, to within a few minutes, for pages that sort the past from the
 * coming (Events, the home page): kept a few minutes at a time, so
 * those pages stay prerendered and refresh on their own.
 */
export const roughlyNow = async () => {
  "use cache";
  cacheLife("minutes");
  return await Promise.resolve(Date.now());
};
