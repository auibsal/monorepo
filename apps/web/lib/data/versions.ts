const PREVIEW = 200;
const TAG = /<[^>]+>/gu;
const SPACES = /\s+/gu;

/**
 * The opening words of a record's earlier version (decisions.md, The site:
 * "History"): its text in the page's language first, then the other, with
 * any markup taken out, cut at 200 characters.
 */
export const versionPreview = (
  fields: Record<string, unknown>,
  locale: string
) => {
  const values = Object.entries(fields)
    .sort(
      ([a], [b]) =>
        Number(b.endsWith(`_${locale}`)) - Number(a.endsWith(`_${locale}`))
    )
    .map(([, value]) => (typeof value === "string" ? value : ""))
    .filter(Boolean);
  const text = (values[0] ?? "").replace(TAG, " ").replace(SPACES, " ").trim();
  return text.length > PREVIEW ? `${text.slice(0, PREVIEW)}…` : text;
};
