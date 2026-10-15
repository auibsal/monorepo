import { describe, expect, test } from "vitest";
import { guessWords, searchWords } from "./game-words";
import {
  buildWordSearch,
  cellsOf,
  crosswordCells,
  crosswordSchema,
  dailyAnswer,
  dailySearch,
  gameDay,
  gameNumber,
  layoutCrossword,
  lettersOf,
  normalizeWord,
  parsePuzzle,
  scoreGuess,
  WORD_LENGTH,
  wordBetween,
  wordSearchSchema,
} from "./games";

describe("letters", () => {
  test("English is played in capitals, without spaces or marks", () => {
    expect(normalizeWord(" new's  room", "en")).toBe("NEWSROOM");
  });

  test("Arabic drops short vowels and tatweel and writes every alif as ا", () => {
    expect(normalizeWord("أَقْلام", "ar")).toBe("اقلام");
    expect(normalizeWord("إيقـاع", "ar")).toBe("ايقاع");
    expect(normalizeWord("آفاق", "ar")).toBe("افاق");
  });

  test("every daily answer has five letters once normalized", () => {
    for (const lang of ["en", "ar"] as const) {
      for (const word of guessWords[lang]) {
        expect(lettersOf(normalizeWord(word, lang)), word).toHaveLength(
          WORD_LENGTH
        );
      }
    }
  });

  test("every word-search word fits a 10-letter grid", () => {
    for (const lang of ["en", "ar"] as const) {
      for (const word of searchWords[lang]) {
        const n = lettersOf(normalizeWord(word, lang)).length;
        expect(n, word).toBeGreaterThanOrEqual(2);
        expect(n, word).toBeLessThanOrEqual(10);
      }
    }
  });
});

describe("the day", () => {
  test("changes at midnight in Baghdad, not UTC", () => {
    // 9:30 PM UTC on Oct 14 is 12:30 AM Oct 15 in Baghdad.
    const late = gameDay(new Date("2026-10-14T21:30:00Z"));
    const early = gameDay(new Date("2026-10-14T20:30:00Z"));
    expect(late - early).toBe(1);
    expect(gameNumber(early)).toBe(1);
  });

  test("the same day gives every reader the same games", () => {
    const day = gameDay(new Date("2026-11-02T09:00:00Z"));
    expect(dailyAnswer("en", day)).toEqual(dailyAnswer("en", day));
    expect(dailySearch("ar", day).grid).toEqual(dailySearch("ar", day).grid);
    expect(dailyAnswer("en", day)).not.toEqual(dailyAnswer("en", day + 1));
  });
});

describe("word guess", () => {
  const marks = (answer: string, guess: string) =>
    scoreGuess(lettersOf(answer), lettersOf(guess));

  test("marks hits, near letters and misses", () => {
    expect(marks("VERSE", "VERSE")).toEqual([
      "hit",
      "hit",
      "hit",
      "hit",
      "hit",
    ]);
    expect(marks("STAGE", "GATES")).toEqual([
      "near",
      "near",
      "near",
      "near",
      "near",
    ]);
  });

  test("a repeated letter is near only as often as the answer has it", () => {
    // The answer's only E is the hit at the end.
    expect(marks("PROSE", "EERIE")).toEqual([
      "miss",
      "miss",
      "near",
      "miss",
      "hit",
    ]);
    expect(marks("NOVEL", "LLAMA")).toEqual([
      "near",
      "miss",
      "miss",
      "miss",
      "miss",
    ]);
  });

  test("works on Arabic letters", () => {
    expect(marks("مكتبة", "كتابة")).toEqual([
      "near",
      "near",
      "miss",
      "hit",
      "hit",
    ]);
  });
});

describe("word search", () => {
  test("hides every word and reads it back between its ends", () => {
    const words = ["POETRY", "STAGE", "INK", "GALLERY", "VERSE", "NEWS"];
    const search = buildWordSearch({ lang: "en", seed: "t", size: 10, words });
    expect(search.skipped).toEqual([]);
    expect(search.words).toHaveLength(words.length);
    expect(wordSearchSchema.safeParse(search).success).toBe(true);
    for (const w of search.words) {
      const n = lettersOf(w.word).length - 1;
      const end: [number, number] = [w.row + w.dr * n, w.col + w.dc * n];
      expect(wordBetween(search, [w.row, w.col], end)?.word).toBe(w.word);
      expect(wordBetween(search, end, [w.row, w.col])?.word).toBe(w.word);
      expect(cellsOf(w)).toHaveLength(n + 1);
    }
  });

  test("keeps the word as written and grids it without the hamza", () => {
    const search = buildWordSearch({
      lang: "ar",
      seed: "t",
      size: 8,
      words: ["أخبار", "شعر", "مسرح"],
    });
    expect(search.words.map((w) => w.label)).toContain("أخبار");
    expect(search.words.map((w) => w.word)).toContain("اخبار");
  });

  test("a word longer than the grid is skipped", () => {
    const search = buildWordSearch({
      lang: "en",
      seed: "t",
      size: 6,
      words: ["INTERVIEW", "INK", "NEWS", "ART"],
    });
    expect(search.skipped).toEqual(["INTERVIEW"]);
  });

  test("a tampered grid fails the schema", () => {
    const search = buildWordSearch({
      lang: "en",
      seed: "t",
      size: 8,
      words: ["INK", "NEWS", "ART"],
    });
    const [w] = search.words;
    const broken = structuredClone(search);
    const line = w ? broken.grid[w.row] : undefined;
    if (w && line) {
      line[w.col] = line[w.col] === "Q" ? "Z" : "Q";
    }
    expect(wordSearchSchema.safeParse(broken).success).toBe(false);
  });

  test("the daily search hides eight words", () => {
    for (let day = 20_740; day < 20_760; day += 1) {
      expect(dailySearch("en", day).words).toHaveLength(8);
      expect(dailySearch("ar", day).words).toHaveLength(8);
    }
  });
});

