import type { Permission } from "./permissions";

/**
 * The Diwan's modules and the permission (held in any scope) that shows
 * each one. Pages still scope their rows by event, Edition or production.
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
      "journal.prize",
    ],
  },

  { key: "programs", permissions: ["programs.manage"] },
  // The Typewriter Tour belongs to membership (owner, Nov 5, 2026): the
  // General Secretary and the Tour Lead.
  { key: "tour", permissions: ["tour.run"] },
  // Qalam, Qirtas's summer program (owner, Nov 7, 2026): its roster lives
  // in the staff area, never in Notion.
  { key: "qalam", permissions: ["qalam.manage"] },
  // Hiring (owner, Oct 30, 2026): the General Secretary runs every role's
  // applications; each owner (the President for event leads, the
  // Editor-in-Chief, a director) picks for their own.
  {
    key: "hiring",
    permissions: [
      "members.manage",
      "programs.manage",
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
      "programs.manage",
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
      "programs.manage",
      "events.manage",
      "content.manage",
      "governance.manage",
      "concerns.handle",
      "forms.handle",
      "qalam.manage",
      "partners.manage",
      "productions.manage",
      "journal.manage",
    ],
  },
  // Media (the Director of Media): Next Stop, the channels and the design
  // system (decisions §6).
  { key: "media", permissions: ["content.manage"] },
  { key: "activity", permissions: ["audit.read"] },
] as const satisfies readonly {
  key: string;
  permissions: readonly Permission[];
}[];

export type AdminModule = (typeof adminModules)[number]["key"];

/**
 * The Diwan's sections, one per Council seat (decisions §6), in one row
 * like the members' pages. A section shows when any of its modules does;
 * the Desk shows for every officer.
 */
export const adminSections = [
  { key: "desk", modules: ["activity"], path: "/" },
  {
    key: "council",
    modules: ["governance", "library", "forms"],
    path: "/council",
  },
  {
    key: "qirtas",
    modules: ["journal", "qalam", "recognition"],
    path: "/qirtas",
  },
  { key: "media", modules: ["media"], path: "/media" },
  { key: "company", modules: ["productions"], path: "/company" },
  { key: "events", modules: ["events", "programs"], path: "/events" },
  { key: "partnerships", modules: ["partners"], path: "/partnerships" },
  {
    key: "membership",
    modules: ["members", "hiring", "recognition", "tour"],
    path: "/membership",
  },
] as const satisfies readonly {
  key: string;
  modules: readonly AdminModule[];
  path: string;
}[];

export type AdminSection = (typeof adminSections)[number]["key"];

/** The section a Diwan path belongs to: /membership/openings → membership. */
export const sectionOfPath = (pathname: string): AdminSection => {
  const path = pathname.split("?")[0] ?? pathname;
  const found = adminSections.find(
    (section) =>
      section.path !== "/" &&
      (path === section.path || path.startsWith(`${section.path}/`))
  );
  return found?.key ?? "desk";
};
