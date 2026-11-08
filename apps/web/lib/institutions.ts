/**
 * The Society's home institution and institutional partners (Constitution
 * 1.2: a registered student organization of AUIB, recognized by the Office
 * of Student Life). Names come from the messages files; logos are the
 * institutions' own files in apps/web/public/institutions, unaltered.
 * `ground` is what the file was made for: a color logo sits on paper, a
 * white one on ink, in either theme.
 */
export const INSTITUTIONS = [
  {
    ground: "paper",
    key: "auib",
    logo: "/institutions/auib.png",
    role: "home",
    url: "https://auib.edu.iq",
  },
  {
    ground: "ink",
    key: "studentLife",
    logo: "/institutions/student-life.png",
    role: "recognition",
    url: null,
  },
  {
    ground: "paper",
    key: "cas",
    logo: "/institutions/cas.png",
    role: "partner",
    url: null,
  },
  {
    ground: "ink",
    key: "press",
    logo: "/institutions/press.png",
    role: "partner",
    url: null,
  },
  {
    ground: "ink",
    key: "library",
    logo: "/institutions/library.png",
    role: "partner",
    url: null,
  },
] as const satisfies readonly {
  ground: "paper" | "ink";
  key: string;
  logo: string;
  role: "home" | "recognition" | "partner";
  url: string | null;
}[];
