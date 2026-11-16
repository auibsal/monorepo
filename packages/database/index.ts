/**
 * Database types, safe to import from client and server code. The privileged
 * client lives in `@repo/database/admin` (server-only).
 */
import type { Database as Generated } from "./types";

export {
  Constants,
  type Enums,
  type Json,
  type Tables,
  type TablesInsert,
  type TablesUpdate,
} from "./types";

/**
 * The schemas that hold the data. None is exposed: the Data API serves only
 * `api`, their views and wrappers (migration 20261116001300_api_schema.sql).
 */
export const schemas = [
  "core",
  "access",
  "membership",
  "events",
  "journal",
  "programs",
  "governance",
  "content",
] as const;

export type Schema = (typeof schemas)[number];

/** A name used in two schemas: in `api`, each takes its schema as a prefix. */
type Clashing = "invitations";

type Part<
  K extends "Tables" | "Views" | "Functions" | "Enums" | "CompositeTypes",
> = Omit<Generated["core"][K], Clashing> &
  Omit<Generated["access"][K], Clashing> &
  Omit<Generated["membership"][K], Clashing> &
  Omit<Generated["events"][K], Clashing> &
  Omit<Generated["journal"][K], Clashing> &
  Omit<Generated["programs"][K], Clashing> &
  Omit<Generated["governance"][K], Clashing> &
  Omit<Generated["content"][K], Clashing>;

/**
 * The `api` schema's types, from the data schemas' own: each view has its
 * table's columns, nullability included (generated view types would make
 * every column nullable), and each wrapper its function's arguments.
 */
export interface Api {
  CompositeTypes: Part<"CompositeTypes">;
  Enums: Part<"Enums">;
  Functions: Part<"Functions">;
  Tables: Part<"Tables"> & {
    blind_entries_all: Generated["journal"]["Tables"]["blind_entries"];
    contributors_all: Generated["journal"]["Tables"]["contributors"];
    events_invitations: Generated["events"]["Tables"]["invitations"];
    membership_invitations: Generated["membership"]["Tables"]["invitations"];
    newsletter_subscribers_all: Generated["content"]["Tables"]["newsletter_subscribers"];
    profiles_all: Generated["core"]["Tables"]["profiles"];
    recovery_codes_all: Generated["access"]["Tables"]["recovery_codes"];
    student_life_weeks_all: Generated["events"]["Tables"]["student_life_weeks"];
    sunday_paper_issues_all: Generated["content"]["Tables"]["sunday_paper_issues"];
    telegram_groups_all: Generated["core"]["Tables"]["telegram_groups"];
  };
  Views: Part<"Views">;
}

export type Database = Generated & { api: Api };

/** A table's name in `api` (the same rule as private.api_name). */
export const apiName = (schema: Schema, table: string) =>
  table === "invitations" ? `${schema}_${table}` : table;

/**
 * The tables some clients may read only in part (column grants): their
 * `api` view holds what clients may read, and `<name>_all` every column,
 * for the server's secret key only. 99_api_schema.test.sql checks this
 * list against the database.
 */
export const partlyRead = [
  "blind_entries",
  "contributors",
  "newsletter_subscribers",
  "profiles",
  "recovery_codes",
  "student_life_weeks",
  "sunday_paper_issues",
  "telegram_groups",
] as const;

/** A table's name in `api` for the server: every column. */
export const serverName = (schema: Schema, table: string) =>
  (partlyRead as readonly string[]).includes(table)
    ? `${apiName(schema, table)}_all`
    : apiName(schema, table);
