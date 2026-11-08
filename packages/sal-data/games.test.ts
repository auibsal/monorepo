import { describe, expect, test } from "vitest";
import { clueWords, guessWords, searchWords } from "./game-words";
import {
  anagramsSchema,
  buildWordSearch,
  cellsOf,
  crosswordCells,
  crosswordSchema,
  currentStreak,
  dailyAnagrams,
  dailyAnswer,
  dailyCrossword,
  dailySearch,
  gameDay,
  gameNumber,
  layoutCrossword,
  lettersOf,
  nextStreak,
  normalizeWord,
  sameAnswer,
  scoreGuess,
  scramble,
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
    // 9:30 p.m. UTC on Nov 5 is 12:30 a.m. Nov 6 in Baghdad.
    const late = gameDay(new Date("2026-11-05T21:30:00Z"));
    const early = gameDay(new Date("2026-11-05T20:30:00Z"));
    expect(late - early).toBe(1);
  });

  test("launch day, November 8, 2026, is No. 1", () => {
    expect(gameNumber(gameDay(new Date("2026-11-08T09:00:00Z")))).toBe(1);
    expect(gameNumber(gameDay(new Date("2026-11-09T09:00:00Z")))).toBe(2);
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
    { answer: "Video", clue: "Next Stop's section" },
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

  test("rejects an entry off the grid or at a non-integer square", () => {
    const base = { across: true, answer: "sal", clue: "Us", number: 1 };
    const grid = (row: number, col: number) =>
      crosswordCells({ cols: 3, entries: [{ ...base, col, row }], rows: 1 });
    expect(grid(0, 0)).not.toBeNull();
    expect(grid(0, 1)).toBeNull();
    expect(grid(1, 0)).toBeNull();
    expect(grid(-1, 0)).toBeNull();
    expect(grid(0.5, 0)).toBeNull();
    expect(grid(Number("__proto__"), 0)).toBeNull();
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
              const at = start;
              const found = crossword?.entries.some((e) =>
                across
                  ? e.across && e.row === a && e.col === at
                  : !e.across && e.col === a && e.row === at
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
});

describe("streaks", () => {
  test("grow day by day, stay put on the same day, restart after a gap", () => {
    const one = nextStreak(null, 100);
    expect(one).toEqual({ count: 1, last: 100 });
    expect(nextStreak(one, 100)).toBe(one);
    const two = nextStreak(one, 101);
    expect(two).toEqual({ count: 2, last: 101 });
    expect(nextStreak(two, 103)).toEqual({ count: 1, last: 103 });
  });

  test("show until a day is missed", () => {
    const streak = { count: 4, last: 200 };
    expect(currentStreak(streak, 200)).toBe(4);
    expect(currentStreak(streak, 201)).toBe(4);
    expect(currentStreak(streak, 202)).toBe(0);
    expect(currentStreak(null, 202)).toBe(0);
  });
});

describe("typed answers and anagrams", () => {
  test("typed answers compare letters, not spelling", () => {
    expect(sameAnswer("  the moon ", "The Moon", "en")).toBe(true);
    expect(sameAnswer("أسد", "اسد", "ar")).toBe(true);
    expect(sameAnswer("", "", "en")).toBe(false);
    expect(sameAnswer("sun", "moon", "en")).toBe(false);
  });

  test("an anagram is scrambled the same way for everyone, never as given", () => {
    const a = scramble("listen", "en", "x");
    expect(a).toEqual(scramble("listen", "en", "x"));
    expect(a.join("")).not.toBe("LISTEN");
    expect([...a].sort()).toEqual([..."LISTEN"].sort());
  });
});

describe("the daily crossword and anagrams", () => {
  const days = Array.from({ length: 60 }, (_, i) => 20_397 + i);

  test("every clued word fits the grid and plays as letters", () => {
    for (const lang of ["en", "ar"] as const) {
      for (const w of clueWords[lang]) {
        const n = lettersOf(normalizeWord(w.answer, lang)).length;
        expect(n).toBeGreaterThanOrEqual(3);
        expect(n).toBeLessThanOrEqual(9);
        expect(w.clue.length).toBeGreaterThan(0);
      }
    }
  });

  test("each day's crossword is a good grid, the same for every reader", () => {
    for (const lang of ["en", "ar"] as const) {
      for (const day of days) {
        const crossword = dailyCrossword(lang, day);
        expect(crossword.entries.length).toBeGreaterThanOrEqual(5);
        expect(crossword.rows).toBeLessThanOrEqual(9);
        expect(crossword.cols).toBeLessThanOrEqual(9);
        expect(crosswordCells(crossword)).not.toBeNull();
        expect(crosswordSchema.safeParse(crossword).success).toBe(true);
      }
      expect(dailyCrossword(lang, 20_400)).toEqual(
        dailyCrossword(lang, 20_400)
      );
    }
  });

  test("each day has five anagrams, a different set the next day", () => {
    for (const lang of ["en", "ar"] as const) {
      const today = dailyAnagrams(lang, 20_400);
      expect(today.items).toHaveLength(5);
      expect(anagramsSchema(lang).safeParse(today).success).toBe(true);
      expect(dailyAnagrams(lang, 20_401)).not.toEqual(today);
    }
  });
});
