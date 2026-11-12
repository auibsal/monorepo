import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  type FormDefinition,
  formKeys,
  formProblems,
  forms,
  legacyNumbers,
  nameFromLegacyNumber,
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
// The names that replaced the F-numbers (decisions.md, Documents and forms).
const names = read("20261113003700_agreement_names.sql");
describe("forms", () => {
  test("every kind here is named in the database, by the one mapping", () => {
    const named = new Map(
      [...names.matchAll(/\('(f\d{2})', '([a-z0-9-]+)'\)/gu)].map((m) => [
        `F-${(m[1] ?? "").slice(1)}`,
        m[2] ?? "",
      ])
    );
    expect(Object.fromEntries(named)).toEqual(legacyNumbers);
    for (const key of formKeys) {
      expect(Object.values(legacyNumbers)).toContain(key);
    }
  });

  test("only a concern is anonymous or routed", () => {
    const anonymous = formKeys.filter((key) => forms[key].anonymous);
    expect(anonymous).toEqual(["concern"]);
    expect(formKeys.filter((key) => forms[key].routing)).toEqual(["concern"]);
  });

  test("an old number still resolves to its name", () => {
    expect(nameFromLegacyNumber("F-45")).toBe("trip-consent");
    expect(nameFromLegacyNumber("f06")).toBe(
      "conflict-of-interest-declaration"
    );
    expect(nameFromLegacyNumber("6")).toBe("conflict-of-interest-declaration");
    expect(nameFromLegacyNumber("F-44")).toBeNull();
  });

  test("required fields, lengths, ranges and choices are checked", () => {
    const f10 = forms["members-meeting-motion"];
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
    expect(formProblems(forms["trip-consent"], {})).toContain("agree");
  });

  test("table rows need their required columns", () => {
    const def: FormDefinition = {
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
      key: "members-meeting-motion",
    };
    expect(formProblems(def, { items: [] })).toEqual(["items"]);
    expect(
      formProblems(def, { items: [{ date: "2026-10-01", item: "Tea" }] })
    ).toEqual([]);
    expect(formProblems(def, { items: [{ item: "Tea" }] })).toEqual(["items"]);
  });
});
