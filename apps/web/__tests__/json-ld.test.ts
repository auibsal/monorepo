import { describe, expect, it } from "vitest";
import { articleLd } from "@/lib/json-ld";

describe("a Qirtas piece's structured data", () => {
  const base = {
    path: "/qirtas/news/first",
    publishedAt: "2026-11-01T09:00:00Z",
    title: "First",
  };

  it("is a NewsArticle in News, with when it last changed", () => {
    expect(
      articleLd("en", {
        ...base,
        author: "Lina Hassan",
        modifiedAt: "2026-11-02T09:00:00Z",
        news: true,
      })
    ).toMatchObject({
      "@type": "NewsArticle",
      author: { "@type": "Person", name: "Lina Hassan" },
      dateModified: "2026-11-02T09:00:00Z",
      datePublished: "2026-11-01T09:00:00Z",
    });
  });

  it("names the Society for an anonymous byline, never a person", () => {
    const ld = articleLd("en", {
      ...base,
      anonymous: true,
      author: "Anonymous",
    });
    expect(ld["@type"]).toBe("Article");
    expect(ld.author).toEqual({ "@id": "https://auibsal.org/#organization" });
  });
});
