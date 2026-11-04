import type { NotionPage } from "./client";
import { read, SLUG, slugify, toInstant } from "./props";

/**
 * What a Notion page must hold before the platform publishes it, checked
 * the same way as the Diwan's forms and the database. Each problem is a
 * short instruction for the page's Platform note and comment. One language
 * per row (Nov 4, 2026): an English row publishes the record, and an
 * Arabic edition (Language Arabic, Edition of the English row) gives it
 * its Arabic.
 */

export interface EventValues {
  capacity: number | null;
  ends_at: string | null;
  members_only: boolean;
  programme_id: string | null;
  rsvp_enabled: boolean;
  slug: string;
  starts_at: string;
  summary_en: string | null;
  title_en: string;
  venue_en: string | null;
}

type Checked<T> = { ok: true; values: T } | { ok: false; problems: string[] };

const optional = (text: string) => text || null;

const lengthProblem = (label: string, text: string, max: number) =>
  text.length > max
    ? [`${label} is ${text.length} characters; keep it to ${max}.`]
    : [];

const slugFor = (page: NotionPage, title: string) => {
  const given = read.text(page, "Slug").toLowerCase();
  return given || slugify(title);
};

/** The one program a page is linked to, as a Diwan id. */
const programmeFor = (
  page: NotionPage,
  programmes: ReadonlyMap<string, string>,
  problems: string[]
) => {
  const linked = read
    .relation(page, "Program")
    .map((pageId) => pageId.replaceAll("-", ""));
  if (linked.length > 1) {
    problems.push("Link at most one program.");
  }
  const [first] = linked;
  if (!first) {
    return null;
  }
  const id = programmes.get(first);
  if (!id) {
    problems.push("The linked program is not one of the six programs.");
  }
  return id ?? null;
};

const slugProblems = (slug: string) =>
  SLUG.test(slug)
    ? []
    : [
        "Set a Slug in Latin letters, digits and hyphens (for example open-pages-october); the title gives none.",
      ];

/** The row's language: English unless it says Arabic. */
export const languageOf = (page: NotionPage): "ar" | "en" =>
  read.select(page, "Language") === "Arabic" ? "ar" : "en";

/** The English row an Arabic edition translates, if it names one. */
export const editionOf = (page: NotionPage, problems: string[]) => {
  const linked = read.relation(page, "Edition of");
  if (linked.length !== 1) {
    problems.push(
      "An Arabic edition links exactly one English row in Edition of."
    );
    return null;
  }
  return (linked[0] ?? "").replaceAll("-", "");
};

const englishTitle = (page: NotionPage, problems: string[]) => {
  const title = read.text(page, "Title");
  if (!title) {
    problems.push("Add the title.");
  }
  problems.push(...lengthProblem("The title", title, 200));
  return title;
};

export const checkEvent = (
  page: NotionPage,
  programmes: ReadonlyMap<string, string>
): Checked<EventValues> => {
  const problems: string[] = [];
  const titleEn = englishTitle(page, problems);
  const when = read.date(page, "When");
  const startsAt = toInstant(when?.start);
  const endsAt = toInstant(when?.end);
  if (!when?.start) {
    problems.push("Set When to the start date and time.");
  } else if (!startsAt) {
    problems.push("Add a start time to When, not only a date.");
  }
  if (when?.end && !endsAt) {
    problems.push("Add an end time to When, or remove the end date.");
  }
  if (startsAt && endsAt && endsAt <= startsAt) {
    problems.push("The end of When must be after the start.");
  }
  const summaryEn = read.text(page, "Summary");
  problems.push(...lengthProblem("The summary", summaryEn, 500));
  const capacity = read.number(page, "Capacity");
  if (capacity !== null && !(Number.isInteger(capacity) && capacity > 0)) {
    problems.push("Capacity must be a whole number above zero, or empty.");
  }
  const slug = slugFor(page, titleEn);
  problems.push(...slugProblems(slug));
  const programmeId = programmeFor(page, programmes, problems);

  if (problems.length > 0 || !startsAt) {
    return { ok: false, problems };
  }
  return {
    ok: true,
    values: {
      capacity,
      ends_at: endsAt,
      members_only: read.checkbox(page, "Members only"),
      programme_id: programmeId,
      rsvp_enabled: read.checkbox(page, "RSVPs open"),
      slug,
      starts_at: startsAt,
      summary_en: optional(summaryEn),
      title_en: titleEn,
      venue_en: optional(read.text(page, "Venue")),
    },
  };
};

export interface ArabicEdition {
  /** The English row's page id, bare. */
  of: string;
  summary: string | null;
  title: string;
  venue: string | null;
}

/** An Arabic edition row: its own title, summary and venue, and its English row. */
export const checkArabicEdition = (
  page: NotionPage,
  { summary = "Summary", title = "Title", venue = "Venue" } = {}
): Checked<ArabicEdition> => {
  const problems: string[] = [];
  const of = editionOf(page, problems);
  const text = read.text(page, title);
  if (!text) {
    problems.push("Add the Arabic title.");
  }
  problems.push(...lengthProblem("The title", text, 200));
  const summaryText = read.text(page, summary);
  problems.push(...lengthProblem("The summary", summaryText, 500));
  if (problems.length > 0 || !of) {
    return { ok: false, problems };
  }
  return {
    ok: true,
    values: {
      of,
      summary: optional(summaryText),
      title: text,
      venue: optional(read.text(page, venue)),
    },
  };
};

