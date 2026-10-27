import { describe, expect, test } from "vitest";
import {
  embedHeight,
  passCardUrl,
  passEmbedUrl,
} from "@/lib/nexus/pass-enabled";

describe("the live Pass card", () => {
  test("lives on The IDEA's site, in the page's language", () => {
    expect(passCardUrl("en")).toBe("https://theideaiq.com/pass");
    expect(passCardUrl("ar")).toBe("https://theideaiq.com/ar/pass");
    expect(passEmbedUrl("ar", "sal app")).toBe(
      "https://theideaiq.com/ar/pass/embed?client_id=sal%20app"
    );
  });

  test("takes its height only from The IDEA's embed", () => {
    const from = (origin: string, data: unknown) => ({ data, origin });
    expect(
      embedHeight(
        from("https://theideaiq.com", { height: 412.4, type: "idea-pass-card" })
      )
    ).toBe(412);
    expect(
      embedHeight(
        from("https://evil.example", { height: 400, type: "idea-pass-card" })
      )
    ).toBeNull();
    expect(
      embedHeight(from("https://theideaiq.com", { height: 400 }))
    ).toBeNull();
    expect(
      embedHeight(
        from("https://theideaiq.com", { height: "400", type: "idea-pass-card" })
      )
    ).toBeNull();
    expect(
      embedHeight(
        from("https://theideaiq.com", {
          height: 99_999,
          type: "idea-pass-card",
        })
      )
    ).toBe(1200);
    expect(embedHeight(from("https://theideaiq.com", null))).toBeNull();
  });
});
