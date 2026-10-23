import { z } from "zod";
import { type Client, unwrap } from "./client";
import { guessWords, searchWords } from "./game-words";

// Waraq's games: the daily word guess and word search (made from fixed word
// lists, the same for every reader on a Baghdad day), and the crosswords and
// word searches editors write in the Nexus (journal.puzzles).

export const puzzleKinds = ["crossword", "word_search"] as const;
export type PuzzleKind = (typeof puzzleKinds)[number];
export const gameLangs = ["en", "ar"] as const;
export type GameLang = (typeof gameLangs)[number];

/** The largest grid a puzzle may have (rows or columns). */
export const MAX_GRID = 15;
export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

// ── Letters ──────────────────────────────────────────────────────────────────

const ARABIC_MARKS = /[ً-ٰٟـ]/g;
const NOT_ARABIC_LETTER = /[^ء-ي]/g;
const NOT_LATIN_LETTER = /[^A-Z]/g;
const ALIF_FORMS = /[أإآٱ]/g;

/**
 * The letters a word is played with: English in capitals; Arabic without
 * short vowels or tatweel, with every alif (أ إ آ) as ا so a reader never
 * has to guess the hamza.
 */
export const normalizeWord = (word: string, lang: GameLang) =>
  lang === "ar"
    ? word
        .replace(ARABIC_MARKS, "")
        .replace(ALIF_FORMS, "ا")
        .replace(NOT_ARABIC_LETTER, "")
    : word.toUpperCase().replace(NOT_LATIN_LETTER, "");

/** A word's letters; every Arabic letter is one code point. */
export const lettersOf = (word: string) => Array.from(word);

const alphabets: Record<GameLang, string[]> = {
  ar: lettersOf("ابتثجحخدذرزسشصضطظعغفقكلمنهويةى"),
  en: lettersOf("ABCDEFGHIJKLMNOPQRSTUVWXYZ"),
};

/** The on-screen keyboard rows for the word guess. */
export const keyboardRows: Record<GameLang, string[][]> = {
  ar: [
    lettersOf("ضصثقفغعهخحج"),
    lettersOf("شسيبلاتنمكط"),
    lettersOf("ئءؤرىةوزظدذ"),
  ],
  en: [lettersOf("QWERTYUIOP"), lettersOf("ASDFGHJKL"), lettersOf("ZXCVBNM")],
};

// ── Seeded randomness ────────────────────────────────────────────────────────

// biome-ignore-start lint/suspicious/noBitwiseOperators: a 32-bit hash and PRNG
const hash = (text: string) => {
  let h = 2_166_136_261;
  for (const char of text) {
    h ^= char.codePointAt(0) ?? 0;
    h = Math.imul(h, 16_777_619);
  }
  return h >>> 0;
};

/** A repeatable random number source (mulberry32) for a seed. */
export const seeded = (seed: string) => {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d_2b_79_f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

// biome-ignore-end lint/suspicious/noBitwiseOperators: a 32-bit hash and PRNG

const shuffled = <T>(items: readonly T[], rand: () => number) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
};

// ── The day ──────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;
const baghdadDate = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Baghdad",
  year: "numeric",
});

/** Days since 1970 on the Baghdad calendar; the daily games change at midnight there. */
export const gameDay = (date = new Date()) =>
  Math.floor(Date.parse(`${baghdadDate.format(date)}T00:00:00Z`) / DAY_MS);

/** The first daily game, Wednesday, October 14, 2026, is No. 1. */
const FIRST_DAY = Date.UTC(2026, 9, 14) / DAY_MS;
export const gameNumber = (day: number) => day - FIRST_DAY + 1;

/** Days in a row a daily game was solved, ending on the last solved day. */
export interface Streak {
  count: number;
  last: number;
}

/**
 * The streak after solving the game of `day`: one more when the last solve
 * was the day before, unchanged when today was already counted, else 1.
 */
export const nextStreak = (streak: Streak | null, day: number): Streak => {
  if (streak?.last === day) {
    return streak;
  }
  return {
    count: streak?.last === day - 1 ? streak.count + 1 : 1,
    last: day,
  };
};

/** The streak to show on `day`: zero once a day has been missed. */
export const currentStreak = (streak: Streak | null, day: number) =>
  streak && day - streak.last <= 1 ? streak.count : 0;

// ── Word guess ───────────────────────────────────────────────────────────────

export type Mark = "hit" | "near" | "miss";

/**
 * Marks a guess: hit (right letter, right place), near (in the word
 * elsewhere), miss. A repeated letter is marked near only as often as the
 * answer still has it.
 */
