/**
 * A person's legal name in parts, in English and in Arabic, as on their
 * papers (decisions.md, Members): their given name, their father's, their
 * grandfather's, and the family name where there is one. English parts are
 * in Latin letters and Arabic parts in Arabic letters. The name shown
 * everywhere is the preferred name, or by default the given and father's
 * names: the database keeps it in `full_name_en` and `full_name_ar`
 * (`private.display_name`), and every surface reads those.
 */
export const nameParts = ["first", "father", "grandfather", "last"] as const;

export type NamePart = (typeof nameParts)[number];
export type NameLanguage = "en" | "ar";
export type NameParts = Record<NamePart, string>;
export type FourPartNames = Record<NameLanguage, NameParts>;

/** The profile column for a part: first_name_en, father_name_ar … */
const nameColumn = (part: NamePart, language: NameLanguage) =>
  `${part}_name_${language}` as const;

export type NameColumn = ReturnType<typeof nameColumn>;

export const nameColumns = (["en", "ar"] as const).flatMap((language) =>
  nameParts.map((part) => nameColumn(part, language))
);

export const emptyParts = (): NameParts => ({
  father: "",
  first: "",
  grandfather: "",
  last: "",
});

/**
 * The official name (decisions.md, Members): the four parts, the family
 * name only where there is one; someone whose papers don't use four names
 * gives the given and family names.
 */
export const partsComplete = (parts: NameParts) => {
  const has = (part: NamePart) => parts[part].trim() !== "";
  return has("first") && ((has("father") && has("grandfather")) || has("last"));
};

/** The default name shown: the given and father's names. */
export const displayName = (parts: NameParts) =>
  [parts.first.trim(), parts.father.trim()].filter(Boolean).join(" ");

