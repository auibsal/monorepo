import type { NotionPage } from "./client";
import { read, SLUG, slugify } from "./props";

/**
 * What a Notion document must hold before the platform publishes it,
 * checked the same way as the Diwan's forms and the database. Each problem
 * is a short instruction for the page's Platform note and comment. One
 * language per row (Nov 4, 2026). Events are no longer published from
 * Notion: they are made in the Diwan (decisions.md, Events).
 */

type Checked<T> = { ok: true; values: T } | { ok: false; problems: string[] };

const optional = (text: string) => text || null;

const lengthProblem = (label: string, text: string, max: number) =>
  text.length > max
    ? [`${label} is ${text.length} characters; keep it to ${max}.`]
    : [];

const slugProblems = (slug: string) =>
  SLUG.test(slug)
    ? []
    : [
        "Set a Slug in Latin letters, digits and hyphens (for example writing-workshop-2027-04-13); the title gives none.",
      ];

/** The row's language: English unless it says Arabic. */
export const languageOf = (page: NotionPage): "ar" | "en" =>
  read.select(page, "Language") === "Arabic" ? "ar" : "en";

const englishTitle = (page: NotionPage, problems: string[]) => {
  const title = read.text(page, "Title");
  if (!title) {
    problems.push("Add the title.");
  }
  problems.push(...lengthProblem("The title", title, 200));
  return title;
};

const CODE = /^SAL-(GOV|EXB|EVT|MEM|PTN|MED|ART|EDT)-\d{2}$/u;

/** The code families retired on Nov 7, 2026. */
export const RETIRED_DOCUMENT_FAMILY =
  /^SAL-(POL|HBK|STR|PRP|BRD|PLT|QRT|CMP|OPS)-/u;

export interface DocumentValues {
  audience: "internal" | "public";
  code: string;
  /** The seat that keeps the document (Owner), for its header (§13). */
  keeper: string | null;
  slug: string;
  summary: string | null;
  title: string;
}

/**
 * A document row (Publishing, Documents). The page itself is the text. An
 * Arabic row leaves Audience blank: it is given, from its English row.
 */
export const checkDocument = (
  page: NotionPage,
  audienceGiven?: string | null
): Checked<DocumentValues> => {
  const problems: string[] = [];
  const title = englishTitle(page, problems);
  const code = read.text(page, "Code").toUpperCase();
  if (!CODE.test(code)) {
    problems.push(
      "Set the Code, for example SAL-GOV-01 (families GOV, EXB, EVT, MEM, PTN, MED, ART, EDT)."
    );
  }
  // The Arabic edition takes the English row's address.
  const slug = read.text(page, "Slug").toLowerCase() || slugify(title);
  if (languageOf(page) === "en") {
    problems.push(...slugProblems(slug));
  }
  const summary = read.text(page, "Summary");
  problems.push(...lengthProblem("The summary", summary, 600));
  const audience = (
    audienceGiven ??
    read.select(page, "Audience") ??
    ""
  ).toLowerCase();
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
      keeper: read.select(page, "Owner") ?? null,
      slug,
      summary: optional(summary),
      title,
    },
  };
};