export interface ProgramValues {
  name: string;
  rhythm: string | null;
  slug: string;
  summary: string | null;
}

/** A program row (Publishing, Programs): its name, rhythm and summary. */
export const checkProgram = (page: NotionPage): Checked<ProgramValues> => {
  const problems: string[] = [];
  const name = read.text(page, "Name");
  if (!name) {
    problems.push("Add the program's name.");
  }
  const rhythm = read.text(page, "Rhythm");
  const summary = read.text(page, "Summary");
  problems.push(
    ...lengthProblem("The name", name, 120),
    ...lengthProblem("The rhythm", rhythm, 200),
    ...lengthProblem("The summary", summary, 500)
  );
  const slug = slugify(name);
  if (problems.length > 0) {
    return { ok: false, problems };
  }
  return {
    ok: true,
    values: {
      name,
      rhythm: optional(rhythm),
      slug,
      summary: optional(summary),
    },
  };
};

const CODE = /^SAL-[A-Z]{3}-\d{2}$/;

export interface DocumentValues {
  audience: "internal" | "public";
  code: string;
  dated: string | null;
  slug: string;
  summary: string | null;
  title: string;
}

/** A document row (Publishing, Documents). The page itself is the text. */
export const checkDocument = (page: NotionPage): Checked<DocumentValues> => {
  const problems: string[] = [];
  const title = englishTitle(page, problems);
  const code = read.text(page, "Code").toUpperCase();
  if (!CODE.test(code)) {
    problems.push("Set the Code, for example SAL-GOV-01.");
  }
  const slug = read.text(page, "Slug").toLowerCase() || slugify(title);
  problems.push(...slugProblems(slug));
  const summary = read.text(page, "Summary");
  problems.push(...lengthProblem("The summary", summary, 600));
  const audience = (read.select(page, "Audience") ?? "").toLowerCase();
  if (audience !== "public" && audience !== "internal") {
    problems.push("Set Audience to public or internal.");
  }
  if (problems.length > 0) {
    return { ok: false, problems };
  }
  return {
    ok: true,
    values: {
      audience: audience as "internal" | "public",
      code,
      dated: read.date(page, "Dated")?.start?.slice(0, 10) ?? null,
      slug,
      summary: optional(summary),
      title,
    },
  };
};

export type WaraqDesk =
  | "news"
  | "voices"
  | "letters"
  | "gallery"
  | "video"
  | "games";

/**
 * A Qirtas row, in one language. An English row (or an Arabic row on its
 * own) makes a piece; an Arabic edition (Edition of the English row) adds
 * its Arabic to the English row's piece.
 */
export interface WaraqValues {
  deck: string | null;
  desk: WaraqDesk | null;
  language: "ar" | "en";
  /** The English row an Arabic edition translates (bare page id). */
  of: string | null;
  publish_at: string | null;
  title: string;
}

const DESKS: Record<string, WaraqDesk> = {
  Gallery: "gallery",
  Games: "games",
  Letters: "letters",
  News: "news",
  Video: "video",
  Voices: "voices",
};

/**
 * A Qirtas row in the content calendar (Kind "Qirtas", or "News post" for
 * the News desk): it is imported as a piece in Editing, so it needs only
 * what a piece starts with. The editing, approvals and publishing happen in
 * the Diwan.
 */
export const checkWaraq = (
  page: NotionPage,
  fallbackDesk?: WaraqDesk
): Checked<WaraqValues> => {
  const problems: string[] = [];
  const language = languageOf(page);
  // An Arabic row is an edition when it names its English row; on its own
  // it is an Arabic piece.
  const of =
    language === "ar" && read.relation(page, "Edition of").length > 0
      ? editionOf(page, problems)
      : null;
  const title = read.text(page, "Title");
  if (!title) {
    problems.push("Add the title.");
  }
  problems.push(...lengthProblem("The title", title, 200));
  // An edition goes where its English row went.
  const desk = of
    ? null
    : (DESKS[read.select(page, "Desk") ?? ""] ?? fallbackDesk ?? null);
  if (!(of || desk)) {
    problems.push(
      "Choose the Desk: News, Voices, Letters, Gallery, Video or Games."
    );
  }
  const deck = read.text(page, "Excerpt");
  problems.push(...lengthProblem("The excerpt (the deck)", deck, 400));
  const on = read.date(page, "Publish on")?.start ?? null;
  const publishAt = on ? (toInstant(on) ?? toInstant(`${on}T09:00:00`)) : null;
  if (problems.length > 0) {
    return { ok: false, problems };
  }
  return {
    ok: true,
    values: {
      deck: optional(deck),
      desk,
      language,
      of,
      publish_at: publishAt,
      title,
    },
  };
};
