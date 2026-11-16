import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import en from "@repo/internationalization/messages/en.json";
import { describe, expect, it } from "vitest";
import {
  ACCOUNT_ADMIN_MESSAGES,
  accountDiwanMessages,
  pickMessages,
} from "./account-messages";

const WEB = path.resolve(import.meta.dirname, "../..");
const BRAND = path.resolve(WEB, "../../packages/brand");
const ACCOUNT = path.join(WEB, "app/[locale]/(account)");

const IMPORT =
  /(?:import|export)\s[^'"]*?from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/gu;
const ADMIN_LITERAL = /["'`]diwan\.admin\.([A-Za-z0-9_.]+)["'`]/gu;
const BARE_ADMIN = /useTranslations\(\s*["']diwan\.admin["']\s*\)/u;
const ROOT_KEY = /\bt\(\s*["']([A-Za-z0-9_.]+)["']/gu;
const SOURCE = /\.(tsx?)$/u;

const resolve = (from: string, spec: string) => {
  let base: string | null = null;
  if (spec.startsWith("@/")) {
    base = path.join(WEB, spec.slice(2));
  } else if (spec.startsWith("@repo/brand/")) {
    base = path.join(BRAND, spec.slice("@repo/brand/".length));
  } else if (spec.startsWith(".")) {
    base = path.resolve(path.dirname(from), spec);
  }
  if (!base) {
    return null;
  }
  const found = [
    base,
    `${base}.tsx`,
    `${base}.ts`,
    path.join(base, "index.tsx"),
    path.join(base, "index.ts"),
  ].find((file) => existsSync(file) && statSync(file).isFile());
  return found ?? null;
};

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      return walk(full);
    }
    return SOURCE.test(name) ? [full] : [];
  });

/** Every source file the account's routes reach through their imports. */
const reachable = () => {
  const seen = new Set<string>();
  const stack = walk(ACCOUNT);
  while (stack.length > 0) {
    const file = stack.pop() as string;
    if (seen.has(file)) {
      continue;
    }
    seen.add(file);
    for (const match of readFileSync(file, "utf8").matchAll(IMPORT)) {
      const next = resolve(file, match[1] ?? match[2] ?? "");
      if (next && !seen.has(next)) {
        stack.push(next);
      }
    }
  }
  return [...seen];
};

const ADMIN = en.diwan.admin as Record<string, unknown>;

const covered = (key: string) =>
  ACCOUNT_ADMIN_MESSAGES.some(
    (kept) => key === kept || key.startsWith(`${kept}.`)
  );

describe("your account's share of the Diwan's copy", () => {
  it("keeps every part of diwan.admin the account's pages read", () => {
    const missing = new Set<string>();
    for (const file of reachable()) {
      const source = readFileSync(file, "utf8");
      for (const [, key] of source.matchAll(ADMIN_LITERAL)) {
        if (!covered(key as string)) {
          missing.add(`${path.relative(WEB, file)}: diwan.admin.${key}`);
        }
      }
      // A component that reads diwan.admin itself names its keys plainly
      // (keys of the file's other namespaces are not diwan.admin's).
      if (BARE_ADMIN.test(source)) {
        for (const [, key] of source.matchAll(ROOT_KEY)) {
          const isAdminKey =
            Object.keys(pickMessages(ADMIN, [key as string])).length > 0;
          if (isAdminKey && !covered(key as string)) {
            missing.add(`${path.relative(WEB, file)}: diwan.admin.${key}`);
          }
        }
      }
    }
    expect([...missing]).toEqual([]);
  });

  it("names only parts that exist", () => {
    for (const kept of ACCOUNT_ADMIN_MESSAGES) {
      expect(
        Object.keys(pickMessages(ADMIN, [kept])),
        `diwan.admin.${kept}`
      ).toHaveLength(1);
    }
  });

  it("sends the rest of diwan whole, and far less of the admin copy", () => {
    const sent = accountDiwanMessages(en.diwan as Record<string, unknown>);
    const { admin: _admin, ...rest } = en.diwan;
    for (const key of Object.keys(rest)) {
      expect(sent[key]).toEqual(rest[key as keyof typeof rest]);
    }
    const size = (value: unknown) => JSON.stringify(value).length;
    expect(size(sent.admin)).toBeLessThan(size(en.diwan.admin) / 3);
  });
});
