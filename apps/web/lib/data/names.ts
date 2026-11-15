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

const emptyParts = (): NameParts => ({
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

// ── One line per language at sign-up (decisions.md, Members) ───────────────
//
// The four names are typed in one line, word by word. A name of two words
// written with a space ("Mohammed Ali", «أبو بكر») is one name: the line
// is shown back word by word, and the person joins two words by tapping
// between them. «أبو» and «عبد» (and their spellings) come joined to the
// next word in Arabic, since they are never a name alone.

const LATIN_LETTERS =
  "A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u024F\\u1E00-\\u1EFF";
const LATIN_WORD = new RegExp(
  `^[${LATIN_LETTERS}]+(?:-[${LATIN_LETTERS}]+)*$`,
  "u"
);
const ARABIC_LETTERS =
  "\\u0621-\\u063A\\u0641-\\u064A\\u064B-\\u0652\\u0670\\u0671-\\u06D3";
const ARABIC_WORD = new RegExp(
  `^[${ARABIC_LETTERS}]+(?:-[${ARABIC_LETTERS}]+)*$`,
  "u"
);
const AROUND_HYPHEN = /\s*-\s*/gu;
const SPACES = /\s+/u;

const ARABIC_JOINS = new Set(["أبو", "ابو", "أبي", "ابي", "عبد"]);

// What each line takes as it is typed: its own script's letters and
// spaces, and the hyphen of a joined name (Abdul-Rahman, «عبد-الرحمن»).
const NOT_ENGLISH = new RegExp(`[^${LATIN_LETTERS}\\s-]`, "gu");
const NOT_ARABIC = new RegExp(`[^${ARABIC_LETTERS}\\s-]`, "gu");
const RUNS_OF_SPACES = /\s+/gu;
const RUNS_OF_HYPHENS = /-{2,}/gu;
const LEADING = /^[\s-]+/u;
const TRAILING_SPACE = /\s$/u;

/**
 * A line as typed, kept to its language: letters of the other script,
 * digits and symbols never reach it (only the hyphen).
 */
export const typedName = (value: string, language: NameLanguage) =>
  value
    .replace(language === "en" ? NOT_ENGLISH : NOT_ARABIC, "")
    .replace(RUNS_OF_SPACES, " ")
    .replace(RUNS_OF_HYPHENS, "-")
    .replace(LEADING, "");

/** "ali abdul - rahman" → "Ali Abdul-Rahman": hyphens closed up, each word capitalized. */
export const tidyEnglishName = (value: string) =>
  wordsInLine(value)
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

/** The words of a line, in order. */
export const wordsInLine = (value: string) =>
  value.trim().replace(AROUND_HYPHEN, "-").split(SPACES).filter(Boolean);

/**
 * Which gaps between words are joined: gap i joins word i to word i + 1.
 * Without the person's own choices, «أبو» and «عبد» join the next word.
 */
export type Joins = ReadonlySet<number>;

const defaultJoins = (words: readonly string[], language: NameLanguage) => {
  const joins = new Set<number>();
  if (language === "ar") {
    words.forEach((word, i) => {
      if (ARABIC_JOINS.has(word) && i < words.length - 1 && !joins.has(i - 1)) {
        joins.add(i);
      }
    });
  }
  return joins;
};

/** The names a line holds, with its words joined at the given gaps. */
export const namesInLine = (
  value: string,
  language: NameLanguage,
  joins?: Joins
) => {
  const words = wordsInLine(value);
  const joined = joins ?? defaultJoins(words, language);
  const names: string[] = [];
  words.forEach((word, i) => {
    if (i > 0 && joined.has(i - 1)) {
      names[names.length - 1] = `${names.at(-1)} ${word}`;
    } else {
      names.push(word);
    }
  });
  return names;
};

const capitalized = (word: string) =>
  word
    .split("-")
    .every((piece) => piece.charAt(0) === piece.charAt(0).toUpperCase());

/**
 * What is wrong with a line of four names, or null: letters only (no
 * digits or symbols), each English word capitalized, and exactly four
 * names, too few or too many (join the words of a two-word name).
 */
export const lineProblem = (
  value: string,
  language: NameLanguage,
  joins?: Joins
): "count" | "tooMany" | "letters" | "capitals" | null => {
  const words = wordsInLine(value);
  if (language === "en") {
    if (!words.every((word) => LATIN_WORD.test(word))) {
      return "letters";
    }
    if (!words.every(capitalized)) {
      return "capitals";
    }
  } else if (!words.every((word) => ARABIC_WORD.test(word))) {
    return "letters";
  }
  const count = namesInLine(value, language, joins).length;
  if (count === nameParts.length) {
    return null;
  }
  return count > nameParts.length ? "tooMany" : "count";
};

/** The four parts of a line that has no problem. */
export const partsFromLine = (
  value: string,
  language: NameLanguage,
  joins?: Joins
): NameParts => {
  const [first = "", father = "", grandfather = "", last = ""] = namesInLine(
    value,
    language,
    joins
  );
  return { father, first, grandfather, last };
};

/**
 * The person's own taps, kept by the two words around each gap, so a tap
 * stays with its words as the rest of the line is typed.
 */
export type JoinChoices = ReadonlyMap<string, boolean>;

export const gapKey = (words: readonly string[], gap: number) =>
  // Whatever the capitals: English is capitalized when the field is left.
  `${gap}:${words[gap]?.toLowerCase()}|${words[gap + 1]?.toLowerCase()}`;

/** The joins in effect: the person's taps over the defaults. */
export const joinsFor = (
  value: string,
  language: NameLanguage,
  choices: JoinChoices
): Set<number> => {
  const words = wordsInLine(value);
  const joins = defaultJoins(words, language);
  for (let gap = 0; gap < words.length - 1; gap += 1) {
    const chosen = choices.get(gapKey(words, gap));
    if (chosen === true) {
      joins.add(gap);
    } else if (chosen === false) {
      joins.delete(gap);
    }
  }
  return joins;
};

/**
 * Whether a line still fits four names: a fifth can't be started, except
 * after «أبو» or «عبد», which join the word that follows.
 */
export const roomForNames = (
  value: string,
  language: NameLanguage,
  choices: JoinChoices
) => {
  const count = namesInLine(
    value,
    language,
    joinsFor(value, language, choices)
  ).length;
  if (count < 4) {
    return true;
  }
  if (count > 4) {
    return false;
  }
  const words = wordsInLine(value);
  const last = words.at(-1) ?? "";
  return (
    !TRAILING_SPACE.test(value) || (language === "ar" && ARABIC_JOINS.has(last))
  );
};
