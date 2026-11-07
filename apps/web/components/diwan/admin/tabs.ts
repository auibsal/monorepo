/**
 * The tabs of a production's Diwan pages, each at its own
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

/** Membership → Service's tabs: hours to confirm, totals, letters. */
export const serviceTabs = ["pending", "totals", "letters"] as const;
export type ServiceTab = (typeof serviceTabs)[number];
