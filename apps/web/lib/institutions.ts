/**
 * AUIB's own offices, listed under "With the support of" on the partners
 * page only (decisions §2): they support the Society but aren't partners,
 * and the list is fixed, changed by the web team on the Council's word.
 * Each links to its own page on AUIB's site.
 * Names come from the messages files (web.institutions.names). Logos are
 * AUIB's standard set in apps/web/public/institutions (packages/brand/
 * guide/02-logo.md): `<logo>.svg` in color for paper, `<logo>-white.svg`
 * for ink, each 325 high and `width` wide.
 */
export const INSTITUTIONS = [
  { key: "auib", logo: "auib", url: "https://auib.edu.iq", width: 1036 },
  {
    key: "studentLife",
    logo: "student-life",
    url: "https://auib.edu.iq/student-affairs/students-life/",
    width: 711,
  },
  {
    key: "cas",
    logo: "cas",
    url: "https://auib.edu.iq/academics/college-of-arts-sciences/",
    width: 871,
  },
  {
    key: "press",
    logo: "press",
    url: "https://auib.edu.iq/research-and-institutional-centers/auib-press/",
    width: 667,
  },
  {
    key: "library",
    logo: "library",
    url: "https://library.auib.edu.iq/",
    width: 721,
  },
] as const satisfies readonly {
  key: string;
  logo: string;
  url: string | null;
  width: number;
}[];