describe("crossword layout", () => {
  const items = [
    { answer: "Gallery", clue: "Art and photography desk" },
    { answer: "Letters", clue: "Desk of the Editions" },
    { answer: "Voices", clue: "Columns and letters to the editor" },
    { answer: "News", clue: "Always-open desk" },
    { answer: "Video", clue: "Side Quest's desk" },
  ];

  test("crosses every answer and agrees with itself", () => {
    const { crossword, unplaced } = layoutCrossword({ items, lang: "en" });
    expect(unplaced).toEqual([]);
    expect(crossword).not.toBeNull();
    if (!crossword) {
      return;
    }
    expect(crossword.entries).toHaveLength(items.length);
    expect(crosswordCells(crossword)).not.toBeNull();
    expect(crosswordSchema.safeParse(crossword).success).toBe(true);
    expect(crossword.entries.some((e) => e.across)).toBe(true);
    expect(crossword.entries.some((e) => !e.across)).toBe(true);
  });

  test("numbers clues in reading order, starting at 1", () => {
    const { crossword } = layoutCrossword({ items, lang: "en" });
    const numbers = [...new Set(crossword?.entries.map((e) => e.number))].sort(
      (a, b) => a - b
    );
    expect(numbers[0]).toBe(1);
    const starts = crossword?.entries
      .map((e) => ({ n: e.number, pos: e.row * 100 + e.col }))
      .sort((a, b) => a.n - b.n);
    for (let i = 1; i < (starts?.length ?? 0); i += 1) {
      expect(starts?.[i]?.pos).toBeGreaterThanOrEqual(
        starts?.[i - 1]?.pos ?? 0
      );
    }
  });

  test("never lets two words touch side by side", () => {
    const { crossword } = layoutCrossword({ items, lang: "en" });
    const cells = crossword ? crosswordCells(crossword) : null;
    // Every white square belongs to an across or a down entry it was placed by.
    const covered = new Set<string>();
    for (const e of crossword?.entries ?? []) {
      lettersOf(e.answer).forEach((_, i) => {
        covered.add(
          e.across ? `${e.row},${e.col + i}` : `${e.row + i},${e.col}`
        );
      });
    }
    let white = 0;
    for (const line of cells ?? []) {
      for (const cell of line) {
        white += cell ? 1 : 0;
      }
    }
    expect(white).toBe(covered.size);
    // Any run of two or more white squares in a line is an entry.
    const runs = (
      get: (a: number, b: number) => unknown,
      n: number,
      m: number,
      across: boolean
    ) => {
      for (let a = 0; a < n; a += 1) {
        let start = -1;
        for (let b = 0; b <= m; b += 1) {
          if (b < m && get(a, b)) {
            start = start < 0 ? b : start;
          } else {
            if (start >= 0 && b - start >= 2) {
              const found = crossword?.entries.some((e) =>
                across
                  ? e.across && e.row === a && e.col === start
                  : !e.across && e.col === a && e.row === start
              );
              expect(found).toBe(true);
            }
            start = -1;
          }
        }
      }
    };
    if (crossword && cells) {
      runs((r, c) => cells[r]?.[c], crossword.rows, crossword.cols, true);
      runs((c, r) => cells[r]?.[c], crossword.cols, crossword.rows, false);
    }
  });

  test("an answer that shares no letter is left out", () => {
    const { unplaced } = layoutCrossword({
      items: [
        { answer: "ABC", clue: "x" },
        { answer: "CAB", clue: "y" },
        { answer: "XYZ", clue: "z" },
      ],
      lang: "en",
    });
    expect(unplaced).toEqual(["XYZ"]);
  });

  test("lays out Arabic answers", () => {
    const { crossword, unplaced } = layoutCrossword({
      items: [
        { answer: "مكتبة", clue: "أ" },
        { answer: "كتابة", clue: "ب" },
        { answer: "قصيدة", clue: "ج" },
      ],
      lang: "ar",
    });
    expect(unplaced).toEqual([]);
    expect(crossword && crosswordCells(crossword)).not.toBeNull();
  });

  test("parsePuzzle refuses a grid of the wrong kind", () => {
    const { crossword } = layoutCrossword({ items, lang: "en" });
    expect(parsePuzzle("crossword", crossword)?.kind).toBe("crossword");
    expect(parsePuzzle("word_search", crossword)).toBeNull();
  });
});