export const scoreGuess = (answer: string[], guess: string[]): Mark[] => {
  const marks: Mark[] = guess.map(() => "miss");
  const left = new Map<string, number>();
  answer.forEach((letter, i) => {
    if (guess[i] === letter) {
      marks[i] = "hit";
    } else {
      left.set(letter, (left.get(letter) ?? 0) + 1);
    }
  });
  guess.forEach((letter, i) => {
    const count = left.get(letter) ?? 0;
    if (marks[i] !== "hit" && count > 0) {
      marks[i] = "near";
      left.set(letter, count - 1);
    }
  });
  return marks;
};

/** Today's answer for the word guess, in a fixed shuffled order of the list. */
export const dailyAnswer = (lang: GameLang, day: number) => {
  const order = shuffled(guessWords[lang], seeded(`guess-${lang}`));
  const word = order[((day % order.length) + order.length) % order.length];
  return lettersOf(normalizeWord(word ?? "", lang));
};

// ── Word search ──────────────────────────────────────────────────────────────

export interface Placement {
  col: number;
  dc: number;
  dr: number;
  /** The word as the editor wrote it (with its hamza and vowels). */
  label: string;
  row: number;
  /** The letters in the grid. */
  word: string;
}

export interface WordSearch {
  grid: string[][];
  size: number;
  words: Placement[];
}

// Forward directions first: along the reading line, down, and the two
// diagonals that read forward. Backward ones make a harder grid.
const DIRECTIONS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [-1, 1],
  [0, -1],
  [-1, 0],
  [-1, -1],
  [1, -1],
];

/**
 * Hides the words in a square grid and fills the rest with letters. The
 * same seed gives the same grid; words that do not fit are returned in
 * `skipped`. Columns run along the reading line, so an Arabic grid is shown
 * right to left.
 */
export const buildWordSearch = ({
  backward = false,
  lang,
  seed,
  size,
  words,
}: {
  backward?: boolean;
  lang: GameLang;
  seed: string;
  size: number;
  words: string[];
}): WordSearch & { skipped: string[] } => {
  const rand = seeded(seed);
  const grid: (string | null)[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null)
  );
  const directions = DIRECTIONS.slice(0, backward ? 8 : 4);
  const placed: Placement[] = [];
  const skipped: string[] = [];
  const entries = words
    .map((label) => ({
      label: label.trim(),
      letters: lettersOf(normalizeWord(label, lang)),
    }))
    .filter((w) => w.letters.length >= 2)
    .sort((a, b) => b.letters.length - a.letters.length);

  const fits = (
    letters: string[],
    row: number,
    col: number,
    dr: number,
    dc: number
  ) =>
    letters.every((letter, i) => {
      const r = row + dr * i;
      const c = col + dc * i;
      const cell = grid[r]?.[c];
      return (
        r >= 0 &&
        c >= 0 &&
        r < size &&
        c < size &&
        (cell === null || cell === letter)
      );
    });

  for (const { label, letters } of entries) {
    let done = false;
    for (let attempt = 0; attempt < 300 && !done; attempt += 1) {
      const [dr, dc] = directions[Math.floor(rand() * directions.length)] ?? [
        0, 1,
      ];
      const row = Math.floor(rand() * size);
      const col = Math.floor(rand() * size);
      if (fits(letters, row, col, dr, dc)) {
        letters.forEach((letter, i) => {
          const line = grid[row + dr * i];
          if (line) {
            line[col + dc * i] = letter;
          }
        });
        placed.push({ col, dc, dr, label, row, word: letters.join("") });
        done = true;
      }
    }
    if (!done) {
      skipped.push(label);
    }
  }

  const alphabet = alphabets[lang];
  return {
    grid: grid.map((line) =>
      line.map(
        (cell) => cell ?? alphabet[Math.floor(rand() * alphabet.length)] ?? "A"
      )
    ),
    size,
    skipped,
    words: placed,
  };
};

/** The word, if any, that runs exactly between two cells (either way). */
export const wordBetween = (
  search: WordSearch,
  from: [number, number],
  to: [number, number]
) =>
  search.words.find((w) => {
    const length = lettersOf(w.word).length - 1;
    const end: [number, number] = [
      w.row + w.dr * length,
      w.col + w.dc * length,
    ];
    const same = (a: [number, number], b: [number, number]) =>
      a[0] === b[0] && a[1] === b[1];
    return (
      (same(from, [w.row, w.col]) && same(to, end)) ||
      (same(to, [w.row, w.col]) && same(from, end))
    );
  });

