import { describe, expect, it } from "vitest";
import { violationsIn, withoutQuery } from "./csp-report";

describe("Content Security Policy reports", () => {
  it("reads the Reporting API's array", () => {
    expect(
      violationsIn([
        {
          body: {
            blockedURL: "https://evil.example/x.js?token=secret",
            disposition: "enforce",
            documentURL: "https://auibsal.org/account?code=123",
            effectiveDirective: "script-src-elem",
            sourceFile: "https://auibsal.org/_next/a.js",
          },
          type: "csp-violation",
        },
        { body: {}, type: "deprecation" },
      ])
    ).toEqual([
      {
        blocked: "https://evil.example/x.js",
        directive: "script-src-elem",
        disposition: "enforce",
        page: "https://auibsal.org/account",
        source: "https://auibsal.org/_next/a.js",
      },
    ]);
  });

  it("reads the older report-uri body", () => {
    const [found] = violationsIn({
      "csp-report": {
        "blocked-uri": "inline",
        "document-uri": "https://auibsal.org/events",
        "effective-directive": "script-src",
      },
    });
    expect(found?.blocked).toBe("inline");
    expect(found?.directive).toBe("script-src");
  });

  it("keeps nothing from anything else", () => {
    expect(violationsIn(null)).toEqual([]);
    expect(violationsIn({ hello: 1 })).toEqual([]);
    expect(withoutQuery("x".repeat(500))).toHaveLength(100);
  });
});
