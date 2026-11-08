/**
 * The Society's home institution and institutional partners (Constitution
 * 1.2: a registered student organization of AUIB, recognized by the Office
 * of Student Life). Names come from the messages files. Logos are AUIB's
 * standard set in apps/web/public/institutions (packages/brand/guide/
 * 02-logo.md): `<logo>.svg` in color for paper, `<logo>-white.svg` for ink.
 */
export const INSTITUTIONS = [
  {
    key: "auib",
    logo: "auib",
    role: "home",
    url: "https://auib.edu.iq",
  },
  {
    key: "studentLife",
    logo: "student-life",
    role: "recognition",
    url: null,
  },
  {
    key: "cas",
    logo: "cas",
    role: "partner",
    url: null,
  },
  {
    key: "press",
    logo: "press",
    role: "partner",
    url: null,
  },
  {
    key: "library",
    logo: "library",
    role: "partner",
    url: null,
  },
] as const satisfies readonly {
  key: string;
  logo: string;
  role: "home" | "recognition" | "partner";
  url: string | null;
}[];
