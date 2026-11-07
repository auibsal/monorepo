const SLUG_TRIM = /^-+|-+$/g;
const NOT_SLUG = /[^a-z0-9]+/g;

/** "The Return 2026" → "the-return-2026". */
export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(NOT_SLUG, "-")
    .replace(SLUG_TRIM, "")
    .slice(0, 80);
