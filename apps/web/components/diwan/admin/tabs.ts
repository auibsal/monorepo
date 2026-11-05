/**
 * The tabs of a production's and a campaign's Diwan pages, each at its own
 * address. A plain module, not a client one, so the server pages can read
 * the lists to decide which addresses exist.
 */
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
  "catalog",
  "receipts",
  "handover",
  "impact",
] as const;
export type CampaignTab = (typeof campaignTabs)[number];

/** People → Service's tabs: hours to confirm, totals, certificates. */
export const serviceTabs = ["pending", "totals", "certificates"] as const;
export type ServiceTab = (typeof serviceTabs)[number];
