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

/** The parts a legal name needs; the family name is only where there is one. */
export const requiredParts: readonly NamePart[] = [
  "first",
  "father",
  "grandfather",
];

export const partsComplete = (parts: NameParts) =>
  requiredParts.every((part) => parts[part].trim() !== "");

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

/** The legal name is complete in both languages. */
export const hasFourPartNames = (profile: ProfileNames | null | undefined) =>
  (["en", "ar"] as const).every((language) =>
    requiredParts.every(
      (part) => (profile?.[nameColumn(part, language)] ?? "").trim() !== ""
    )
  );

/** The update that saves one language's parts. */
export const partsUpdate = (parts: NameParts, language: NameLanguage) =>
  Object.fromEntries(
    nameParts.map((part) => [
      nameColumn(part, language),
      parts[part].trim() || null,
    ])
  ) as Partial<Record<NameColumn, string | null>>;

/** Complete and in its language's letters: ready to save. */
export const partsReady = (parts: NameParts, language: NameLanguage) =>
  partsComplete(parts) && partsInScript(parts, language);
