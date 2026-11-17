import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * decisions.md, The site: "Addresses are generated, readable and
 * permanent": lowercase words joined by hyphens, query keys in lowercase,
 * no trailing slash, no tracking parameters. This fails on a route folder
 * or a link written in the code that breaks the pattern.
 */
const root = join(import.meta.dirname, "..", "..");
const WORD = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
// Files served at their own names, and the folder the web's own standards
// fix (security.txt lives under /.well-known).
const FILE_ROUTES = new Set([
  ".well-known",
  "calendar.ics",
  "feed.xml",
  "sal.ics",
]);

const folders = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? [path, ...folders(path)] : [];
  });

const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return name === "node_modules" || name.startsWith(".")
        ? []
        : sources(path);
    }
    return /\.tsx?$/u.test(name) && !/\.test\.tsx?$/u.test(name) ? [path] : [];
  });

// A path written as a link: href="/…", href={`/…`} or a Link's "/…".
const LINK = /\bhref=(?:"(\/[^"]*)"|\{`(\/[^`$]*)`\})/gu;
const TRACKING = /[?&](?:utm_[a-z]+|fbclid|gclid)=/u;

const problem = (path: string) => {
  const [pathname = "", query = ""] = path.split("?");
  const bare = pathname.split("#")[0] ?? "";
  if (bare.length > 1 && bare.endsWith("/")) {
    return "trailing slash";
  }
  for (const part of bare.split("/").filter(Boolean)) {
    if (!(WORD.test(part) || part.startsWith(":") || part.includes("."))) {
      return `"${part}" isn't lowercase words and hyphens`;
    }
  }
  if (TRACKING.test(path)) {
    return "a tracking parameter";
  }
  for (const pair of query.split("&").filter(Boolean)) {
    const key = pair.split("=")[0] ?? "";
    if (key !== key.toLowerCase()) {
      return `query key "${key}" isn't lowercase`;
    }
  }
  return null;
};

describe("addresses follow the one pattern", () => {
  it("names every route folder in lowercase words and hyphens", () => {
    const wrong = folders(join(root, "app"))
      .map((path) => relative(join(root, "app"), path).split("/").pop() ?? "")
      .filter(
        (name) =>
          !(
            WORD.test(name) ||
            FILE_ROUTES.has(name) ||
            name.startsWith("[") ||
            name.startsWith("(") ||
            name.startsWith("_")
          )
      );
    expect(wrong).toEqual([]);
  });

  it("writes every link in the code to the pattern", () => {
    const wrong: string[] = [];
    for (const file of [
      ...sources(join(root, "app")),
      ...sources(join(root, "components")),
    ]) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(LINK)) {
        const path = match[1] ?? match[2] ?? "";
        const reason = problem(path);
        if (reason) {
          wrong.push(`${relative(root, file)}: ${path} (${reason})`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });
});
