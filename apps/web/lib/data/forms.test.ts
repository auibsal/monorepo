import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  type FormDefinition,
  formKeys,
  formProblems,
  forms,
  keyFromNumber,
} from "./forms";

const read = (name: string) =>
  readFileSync(
    join(
      import.meta.dirname,
      "../../../../packages/database/supabase/migrations",
      name
    ),
    "utf8"
  );
// The forms register of Nov 7, 2026: the forms signed on the site.
const migration = read("20261107000300_forms_and_guests.sql");
// Nov 11 (decisions.md, Documents and forms): F-44 taken down, F-46 (a parent's consent) added.
const accounts = read("20261111000000_accounts_and_privacy.sql");
describe("forms", () => {
  test("every form here is in the database registry, and only those", () => {
    const registered = [
      ...migration.matchAll(
        /\('(f\d{2})', 'F-\d{2}', '[^']+', '[^']+', 'site'/gu
      ),
      ...accounts.matchAll(/values \('(f\d{2})', 'F-\d{2}'/gu),
    ]
      .map((m) => m[1])
      .filter((key) => !accounts.includes(`where key = '${key}';`));
    expect(registered.sort()).toEqual([...formKeys].sort());
  });

  test("anonymous and routed forms match the registry (F-21 only)", () => {
    const anonymous = formKeys.filter((key) => forms[key].anonymous);
    expect(anonymous).toEqual(["f21"]);
    expect(formKeys.filter((key) => forms[key].routing)).toEqual(["f21"]);
  });

  test("a form's address is its number", () => {
    expect(keyFromNumber("F-45")).toBe("f45");
    expect(keyFromNumber("f06")).toBe("f06");
    expect(keyFromNumber("6")).toBe("f06");
  });

  test("required fields, lengths, ranges and choices are checked", () => {
    const { f10 } = forms;
    expect(formProblems(f10, {})).toContain("title");
    const ok = {
      believes: "b",
      motion_type: "ordinary",
      notes: "n",
      resolves: "r",
      seconder: "s",
      title: "t",
    };
    expect(formProblems(f10, ok)).toEqual([]);
    expect(formProblems(f10, { ...ok, motion_type: "other" })).toEqual([
      "motion_type",
    ]);
    expect(formProblems(f10, { ...ok, title: "x".repeat(201) })).toEqual([
      "title",
    ]);
    expect(formProblems(forms.f45, {})).toContain("agree");
  });

  test("table rows need their required columns", () => {
    const def: FormDefinition = {
      code: "F-00",
      fields: [
        {
          columns: [
            { key: "date", required: true, type: "date" },
            { key: "item", required: true, type: "text" },
          ],
          key: "items",
          max: 30,
          required: true,
          type: "table",
        },
      ],
      key: "f10",
    };
    expect(formProblems(def, { items: [] })).toEqual(["items"]);
    expect(
      formProblems(def, { items: [{ date: "2026-10-01", item: "Tea" }] })
    ).toEqual([]);
    expect(formProblems(def, { items: [{ item: "Tea" }] })).toEqual(["items"]);
  });
});
