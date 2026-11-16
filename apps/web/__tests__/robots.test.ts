import { describe, expect, test } from "vitest";
import robots from "@/app/robots";

// The AI crawlers' lines are Cloudflare's managed robots.txt, put before
// these at the edge (docs/platform/settings.md, Cloudflare).
describe("robots.txt", () => {
  const rules = [robots().rules].flat();
  const forAgent = (agent: string) =>
    rules.find((rule) => [rule.userAgent].flat().includes(agent));

  test("search engines keep the site, all but the API", () => {
    const everyone = forAgent("*");
    expect(everyone?.allow).toContain("/");
    expect(everyone?.disallow).toEqual(["/api/"]);
    for (const engine of ["Googlebot", "Bingbot", "DuckDuckBot", "Applebot"]) {
      expect(forAgent(engine)).toBeUndefined();
    }
    expect(rules).toHaveLength(1);
  });
});
