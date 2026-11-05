import { sanitizeRichText } from "@repo/sal-data";

/** Submitted rich text, sanitized again on the way out. */
export const TextView = ({
  html,
  lang,
}: {
  html: string | null;
  lang?: string;
}) =>
  html ? (
    <div
      className="prose max-w-none border-line border-t p-4"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized with the one rich-text policy
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }}
      lang={lang}
    />
  ) : null;
