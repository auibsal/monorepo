/**
 * Text with any markup taken out, for counting and previewing (never for
 * showing as HTML: React escapes what it renders). A character scan, not a
 * pattern, so nested or broken tags can't leave a fragment behind.
 */
export const withoutTags = (text: string) => {
  let out = "";
  let depth = 0;
  for (const char of text) {
    if (char === "<") {
      depth += 1;
    } else if (char === ">" && depth > 0) {
      depth -= 1;
      out += " ";
    } else if (depth === 0) {
      out += char;
    }
  }
  return out;
};
