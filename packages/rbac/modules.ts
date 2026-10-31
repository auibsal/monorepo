import type { Permission } from "./permissions";

/**
 * The Diwan's modules and the permission (held in any scope) that shows
 * each one. Pages still scope their rows by program, issue or campaign.
 */
export const adminModules = [
  {
    key: "members",
    permissions: ["members.verify", "members.manage", "roles.assign"],
  },
  { key: "events", permissions: ["events.manage", "events.checkin"] },
  // Qirtas: the newsroom (desk pieces, edited with the author) and the blind
  // review of Edition submissions, in one section.
  {
    key: "journal",
    permissions: [
      "journal.manage",
      "journal.review",
      "journal.identity.view",
      "journal.decide",
      "journal.advise",
      "journal.publish",
      "journal.approve",
      "journal.copy",
      "journal.frontpage",
      "journal.edit.news",
      "journal.edit.letters",
      "journal.edit.gallery",
      "journal.edit.video",
      "journal.edit.voices",
      "journal.edit.games",
      "journal.prizes",
    ],
  },
  // Waraq's ads: Society ads (content) and sponsor ads (partnerships).
  { key: "ads", permissions: ["content.manage", "partners.manage"] },
  {
    key: "charity",
    permissions: [
      "charity.manage",
      "charity.ledger.write",
      "charity.ledger.signoff",
    ],
  },
  { key: "programs", permissions: ["programmes.manage"] },
  // Hiring (owner, Oct 30, 2026): Membership runs every role's applications;
  // each owner (a program, the Editor, a director) picks for their own.
  {
    key: "hiring",
    permissions: [
      "members.manage",
      "programmes.manage",
      "journal.manage",
      "content.manage",
      "partners.manage",
      "governance.manage",
    ],
  },
  { key: "productions", permissions: ["productions.manage"] },
  { key: "partners", permissions: ["partners.manage", "partners.sign"] },
  {
    key: "recognition",
    permissions: [
      "certificates.prepare",
      "certificates.sign",
      "certificates.countersign",
      "members.manage",
      "programmes.manage",
    ],
  },
  {
    key: "governance",
    permissions: [
      "governance.manage",
      "governance.minutes.write",
      "elections.manage",
    ],
  },
  { key: "library", permissions: ["governance.manage"] },
  {
    key: "forms",
    permissions: [
      "members.manage",
      "programmes.manage",
      "events.manage",
      "content.manage",
      "governance.manage",
      "concerns.handle",
    ],
  },
  { key: "activity", permissions: ["audit.read"] },
] as const satisfies readonly {
  key: string;
  permissions: readonly Permission[];
}[];

export type AdminModule = (typeof adminModules)[number]["key"];

/**
 * The Diwan's six sections (the overhaul, Oct 30, 2026), in one row like
 * the members' pages. A section shows when any of its modules does; the
 * Desk shows for every officer.
 */
export const adminSections = [
  { key: "desk", modules: ["activity"], path: "/" },
  {
    key: "events",
    modules: ["events", "programs", "charity"],
    path: "/events",
  },
  { key: "qirtas", modules: ["journal", "ads"], path: "/qirtas" },
  { key: "company", modules: ["productions"], path: "/company" },
  {
    key: "people",
    modules: ["members", "hiring", "recognition", "partners"],
    path: "/people",
  },
  {
    key: "society",
    modules: ["governance", "library", "forms"],
    path: "/society",
  },
] as const satisfies readonly {
  key: string;
  modules: readonly AdminModule[];
  path: string;
}[];

export type AdminSection = (typeof adminSections)[number]["key"];

/** The section a Diwan path belongs to: /people/hiring → people. */
export const sectionOfPath = (pathname: string): AdminSection => {
  const path = pathname.split("?")[0] ?? pathname;
  const found = adminSections.find(
    (section) =>
      section.path !== "/" &&
      (path === section.path || path.startsWith(`${section.path}/`))
  );
  return found?.key ?? "desk";
};
