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
    // A renamed table (`alter table s.old rename to new`) is logged under
    // its new name.
    const renamed = new Map(
      [
        ...sql.matchAll(
          /alter table ([a-z_]+)\.([a-z_]+) rename to ([a-z_]+);/g
        ),
      ].map((m) => [`${m[1]}.${m[2]}`, `${m[1]}.${m[3]}`])
    );
    const logged = [
      ...sql.matchAll(/log_activity after [a-z ,]+ on ([a-z_]+\.[a-z_]+)/g),
    ]
      .map((m) => renamed.get(m[1]) ?? m[1])
      .filter((table) => !dropped.has(table));
    const source = readFileSync(
      join(
        import.meta.dirname,
        "..",
        "..",
        "components",
        "diwan",
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
