/**
 * The tabs of a program's and a production's Diwan pages, each at its own
 * address. A plain module, not a client one, so the server pages can read
 * the lists to decide which addresses exist.
 */
export const programTabs = [
  "sessions",
  "shifts",
  "needs",
  "six-words",
  "collection",
] as const;
export type ProgramTab = (typeof programTabs)[number];

export const productionTabs = [
  "details",
  "rights",
  "auditions",
  "credits",
  "rehearsals",
  "performances",
  "report",
] as const;
export type ProductionTab = (typeof productionTabs)[number];

/** A Second Chapter campaign's tabs, each at its own address. */
export const campaignTabs = [
  "ledger",
  "signoff",
  "settings",
  "receipts",
  "handover",
  "impact",
] as const;
export type CampaignTab = (typeof campaignTabs)[number];

/** People → Service's tabs: hours to confirm, totals, certificates. */
export const serviceTabs = ["pending", "totals", "certificates"] as const;
export type ServiceTab = (typeof serviceTabs)[number];
