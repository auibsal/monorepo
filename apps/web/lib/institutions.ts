/**
 * AUIB's own offices, listed under "With the support of" on About and in
 * the footer (decisions §2): they support the Society but aren't partners,
 * and the list is fixed, changed by the web team on the Council's word.
 * Names come from the messages files (web.institutions.names). Logos are
 * AUIB's standard set in apps/web/public/institutions (packages/brand/
 * guide/02-logo.md): `<logo>.svg` in color for paper, `<logo>-white.svg`
 * for ink, each 325 high and `width` wide.
 */
export const INSTITUTIONS = [
  { key: "auib", logo: "auib", url: "https://auib.edu.iq", width: 1036 },
  { key: "studentLife", logo: "student-life", url: null, width: 711 },
  { key: "cas", logo: "cas", url: null, width: 871 },
  { key: "press", logo: "press", url: null, width: 667 },
  { key: "library", logo: "library", url: null, width: 721 },
] as const satisfies readonly {
  key: string;
  logo: string;
  url: string | null;
  width: number;
}[];