/** Every cell a placed word covers, as "row,col". */
export const cellsOf = (w: Placement) =>
  lettersOf(w.word).map((_, i) => `${w.row + w.dr * i},${w.col + w.dc * i}`);

/** Today's word search: eight words from the list, forward only. */
export const dailySearch = (lang: GameLang, day: number) => {
  const seed = `search-${lang}-${day}`;
  const words = shuffled(searchWords[lang], seeded(seed)).slice(0, 8);
  return buildWordSearch({ lang, seed, size: 10, words });
};

const validWordSearch = (search: WordSearch) =>
  search.grid.length === search.size &&
  search.grid.every((line) => line.length === search.size) &&
  search.words.every((w) =>
    lettersOf(w.word).every(
      (letter, i) =>
        search.grid[w.row + w.dr * i]?.[w.col + w.dc * i] === letter
    )
  );

// ── Crossword ────────────────────────────────────────────────────────────────

export interface CrosswordEntry {
  across: boolean;
  /** The letters in the grid. */
  answer: string;
  clue: string;
  col: number;
  number: number;
  row: number;
}

export interface Crossword {
  cols: number;
  entries: CrosswordEntry[];
  rows: number;
}

export interface CrosswordCell {
  letter: string;
  number?: number;
}

/**
 * Both indices must be integers inside the grid before either indexes an
 * array: a non-numeric key would otherwise reach the prototype.
 */
const inGrid = (crossword: Crossword, r: number, c: number) =>
  Number.isSafeInteger(r) &&
  Number.isSafeInteger(c) &&
  r >= 0 &&
  r < crossword.rows &&
  c >= 0 &&
  c < crossword.cols;

/** Writes one entry into the grid; false when it clashes or runs off it. */
const placeEntry = (
  crossword: Crossword,
  cells: (CrosswordCell | null)[][],
  entry: CrosswordEntry
) => {
  const letters = lettersOf(entry.answer);
  for (const [i, letter] of letters.entries()) {
    const r = entry.across ? entry.row : entry.row + i;
    const c = entry.across ? entry.col + i : entry.col;
    const line = inGrid(crossword, r, c) ? cells[r] : undefined;
    if (!line) {
      return false;
    }
    const cell = line[c];
    if (cell && cell.letter !== letter) {
      return false;
    }
    line[c] = {
      letter,
      number: i === 0 ? entry.number : cell?.number,
    };
  }
  return true;
};

/**
 * The grid of a crossword: a letter (and its clue number) in every white
 * square, null in the black ones. Null as a whole when two entries disagree
 * on a square or one runs off the grid.
 */
export const crosswordCells = (crossword: Crossword) => {
  const cells: (CrosswordCell | null)[][] = Array.from(
    { length: crossword.rows },
    () => Array.from({ length: crossword.cols }, () => null)
  );
  return crossword.entries.every((entry) => placeEntry(crossword, cells, entry))
    ? cells
    : null;
};

interface LayoutCell {
  across: boolean;
  down: boolean;
  letter: string;
}

type Grid = Map<string, LayoutCell>;
const key = (r: number, c: number) => `${r},${c}`;

interface Placed {
  across: boolean;
  answer: string;
  clue: string;
  col: number;
  row: number;
}

/** How many squares the new word crosses, or -1 when it cannot go there. */
const crossings = (
  grid: Grid,
  letters: string[],
  row: number,
  col: number,
  across: boolean
) => {
  const at = (i: number): [number, number] =>
    across ? [row, col + i] : [row + i, col];
  const [br, bc] = at(-1);
  const [ar, ac] = at(letters.length);
  if (grid.has(key(br, bc)) || grid.has(key(ar, ac))) {
    return -1;
  }
  let count = 0;
  for (const [i, letter] of letters.entries()) {
    const [r, c] = at(i);
    const cell = grid.get(key(r, c));
    if (cell) {
      if (cell.letter !== letter || (across ? cell.across : cell.down)) {
        return -1;
      }
      count += 1;
    } else {
      const sides = across
        ? [key(r - 1, c), key(r + 1, c)]
        : [key(r, c - 1), key(r, c + 1)];
      if (sides.some((s) => grid.has(s))) {
        return -1;
      }
    }
  }
  return count;
};

const bounds = (grid: Grid) => {
  let minR = Number.POSITIVE_INFINITY;
  let minC = Number.POSITIVE_INFINITY;
  let maxR = Number.NEGATIVE_INFINITY;
  let maxC = Number.NEGATIVE_INFINITY;
  for (const k of grid.keys()) {
    const [r = 0, c = 0] = k.split(",").map(Number);
    minR = Math.min(minR, r);
    minC = Math.min(minC, c);
    maxR = Math.max(maxR, r);
    maxC = Math.max(maxC, c);
  }
  return { maxC, maxR, minC, minR };
};

