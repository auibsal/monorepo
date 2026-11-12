import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { personasSql } from "./fixtures";
import { hasPermission, hasPermissionAnywhere, scopesFor } from "./grants";
import { permissions } from "./permissions";
import { roleKeys, roles } from "./roles";

const migrations = join(
  import.meta.dirname,
  "../../../..",
  "packages",
  "database",
  "supabase",
  "migrations"
);
// Every migration, in the order they run: reference data comes first, and
// later migrations add permissions, roles and grants, or retire them with a
// plain `delete from access.roles where key in (...)`, `delete from
// access.permissions where key in (...)` or `delete from
// access.role_permissions where role = '...' and permission = '...'`. A
// renamed permission moves its grants with `update access.role_permissions
// set permission = 'new' where permission = 'old'`.
const sql = readdirSync(migrations)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(join(migrations, f), "utf8"))
  .join("\n");

/** Every `insert into <table> (...) values ...;` statement: body and place. */
const insertsAt = (table: string) =>
  [
    ...sql.matchAll(
      new RegExp(
        `insert into ${table} \\([^)]*\\)\\s*(?:values|select)([\\s\\S]*?);\\n`,
        "gu"
      )
    ),
  ].map((m) => ({ at: m.index ?? 0, body: m[1] ?? "" }));
/** The bodies of every `insert into <table> (...) values ...;` statement. */
const inserts = (table: string) => insertsAt(table).map((i) => i.body);
/** A role row or grant written before the role was last retired is gone. */
const retiredAfter = (role: string, at: number) =>
  (roleRetiredAt.get(role) ?? -1) > at;

/** Where each role was last retired: a role brought back later (the
 * Directors of Partnerships and Membership, Nov 7, 2026) counts again, with
 * only the grants made after its return. */
const roleRetiredAt = new Map<string, number>();
for (const m of sql.matchAll(
  /delete from access\.roles where key in \(([^)]*)\)/gu
)) {
  for (const k of (m[1] ?? "").matchAll(/'([a-z_]+)'/gu)) {
    roleRetiredAt.set(k[1] ?? "", m.index ?? 0);
  }
}
const retiredPermissions = new Set(
  [
    ...sql.matchAll(
      /delete from access\.permissions where key in \(([^)]*)\)/gu
    ),
  ].flatMap((m) =>
    [...(m[1] ?? "").matchAll(/'([a-z_.]+)'/gu)].map((k) => k[1] ?? "")
  )
);
/** Old key to new, from the migrations that renamed a permission. */
const renamed = new Map(
  [
    ...sql.matchAll(
      /update access\.role_permissions\s+set permission = '([a-z_.]+)'\s+where permission = '([a-z_.]+)'/gu
    ),
  ].map((m) => [m[2], m[1]])
);
const current = (key: string) => renamed.get(key) ?? key;
/** Old role key to new, from the migrations that renamed a role (the web
 * lead, Nov 13, 2026): its grants move with `update access.role_permissions
 * set role = 'new' where role = 'old'`. */
const renamedRoles = new Map(
  [
    ...sql.matchAll(
      /update access\.role_permissions set role = '([a-z_]+)' where role = '([a-z_]+)'/gu
    ),
  ].map((m) => [m[2], m[1]])
);
const currentRole = (key: string) => renamedRoles.get(key) ?? key;

const revokedGrants = new Set(
  [
    ...sql.matchAll(
      /delete from access\.role_permissions where role = '([a-z_]+)' and permission = '([a-z_.]+)'/gu
    ),
  ].map((m) => `${m[1]}:${m[2]}`)
);

// A role moved onto or off the Council later (the Editor-in-Chief, Nov 5,
// 2026): the last update wins over the insert.
const councilUpdates = new Map(
  [
    ...sql.matchAll(
      /update access\.roles\s+set is_council = (true|false)[^;]*?where key = '([a-z_]+)'/gu
    ),
  ].map((m) => [m[2], m[1]])
);

