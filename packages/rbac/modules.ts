import type { Permission } from "./permissions";

/**
 * Nexus admin modules and the permission (held in any scope) that shows
 * each one. Pages still scope their rows by program, issue or campaign.
 */
export const adminModules = [
  {
    key: "overview",
    permissions: [
      "members.manage",
      "events.manage",
      "journal.manage",
      "charity.manage",
    ],
  },
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
  { key: "content", permissions: ["content.manage"] },
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
      "spending.request",
      "spending.countersign",
    ],
  },
  { key: "documents", permissions: ["governance.manage"] },
  {
    key: "forms",
    permissions: [
      "members.manage",
      "programmes.manage",
      "events.manage",
      "spending.countersign",
      "content.manage",
      "governance.manage",
      "concerns.handle",
    ],
  },
  { key: "activity", permissions: ["audit.read"] },
  { key: "settings", permissions: ["settings.manage"] },
] as const satisfies readonly {
  key: string;
  permissions: readonly Permission[];
}[];

export type AdminModule = (typeof adminModules)[number]["key"];
