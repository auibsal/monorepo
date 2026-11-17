/**
 * When a finished record leaves the active lists for the Archive
 * (decisions.md, The site: "Archive"), worked out from its own state so
 * nothing is kept twice. In the Archive it is still found, and opens
 * read-only.
 */
const DAY = 24 * 60 * 60 * 1000;

/** The days after an event its team still writes the debrief and minutes. */
const AFTER_EVENT_DAYS = 30;
/** The days after an opening closes that its replies are still answered. */
const AFTER_OPENING_DAYS = 30;

/** Canceled, or its After is done. */
export const eventArchived = (
  event: {
    readonly ends_at: string | null;
    readonly starts_at: string;
    readonly status: string;
  },
  now = Date.now()
) =>
  event.status === "canceled" ||
  now - new Date(event.ends_at ?? event.starts_at).getTime() >
    AFTER_EVENT_DAYS * DAY;

/** Closed a month ago, once its replies have had their answer. */
export const openingArchived = (
  opening: { readonly closes_at: string | null; readonly is_open: boolean },
  now = Date.now()
) =>
  !opening.is_open &&
  now - new Date(opening.closes_at ?? 0).getTime() > AFTER_OPENING_DAYS * DAY;

/** Canceled, or closed with its report signed. */
export const productionArchived = (production: {
  readonly report_signed_at: string | null;
  readonly stage: string;
}) =>
  production.stage === "canceled" ||
  (production.stage === "closed" && Boolean(production.report_signed_at));
