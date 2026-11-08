import { describe, expect, it } from "vitest";
import {
  layoutPages,
  type TextItem,
  textItem,
  withDirection,
} from "./text-layout";

/** A page 420 wide with a column from 45 to 375, 12-point type. */
const WIDTH = 420;
const LONE_NUMBER = />\d</u;
const CHAR = 6;

/** One line of text as one item, each letter six units wide. */
const line = (
  str: string,
  y: number,
  { x = 45, size = 12, rtl = false } = {}
): TextItem => {
  const width = [...str].length * CHAR;
  return { height: size, str, width, x: rtl ? 375 - width - x + 45 : x, y };
};

const page = (items: TextItem[]) => ({ items, width: WIDTH });

/** Words to fill a line to about `chars` letters. */
const filler = (chars: number, word = "paper") =>
  Array.from({ length: Math.ceil(chars / (word.length + 1)) }, () => word)
    .join(" ")
    .slice(0, chars)
    .trim();

describe("layoutPages", () => {
  it("keeps the writer's line breaks in verse", () => {
    const html = layoutPages([
      page([
        line("The kettle keeps its counsel,", 500),
        line("the street lamp hums,", 485),
        line("and I am counting windows.", 470),
      ]),
    ]);
    expect(html).toBe(
      '<p dir="ltr">The kettle keeps its counsel,<br>the street lamp hums,<br>and I am counting windows.</p>'
    );
  });

  it("joins the lines the page wrapped and breaks paragraphs at a gap", () => {
    const full = filler(54);
    const html = layoutPages([
      page([
        line(full, 500),
        line("and the end.", 485),
        line("A new paragraph.", 455),
      ]),
    ]);
    expect(html).toBe(
      `<p dir="ltr">${full} and the end.</p><p dir="ltr">A new paragraph.</p>`
    );
  });

  it("starts a paragraph at an indent in prose, and keeps it in verse", () => {
    const full = filler(54);
    const prose = layoutPages([
      page([
        line(full, 500),
        line("the end.", 485),
        line("Indented start.", 470, { x: 81 }),
      ]),
    ]);
    expect(prose).toContain("</p><p");
    const verse = layoutPages([
      page([line("One line,", 500), line("an indented one.", 485, { x: 69 })]),
    ]);
    expect(verse).toBe('<p dir="ltr">One line,<br>  an indented one.</p>');
  });

  it("makes a hyphenated word whole again", () => {
    const full = `${filler(50)} won-`;
    const html = layoutPages([
      page([line(full, 500), line("derful day.", 485)]),
    ]);
    expect(html).toContain("wonderful day.");
  });

  it("reads larger type as a heading, never bold", () => {
    const html = layoutPages([
      page([
        { ...line("Small Hours", 540, { size: 20 }), bold: true },
        line("A line of verse,", 500),
        line("and another.", 485),
      ]),
    ]);
    expect(html.startsWith('<h2 dir="ltr">Small Hours</h2>')).toBe(true);
  });

  it("drops page numbers and running heads", () => {
    const pages = [1, 2].map((n) =>
      page([
        line(`Rahman ${n}`, 560, { x: 330 }),
        line(`Line ${n === 1 ? "one" : "two"},`, 500),
        line(String(n), 30, { x: 207 }),
      ])
    );
    const html = layoutPages(pages);
    expect(html).not.toContain("Rahman");
    expect(html).not.toMatch(LONE_NUMBER);
  });

  it("reads Arabic right to left, with an English name the right way round", () => {
    // Drawn right to left: "قرأتُ رواية" at the right edge, then "Woolf" to its left.
    const html = layoutPages([
      page([
        { height: 12, str: "قرأتُ رواية", width: 60, x: 315, y: 500 },
        { height: 12, str: " ", width: 3, x: 312, y: 500 },
        { height: 12, str: "Woolf", width: 30, x: 282, y: 500 },
      ]),
    ]);
    expect(html).toBe('<p dir="rtl">قرأتُ رواية Woolf</p>');
  });

  it("joins a diacritic drawn on its own to its letter", () => {
    const html = layoutPages([
      page([
        { height: 12, str: "شكر", width: 18, x: 357, y: 500 },
        { height: 12, str: "ً", width: 0, x: 357, y: 500 },
      ]),
    ]);
    expect(html).toContain("شكرً");
  });

  it("puts a mark written before its letter after it, and drops unmapped glyphs", () => {
    const html = layoutPages([
      page([
        { height: 12, str: "ّر", width: 7, x: 360, y: 500 },
        { height: 12, str: "\u0004", width: 0, x: 362, y: 500 },
        { height: 12, str: "*", width: 0, x: 355, y: 500 },
      ]),
    ]);
    expect(html).toBe('<p dir="rtl">رّ</p>');
  });

  it("keeps the two halves of a classical line apart and never joins them", () => {
    const half = (str: string, x: number, y: number) => ({
      height: 12,
      str,
      width: 120,
      x,
      y,
    });
    const html = layoutPages([
      page([
        half("الخيل والليل والبيداء تعرفني", 255, 500),
        half("والسيف والرمح والقرطاس والقلم", 45, 500),
        half("أنا الذي نظر الأعمى إلى أدبي", 255, 485),
        half("وأسمعت كلماتي من به صمم", 45, 485),
      ]),
    ]);
    expect(html).toContain("تعرفني  والسيف");
    expect(html).toContain("والقلم<br>أنا");
  });

  it("never joins the lines of a centered poem", () => {
    const centered = (str: string, y: number) => {
      const width = [...str].length * CHAR;
      return { height: 12, str, width, x: (WIDTH - width) / 2, y };
    };
    const html = layoutPages([
      page([
        centered("The paper keeps what the hand forgets,", 500),
        centered("a word the writer left out.", 485),
      ]),
    ]);
    expect(html).toBe(
      '<p dir="ltr">The paper keeps what the hand forgets,<br>a word the writer left out.</p>'
    );
  });

  it("keeps italics, with spaces outside the emphasis", () => {
    const html = layoutPages([
      page([
        { height: 12, str: "am counting ", width: 72, x: 45, y: 500 },
        {
          height: 12,
          italic: true,
          str: "other people’s ",
          width: 90,
          x: 117,
          y: 500,
        },
        { height: 12, str: "windows.", width: 48, x: 207, y: 500 },
      ]),
    ]);
    expect(html).toBe(
      '<p dir="ltr">am counting <em>other people’s</em> windows.</p>'
    );
  });
});

describe("textItem", () => {
  it("reads italic and bold from the font's name or a slant", () => {
    const item = { str: "a", transform: [12, 0, 0, 12, 10, 20], width: 6 };
    expect(textItem(item, "BAAAAA+LiberationSerif-Italic").italic).toBe(true);
    expect(textItem(item, "Carlito-Bold").bold).toBe(true);
    expect(
      textItem({ ...item, transform: [12, 0, 3, 12, 10, 20] }).italic
    ).toBe(true);
    expect(textItem(item, "Caladea-Regular")).toMatchObject({
      bold: false,
      height: 12,
      italic: false,
      x: 10,
      y: 20,
    });
  });
});

describe("withDirection", () => {
  it("gives Arabic paragraphs their direction and keeps verse indents", () => {
    expect(withDirection("<p>قهوة الصباح</p><h2>Small Hours</h2>")).toBe(
      '<p dir="rtl">قهوة الصباح</p><h2 dir="ltr">Small Hours</h2>'
    );
    expect(withDirection("<p>One,<br />    and two.</p>")).toBe(
      '<p dir="ltr">One,<br /> and two.</p>'
    );
  });
});