const LATIN_NAME =
  /^[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u1E00-\u1EFF'’. -]+$/u;
const ARABIC_NAME = /^[\u0621-\u065F\u0670-\u06D3\u06FA-\u06FF ]+$/u;

/**
 * Whether a name is written in its language's script: Latin letters in
 * English, Arabic letters in Arabic (the database checks the same,
 * `private.latin_name` and `private.arabic_name`). Empty is fine.
 */
export const inScript = (value: string, language: NameLanguage) => {
  const v = value.trim();
  if (!v) {
    return true;
  }
  return (language === "ar" ? ARABIC_NAME : LATIN_NAME).test(v);
};

export const partsInScript = (parts: NameParts, language: NameLanguage) =>
  nameParts.every((part) => inScript(parts[part], language));

type ProfileNames = Partial<Record<NameColumn, string | null>> & {
  full_name_ar?: string | null;
  full_name_en?: string | null;
};

const WHITESPACE = /\s+/u;

/**
 * A profile's parts in one language. A name kept whole from before the
 * parts (Oct 31, 2026) offers its first word and its last as the first
 * and fourth parts, so the member only adds the two in between.
 */
export const partsFrom = (
  profile: ProfileNames | null | undefined,
  language: NameLanguage
): NameParts => {
  const parts = emptyParts();
  for (const part of nameParts) {
    parts[part] = profile?.[nameColumn(part, language)] ?? "";
  }
  if (!nameParts.some((part) => parts[part])) {
    const words = (profile?.[`full_name_${language}`] ?? "")
      .trim()
      .split(WHITESPACE)
      .filter(Boolean);
    parts.first = words[0] ?? "";
    parts.last = words.length > 1 ? (words.at(-1) ?? "") : "";
  }
  return parts;
};

/**
 * The parts actually on record in one language (never the parts
 * `partsFrom` suggests from an old one-piece name): the account can't
 * change these, so a form shows them read-only and never sends them.
 */
export const storedParts = (
  profile: ProfileNames | null | undefined,
  language: NameLanguage
): NamePart[] =>
  nameParts.filter(
    (part) => (profile?.[nameColumn(part, language)] ?? "").trim() !== ""
  );

/** The official name is complete in both languages. */
export const hasFourPartNames = (profile: ProfileNames | null | undefined) =>
  (["en", "ar"] as const).every((language) => {
    const parts = emptyParts();
    for (const part of nameParts) {
      parts[part] = profile?.[nameColumn(part, language)] ?? "";
    }
    return partsComplete(parts);
  });

/** The update that saves one language's parts. */
export const partsUpdate = (
  parts: NameParts,
  language: NameLanguage,
  /** Parts on record, left out: the account can't change them. */
  skip: readonly NamePart[] = []
) =>
  Object.fromEntries(
    nameParts
      .filter((part) => !skip.includes(part))
      .map((part) => [nameColumn(part, language), parts[part].trim() || null])
  ) as Partial<Record<NameColumn, string | null>>;

/** Complete and in its language's letters: ready to save. */
export const partsReady = (parts: NameParts, language: NameLanguage) =>
  partsComplete(parts) && partsInScript(parts, language);

// ── One line per language at sign-up (decisions.md, Members) ───────────────

const LATIN_LETTERS =
  "A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u024F\\u1E00-\\u1EFF";
const LATIN_WORD = new RegExp(
  `^[${LATIN_LETTERS}]+(?:-[${LATIN_LETTERS}]+)*$`,
  "u"
);
const ARABIC_WORD = /^[ء-غف-يً-ْٰٱ-ۓ]+$/u;
const AROUND_HYPHEN = /\s*-\s*/gu;
const SPACES = /\s+/u;

/**
 * Arabic names of two words that are one name, written with a space
 * («أبو بكر», «عبد الله»): the first word joins the next. «عبدالله»,
 * written as one word, is one word already.
 */
const ARABIC_JOINS = new Set(["أبو", "ابو", "أبي", "ابي", "عبد"]);

/** "ali abdul - rahman" → "Ali Abdul-Rahman": hyphens closed up, each name capitalized. */
export const tidyEnglishName = (value: string) =>
  value
    .trim()
    .replace(AROUND_HYPHEN, "-")
    .split(SPACES)
    .filter(Boolean)
    .map((word) =>
      word
        .split("-")
        .map((piece) => {
          const rest = piece.slice(1);
          // A name typed in capitals reads as a name: "ALI" → "Ali".
          const tail = rest === rest.toUpperCase() ? rest.toLowerCase() : rest;
          return piece.charAt(0).toUpperCase() + tail;
        })
        .join("-")
    )
    .join(" ");

/** The names in one line, in order, as the site reads them. */
export const namesInLine = (value: string, language: NameLanguage) => {
  const words = value
    .trim()
    .replace(AROUND_HYPHEN, "-")
    .split(SPACES)
    .filter(Boolean);
  if (language === "en") {
    return words;
  }
  const names: string[] = [];
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i] ?? "";
    const next = words[i + 1];
    if (ARABIC_JOINS.has(word) && next) {
      names.push(`${word} ${next}`);
      i += 1;
    } else {
      names.push(word);
    }
  }
  return names;
};

/**
 * What is wrong with one line of four names, or null: exactly four names,
 * letters only (no digits or symbols), an English name capitalized and a
 * name of two words joined by a hyphen ("Abdul-Rahman").
 */
export const lineProblem = (
  value: string,
  language: NameLanguage
): "count" | "letters" | "capitals" | null => {
  const names = namesInLine(value, language);
  if (language === "en") {
    if (!names.every((name) => LATIN_WORD.test(name))) {
      return "letters";
    }
    if (
      !names.every((name) =>
        name
          .split("-")
          .every((piece) => piece.charAt(0) === piece.charAt(0).toUpperCase())
      )
    ) {
      return "capitals";
    }
  } else if (
    !names.every((name) =>
      name.split(" ").every((word) => ARABIC_WORD.test(word))
    )
  ) {
    return "letters";
  }
  return names.length === nameParts.length ? null : "count";
};

/** The four parts of a line that has no problem. */
export const partsFromLine = (
  value: string,
  language: NameLanguage
): NameParts => {
  const [first = "", father = "", grandfather = "", last = ""] = namesInLine(
    value,
    language
  );
  return { father, first, grandfather, last };
};
