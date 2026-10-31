import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("what happened", () => {
  test("every table with an activity trigger is described or left out on purpose", () => {
    const dir = join(
      import.meta.dirname,
      "..",
      "..",
      "..",
      "..",
      "packages",
      "database",
      "supabase",
      "migrations"
    );
    const sql = readdirSync(dir)
      .map((file) => readFileSync(join(dir, file), "utf8"))
      .join("\n");
    const dropped = new Set(
      [...sql.matchAll(/drop table ([a-z_]+\.[a-z_]+)/g)].map((m) => m[1])
    );
    const logged = [
      ...sql.matchAll(/log_activity after [a-z ,]+ on ([a-z_]+\.[a-z_]+)/g),
    ]
      .map((m) => m[1])
      .filter((table) => !dropped.has(table));
    const source = readFileSync(
      join(
        import.meta.dirname,
        "..",
        "..",
        "components",
        "nexus",
        "admin",
        "system",
        "activity.tsx"
      ),
      "utf8"
    );
    for (const table of new Set(logged)) {
      expect(source, table).toContain(`"${table}"`);
    }
  });
});
