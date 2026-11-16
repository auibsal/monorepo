/**
 * What your account sends the browser of the Diwan's own copy
 * (`diwan.admin`). The account's pages are client-rendered, so their layout
 * hands its messages to the browser on every page, sign-in included; the
 * Diwan's administration copy is more than half of `diwan` (112 of 208 KB in
 * English, 150 of 279 in Arabic) and the account uses only these parts of
 * it, through the shared kit (decisions.md, The site: performance). The
 * Diwan's own layout still sends all of it.
 *
 * `account-messages.test.ts` follows every import from the account's routes
 * and fails when one of them reads a part missing here.
 */
export const ACCOUNT_ADMIN_MESSAGES = [
  // The gate in admin-shell.tsx (RequireStaff and its "no access" screen).
  "noAccess",
  "noAccessGo",
  "noAccessTitle",
  "checkIn",
  "governance.bodies",
  "journal",
  "kit",
  "members",
  "partners.agreements.grants",
  "partners.register",
  "picker",
  "qirtas",
  "sections",
] as const;

type Tree = Record<string, unknown>;

const isTree = (value: unknown): value is Tree =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Only the given paths ("a.b") of a messages tree, each whole. */
export const pickMessages = (source: Tree, paths: readonly string[]): Tree => {
  const out: Tree = {};
  for (const path of paths) {
    const keys = path.split(".");
    let from: unknown = source;
    for (const key of keys) {
      from = isTree(from) ? from[key] : undefined;
    }
    if (from === undefined) {
      continue;
    }
    let into = out;
    for (const key of keys.slice(0, -1)) {
      const next = isTree(into[key]) ? (into[key] as Tree) : {};
      into[key] = next;
      into = next;
    }
    into[keys.at(-1) as string] = from;
  }
  return out;
};

/** The `diwan` messages your account sends: all but the Diwan's own copy. */
export const accountDiwanMessages = <T extends Tree>(diwan: T): Tree => {
  const { admin, ...rest } = diwan;
  return {
    ...rest,
    admin: isTree(admin) ? pickMessages(admin, ACCOUNT_ADMIN_MESSAGES) : {},
  };
};
