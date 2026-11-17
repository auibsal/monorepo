import { describe, expect, test } from "vitest";
import { versionPreview } from "./versions";

describe("an earlier version's preview", () => {
  test("the page's language first, without markup", () => {
    const fields = {
      body_ar: "<p>نص</p>",
      body_en: "<p>The <em>first</em> words.</p>",
    };
    expect(versionPreview(fields, "en")).toBe("The first words.");
    expect(versionPreview(fields, "ar")).toBe("نص");
  });
  test("the other language when the page's is empty", () => {
    expect(versionPreview({ summary_ar: "ملخص", summary_en: null }, "en")).toBe(
      "ملخص"
    );
  });
  test("long text is cut with an ellipsis", () => {
    const preview = versionPreview({ body_en: "a".repeat(300) }, "en");
    expect(preview).toHaveLength(201);
    expect(preview.endsWith("…")).toBe(true);
  });
});
