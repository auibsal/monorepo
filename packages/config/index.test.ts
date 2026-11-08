import { describe, expect, test } from "vitest";
import { project } from "./index";

describe("project config", () => {
  test("parses and keeps the default locale enabled", () => {
    expect(project.locale.enabled).toContain(project.locale.default);
  });

  test("serves SAL from auibsal.org with English and Arabic", () => {
    expect(project.domain).toBe("auibsal.org");
    expect(project.url).toBe("https://auibsal.org");
    expect(project.paths.diwan).toBe("/diwan");
    expect(project.paths.api).toBe("/api");
    expect([...project.locale.enabled].sort()).toEqual(["ar", "en"]);
  });

  test("defaults to Iraq regional settings", () => {
    expect(project.region.timeZone).toBe("Asia/Baghdad");
    expect(project.region.currency).toBe("IQD");
  });

  test("names the Society's address and repository", () => {
    expect(project.supportEmail).toBe("hello@auibsal.org");
    expect(project.repoUrl).toBe("https://github.com/auibsal/monorepo");
  });
});
