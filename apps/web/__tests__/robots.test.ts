import { describe, expect, test } from "vitest";
import robots from "@/app/robots";

describe("robots.txt (decisions.md, The site: AI crawlers are blocked)", () => {
  const rules = [robots().rules].flat();
  const forAgent = (agent: string) =>
    rules.find((rule) => [rule.userAgent].flat().includes(agent));

  test("the AI training crawlers are disallowed everywhere", () => {
    for (const bot of [
      "GPTBot",
      "ClaudeBot",
      "Google-Extended",
      "CCBot",
      "PerplexityBot",
      "Applebot-Extended",
      "Bytespider",
      "meta-externalagent",
    ]) {
      expect(forAgent(bot)?.disallow).toEqual(["/"]);
    }
  });

  test("search engines keep the site, all but the API", () => {
    const everyone = forAgent("*");
    expect(everyone?.allow).toContain("/");
    expect(everyone?.disallow).toEqual(["/api/"]);
    for (const engine of ["Googlebot", "Bingbot", "DuckDuckBot", "Applebot"]) {
      expect(forAgent(engine)).toBeUndefined();
    }
  });
});
