import type { createAdminClient } from "@repo/database/admin";

type AdminClient = ReturnType<typeof createAdminClient>;
type Row = Record<string, boolean | number | string | null>;

/**
 * The open data (decisions.md, Frameworks followed: Governance and
 * openness): the Society's public numbers, dedicated to the public domain
 * (CC0), as JSON or CSV. Facts already public on the site only; nothing
 * about a person.
 */
export const DATASETS = [
  "society-numbers",
  "paper-numbers",
  "events",
  "days-marked",
] as const;
export type Dataset = (typeof DATASETS)[number];

export const isDataset = (name: string): name is Dataset =>
  (DATASETS as readonly string[]).includes(name);

const rowsOrNone = (data: unknown) =>
  Array.isArray(data) ? (data as Row[]) : [];

export const readDataset = async (
  admin: AdminClient,
  dataset: Dataset
): Promise<Row[]> => {
  const api = admin.schema("api");
  switch (dataset) {
    case "society-numbers":
      return rowsOrNone((await api.rpc("society_numbers")).data);
    case "paper-numbers":
      return rowsOrNone((await api.rpc("paper_numbers")).data);
    case "events":
      return rowsOrNone(
        (
          await api
            .from("events")
            .select("slug, title_en, title_ar, starts_at, ends_at")
            .eq("status", "published")
            .neq("entry", "invite")
            .order("starts_at")
        ).data
      );
    case "days-marked":
      return rowsOrNone(
        (
          await api
            .from("days_marked")
            .select(
              "key, name_en, name_ar, month, day, approx_en, approx_ar, set_by, tier"
            )
            .order("sort")
        ).data
      );
    default:
      return [];
  }
};

const QUOTE = /"/gu;
const NEEDS_QUOTES = /[",\n\r]/u;

const cell = (value: Row[string]) => {
  const text = value === null ? "" : String(value);
  return NEEDS_QUOTES.test(text) ? `"${text.replace(QUOTE, '""')}"` : text;
};

/** RFC 4180 CSV, with a header row. */
export const toCsv = (rows: readonly Row[]) => {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((c) => cell(row[c] ?? null)).join(",")),
  ].join("\r\n");
};
