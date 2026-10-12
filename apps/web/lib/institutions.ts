/**
 * The Society's home institution and institutional partners (Constitution
 * 1.2: a registered student organization of AUIB, recognized by the Office
 * of Student Life). Names come from the messages files.
 *
 * TODO(content): official logo files for each, as supplied by the
 * institution, in apps/web/public/institutions/<key>.svg (or .png); set
 * `logo` below once a file is in place. Until then the name is shown.
 */
export const INSTITUTIONS = [
  { key: "auib", logo: null, role: "home", url: "https://auib.edu.iq" },
  { key: "studentLife", logo: null, role: "recognition", url: null },
  { key: "cas", logo: null, role: "partner", url: null },
  { key: "press", logo: null, role: "partner", url: null },
] as const satisfies readonly {
  key: string;
  logo: string | null;
  role: "home" | "recognition" | "partner";
  url: string | null;
}[];