const put = (
  grid: Grid,
  letters: string[],
  row: number,
  col: number,
  across: boolean
) => {
  for (const [i, letter] of letters.entries()) {
    const k = across ? key(row, col + i) : key(row + i, col);
    const cell = grid.get(k) ?? { across: false, down: false, letter };
    grid.set(k, {
      ...cell,
      across: cell.across || across,
      down: cell.down || !across,
    });
  }
};

/** How good a spot is (more crossings, a smaller squarer grid), or null. */
const scoreSpot = (
  grid: Grid,
  answer: string[],
  spot: { across: boolean; col: number; row: number },
  maxSize: number
) => {
  const { across, col, row } = spot;
  const count = crossings(grid, answer, row, col, across);
  if (count < 1) {
    return null;
  }
  const b = bounds(grid);
  const endR = across ? row : row + answer.length - 1;
  const endC = across ? col + answer.length - 1 : col;
  const height = Math.max(b.maxR, endR) - Math.min(b.minR, row) + 1;
  const width = Math.max(b.maxC, endC) - Math.min(b.minC, col) + 1;
  if (height > maxSize || width > maxSize) {
    return null;
  }
  return count * 1000 - height * width - Math.abs(height - width) * 4;
};

/** The best spot for a word crossing one already in the grid. */
const bestPosition = (
  grid: Grid,
  answer: string[],
  maxSize: number,
  rand: () => number
) => {
  let best: {
    across: boolean;
    col: number;
    row: number;
    score: number;
  } | null = null;
  for (const [k, cell] of grid) {
    if (cell.across && cell.down) {
      continue;
    }
    const [r = 0, c = 0] = k.split(",").map(Number);
    const across = !cell.across;
    for (const [i, letter] of answer.entries()) {
      const spot = {
        across,
        col: across ? c - i : c,
        row: across ? r : r - i,
      };
      const score =
        letter === cell.letter ? scoreSpot(grid, answer, spot, maxSize) : null;
      if (score !== null && (!best || score + rand() > best.score)) {
        best = { ...spot, score };
      }
    }
  }
  return best;
};

const attemptLayout = (
  words: { answer: string[]; clue: string }[],
  rand: () => number,
  maxSize: number
) => {
  const grid: Grid = new Map();
  const placed: Placed[] = [];
  const left: { answer: string[]; clue: string }[] = [];

  const tryPlace = (word: { answer: string[]; clue: string }) => {
    if (placed.length === 0) {
      put(grid, word.answer, 0, 0, true);
      placed.push({
        across: true,
        answer: word.answer.join(""),
        clue: word.clue,
        col: 0,
        row: 0,
      });
      return true;
    }
    const best = bestPosition(grid, word.answer, maxSize, rand);
    if (!best) {
      return false;
    }
    put(grid, word.answer, best.row, best.col, best.across);
    placed.push({
      across: best.across,
      answer: word.answer.join(""),
      clue: word.clue,
      col: best.col,
      row: best.row,
    });
    return true;
  };

  for (const word of words) {
    if (!tryPlace(word)) {
      left.push(word);
    }
  }
  // A word that found no crossing early may find one once others are in.
  const unplaced = left.filter((word) => !tryPlace(word));
  return { grid, placed, unplaced };
};

/** Numbers the entries in reading order and moves the grid to (0, 0). */
const finish = (grid: Grid, placed: Placed[]): Crossword => {
  const b = bounds(grid);
  const moved = placed.map((p) => ({
    ...p,
    col: p.col - b.minC,
    row: p.row - b.minR,
  }));
  const starts = [...new Set(moved.map((p) => key(p.row, p.col)))].sort(
    (x, y) => {
      const [xr = 0, xc = 0] = x.split(",").map(Number);
      const [yr = 0, yc = 0] = y.split(",").map(Number);
      return xr - yr || xc - yc;
    }
  );
  const numbers = new Map(starts.map((s, i) => [s, i + 1]));
  return {
    cols: b.maxC - b.minC + 1,
    entries: moved
      .map((p) => ({ ...p, number: numbers.get(key(p.row, p.col)) ?? 0 }))
      .sort(
        (x, y) => Number(y.across) - Number(x.across) || x.number - y.number
      ),
    rows: b.maxR - b.minR + 1,
  };
};

/**
 * Lays out a crossword from answers and clues: the longest answer first,
 * each next one where it crosses most and keeps the grid smallest, the best
 * of several tries. Answers that cross nothing are returned in `unplaced`.
 */