describe("mirror of the reference data in the migrations", () => {
  test("permission keys match", () => {
    const keys = inserts("access.permissions")
      .flatMap((body) =>
        [...body.matchAll(/\('([a-z_.]+)', '/gu)].map((m) =>
          current(m[1] ?? "")
        )
      )
      .filter((key) => !retiredPermissions.has(key));
    expect(keys.sort()).toEqual([...permissions].sort());
  });

  test("roles match", () => {
    // Older inserts carry the spending limit, dropped on Oct 30, 2026.
    const rows = insertsAt("access.roles").flatMap(({ at, body }) =>
      [
        ...body.matchAll(
          /\('([a-z_]+)', '[^']+', '[^']+', (true|false),(?: (?:null|\d+),)? \d+\)/gu
        ),
      ].map((m) => ({ at, m }))
    );
    const live = rows
      .filter(({ at, m }) => !retiredAfter(m[1] ?? "", at))
      .map(({ m }) => [m[0], currentRole(m[1] ?? ""), m[2]] as const);
    expect(live.map((m) => m[1]).sort()).toEqual([...roleKeys].sort());
    for (const [, key, council] of live) {
      const role = roles[key as keyof typeof roles];
      expect(role.isCouncil, key).toBe(
        (councilUpdates.get(key) ?? council) === "true"
      );
    }
  });

  test("role bundles match", () => {
    const fromSql = new Map<string, Set<string>>();
    const grant = (givenRole: string, given: string, at: number) => {
      const role = currentRole(givenRole);
      const permission = current(given);
      if (
        !(
          revokedGrants.has(`${role}:${permission}`) ||
          retiredPermissions.has(permission) ||
          retiredAfter(role, at)
        )
      ) {
        fromSql.set(role, (fromSql.get(role) ?? new Set()).add(permission));
      }
    };
    for (const { at, body } of insertsAt("access.role_permissions")) {
      // Bundles: ('role', array['a', 'b']).
      for (const [, role = "", list = ""] of body.matchAll(
        /\('([a-z_]+)', array\[([^\]]+)\]\)/gu
      )) {
        for (const [, permission = ""] of list.matchAll(/'([a-z_.]+)'/gu)) {
          grant(role, permission, at);
        }
      }
      // Single grants: ('role', 'permission').
      for (const [, role = "", permission = ""] of body.matchAll(
        /\('([a-z_]+)', '([a-z_.]+)'\)/gu
      )) {
        grant(role, permission, at);
      }
    }
    for (const key of roleKeys) {
      expect([...roles[key].permissions].sort(), key).toEqual(
        [...(fromSql.get(key) ?? [])].sort()
      );
    }
  });

  test("the President has every permission but the checks on the President", () => {
    // Owner, Oct 15, 2026: concerns about the President go elsewhere
    // (F-21); Qirtas reads blind; the Elections Committee runs elections;
    // the Faculty Advisor countersigns certificates; a partner's own page is
    // its representatives' (they hold partners.manage anyway).
    const withheld = new Set([
      // Next Stop's guest ideas: the Director of Media, producer and host only.
      "media.guest_ideas",
      "partners.own",
      "partners.lead",
      "concerns.about_president",
      "journal.review",
      "journal.identity.view",
      "elections.manage",
      "certificates.countersign",
      // Qirtas's independence (decisions §1, audit Part A).
      "journal.manage",
      "journal.advise",
      "journal.decide",
      "journal.publish",
      "journal.edit.news",
      "journal.edit.letters",
      "journal.edit.gallery",
      "journal.edit.video",
      "journal.edit.voices",
      "journal.edit.games",
      "journal.approve",
      "journal.copy",
      "journal.frontpage",
      "journal.prize",
      "qalam.manage",
    ]);
    expect([...roles.president.permissions].sort()).toEqual(
      permissions.filter((p) => !withheld.has(p)).sort()
    );
  });

  test("only the Managing Editor sees identities (intake, decisions §5)", () => {
    const holders = roleKeys.filter((key) =>
      (roles[key].permissions as readonly string[]).includes(
        "journal.identity.view"
      )
    );
    expect(holders).toEqual(["managing_editor"]);
  });
});

describe("hasPermission mirror", () => {
  const grants = [
    { permission: "events.manage", scope_id: "p1", scope_type: "programme" },
    { permission: "audit.read", scope_id: null, scope_type: "global" },
  ];

  test("scoped grants cover only their scope", () => {
    expect(hasPermission(grants, "events.manage", "programme", "p1")).toBe(
      true
    );
    expect(hasPermission(grants, "events.manage", "programme", "p2")).toBe(
      false
    );
    expect(hasPermission(grants, "events.manage")).toBe(false);
    expect(hasPermissionAnywhere(grants, "events.manage")).toBe(true);
  });

  test("global grants cover every scope", () => {
    expect(hasPermission(grants, "audit.read", "issue", "i1")).toBe(true);
    expect(scopesFor(grants, "audit.read", "issue")).toBe("all");
    expect(scopesFor(grants, "events.manage", "programme")).toEqual(["p1"]);
  });

  test("no grants, no access", () => {
    expect(hasPermission(undefined, "roles.assign")).toBe(false);
  });
});

test("persona SQL quotes values", () => {
  expect(personasSql({ issue: "i" })).toContain(
    "'managing_editor', 'issue', 'i'"
  );
});
