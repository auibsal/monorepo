/**
 * The tabs of a program's and a production's Diwan pages, each at its own
 * address. A plain module, not a client one, so the server pages can read
 * the lists to decide which addresses exist.
 */
export const programTabs = [
  "sessions",
  "shifts",
  "places",
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