export const layoutCrossword = ({
  items,
  lang,
  maxSize = MAX_GRID,
  seed = "crossword",
  tries = 24,
}: {
  items: { answer: string; clue: string }[];
  lang: GameLang;
  maxSize?: number;
  seed?: string;
  tries?: number;
}) => {
  const rand = seeded(seed);
  const words = items
    .map((item) => ({
      answer: lettersOf(normalizeWord(item.answer, lang)),
      clue: item.clue.trim(),
    }))
    .filter((w) => w.answer.length >= 2 && w.answer.length <= maxSize)
    .sort((a, b) => b.answer.length - a.answer.length);
  if (words.length === 0) {
    return { crossword: null, unplaced: items.map((i) => i.answer) };
  }
  let best: ReturnType<typeof attemptLayout> | null = null;
  let bestArea = Number.POSITIVE_INFINITY;
  for (let t = 0; t < tries; t += 1) {
    const [first, ...rest] = words;
    const order =
      t === 0
        ? words
        : [first as (typeof words)[number], ...shuffled(rest, rand)];
    const result = attemptLayout(order, rand, maxSize);
    const b = bounds(result.grid);
    const area = (b.maxR - b.minR + 1) * (b.maxC - b.minC + 1);
    if (
      !best ||
      result.placed.length > best.placed.length ||
      (result.placed.length === best.placed.length && area < bestArea)
    ) {
      best = result;
      bestArea = area;
    }
  }
  if (!best) {
    return { crossword: null, unplaced: items.map((i) => i.answer) };
  }
  return {
    crossword: finish(best.grid, best.placed),
    unplaced: best.unplaced.map((w) => w.answer.join("")),
  };
};

// ── Stored puzzles ───────────────────────────────────────────────────────────

const coordinate = z
  .number()
  .int()
  .min(0)
  .max(MAX_GRID - 1);
const step = z.number().int().min(-1).max(1);

export const crosswordSchema = z
  .object({
    cols: z.number().int().min(2).max(MAX_GRID),
    entries: z
      .array(
        z.object({
          across: z.boolean(),
          answer: z.string().min(2).max(MAX_GRID),
          clue: z.string().trim().min(1).max(200),
          col: coordinate,
          number: z.number().int().min(1),
          row: coordinate,
        })
      )
      .min(2)
      .max(40),
    rows: z.number().int().min(2).max(MAX_GRID),
  })
  .refine((c) => crosswordCells(c) !== null, { message: "conflict" });

export const wordSearchSchema = z
  .object({
    grid: z.array(z.array(z.string().min(1).max(2))),
    size: z.number().int().min(6).max(MAX_GRID),
    words: z
      .array(
        z.object({
          col: coordinate,
          dc: step,
          dr: step,
          label: z.string().trim().min(1).max(40),
          row: coordinate,
          word: z.string().min(2).max(MAX_GRID),
        })
      )
      .min(3)
      .max(24),
  })
  .refine(validWordSearch, { message: "conflict" });

const listColumns =
  "id, slug, kind, language, title_en, title_ar, made_with_ai, published_at";

/** Published puzzles, newest first; RLS hides drafts from readers. */
export const publishedPuzzles = async (client: Client, lang?: GameLang) => {
  let query = client
    .schema("journal")
    .from("puzzles")
    .select(listColumns)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (lang) {
    query = query.eq("language", lang);
  }
  return (unwrap(await query) ?? []).map((row) => ({
    ...row,
    kind: row.kind as PuzzleKind,
    language: row.language as GameLang,
  }));
};

export type PuzzleData =
  | { data: Crossword; kind: "crossword" }
  | { data: WordSearch; kind: "word_search" };

/** One published puzzle with its grid; null when it is missing or broken. */
export const puzzleBySlug = async (client: Client, slug: string) => {
  const row = unwrap(
    await client
      .schema("journal")
      .from("puzzles")
      .select(`${listColumns}, note_en, note_ar, data`)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle()
  );
  if (!row) {
    return null;
  }
  const parsed = parsePuzzle(row.kind as PuzzleKind, row.data);
  return parsed
    ? { ...row, ...parsed, language: row.language as GameLang }
    : null;
};

/** Checks a stored grid against its kind. */
export const parsePuzzle = (
  kind: PuzzleKind,
  data: unknown
): PuzzleData | null => {
  if (kind === "crossword") {
    const result = crosswordSchema.safeParse(data);
    return result.success ? { data: result.data, kind } : null;
  }
  const result = wordSearchSchema.safeParse(data);
  return result.success ? { data: result.data, kind } : null;
};
