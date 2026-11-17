/**
 * The kinds of presets (decisions.md, The site: "Presets"). A plain module,
 * not a client one, so the server page can read the list.
 */
export const PRESET_KINDS = [
  "event",
  "opening",
  "call",
  "announcement",
  "letter",
] as const;
export type PresetKind = (typeof PRESET_KINDS)[number];
