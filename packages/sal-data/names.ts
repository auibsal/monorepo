/**
 * A person's name in four parts, in English and in Arabic, as on their
 * papers (owner, Oct 31, 2026): their name, their father's, their
 * grandfather's, and the fourth (family or last) name. All eight are
 * required. Wherever a name shows (the register, the card, bylines), it
 * is the first and the fourth: the database keeps `full_name_en` and
 * `full_name_ar` in step with the parts (`private.tidy_names`).
 */
export const nameParts = ["first", "father", "grandfather", "last"] as const;

export type NamePart = (typeof nameParts)[number];
export type NameLanguage = "en" | "ar";
export type NameParts = Record<NamePart, string>;
export type FourPartNames = Record<NameLanguage, NameParts>;

/** The profile column for a part: first_name_en, father_name_ar … */
export const nameColumn = (part: NamePart, language: NameLanguage) =>
  `${part}_name_${language}` as const;

export type NameColumn = ReturnType<typeof nameColumn>;

export const nameColumns = (["en", "ar"] as const).flatMap((language) =>
  nameParts.map((part) => nameColumn(part, language))
);

/** The columns to select with a profile, comma-separated. */
export const nameSelect = nameColumns.join(", ");

export const emptyParts = (): NameParts => ({
  father: "",
  first: "",
  grandfather: "",
  last: "",
});

export const partsComplete = (parts: NameParts) =>
  nameParts.every((part) => parts[part].trim() !== "");

/** The name as shown: the first and the fourth. */
export const displayName = (parts: NameParts) =>
  [parts.first.trim(), parts.last.trim()].filter(Boolean).join(" ");

type ProfileNames = Partial<Record<NameColumn, string | null>> & {
  full_name_ar?: string | null;
  full_name_en?: string | null;
};

const WHITESPACE = /\s+/;

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

/** All eight parts are given. */
export const hasFourPartNames = (profile: ProfileNames | null | undefined) =>
  (["en", "ar"] as const).every((language) =>
    nameParts.every(
      (part) => (profile?.[nameColumn(part, language)] ?? "").trim() !== ""
    )
  );

/** The update that saves one language's parts. */
export const partsUpdate = (parts: NameParts, language: NameLanguage) =>
  Object.fromEntries(
    nameParts.map((part) => [nameColumn(part, language), parts[part].trim()])
  ) as Partial<Record<NameColumn, string>>;
