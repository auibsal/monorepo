/**
 * An event's dates that pages work out without the database: the day
 * Guests' booking closes on campus, and when "How was it?" is open. Kept
 * apart from the queries so the event page's own script stays small.
 */

const DAY_MS = 86_400_000;

/**
 * On campus, Guests always book, and their booking closes 14 days before
 * the event, when their names go to Security through Student Life
 * (private.guests_book_by). Off campus the event's own rules apply: null.
 */
export const guestsBookBy = (event: {
  off_campus: boolean | null;
  starts_at: string;
}) =>
  event.off_campus
    ? null
    : new Date(new Date(event.starts_at).getTime() - 14 * DAY_MS).toISOString();

/**
 * "How was it?" (decisions.md, Events): open from the event's start until
 * 14 days after its end (two hours after the start when it has none), to
 * who checked in.
 */
export const FEEDBACK_DAYS = 14;
const DEFAULT_LENGTH_MS = 2 * 3_600_000;

export const feedbackWindow = (event: {
  ends_at: string | null;
  starts_at: string;
}) => {
  const end = event.ends_at
    ? new Date(event.ends_at).getTime()
    : new Date(event.starts_at).getTime() + DEFAULT_LENGTH_MS;
  return {
    closes: end + FEEDBACK_DAYS * DAY_MS,
    opens: new Date(event.starts_at).getTime(),
  };
};

export const feedbackOpen = (
  event: { ends_at: string | null; starts_at: string },
  now: number
) => {
  const { closes, opens } = feedbackWindow(event);
  return now >= opens && now < closes;
};

/** The five choices, "Not for me" (1) to "Loved it" (5). */
export const RATINGS = [1, 2, 3, 4, 5] as const;
