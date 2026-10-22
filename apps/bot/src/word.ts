import {
  dailyAnswer,
  type GameLang,
  gameDay,
  gameNumber,
  lettersOf,
  MAX_GUESSES,
  normalizeWord,
  scoreGuess,
  WORD_LENGTH,
} from "@repo/sal-data/games";

/**
 * The daily word guess (the same word as auibsal.org/waraq/games/word),
 * played in a private chat. Marks are drawn with typographic symbols, not
 * emoji: ● right place, ○ in the word, · not in it.
 */

const SYMBOL = { hit: "●", miss: "·", near: "○" } as const;

export interface Round {
  answer: string[];
  day: number;
  number: number;
}

export const today = (lang: GameLang, date = new Date()): Round => {
  const day = gameDay(date);
  return { answer: dailyAnswer(lang, day), day, number: gameNumber(day) };
};

/** The guess's letters, or null when it isn't a five-letter word. */
export const readGuess = (text: string, lang: GameLang) => {
  const letters = lettersOf(normalizeWord(text.trim(), lang));
  return letters.length === WORD_LENGTH ? letters : null;
};

export const marksOf = (answer: string[], guess: string[]) =>
  scoreGuess(answer, guess).map((mark) => SYMBOL[mark]);

// Right-to-left mark: an Arabic row of marks reads from the right like the
// letters above it (the symbols have no direction of their own).
const RLM = "\u200f";

/** The board in a monospace block: each guess's letters over its marks. */
export const board = (answer: string[], guesses: string[], lang: GameLang) =>
  guesses
    .map((guess) => {
      const letters = lettersOf(guess);
      const marks = marksOf(answer, letters).join(" ");
      return `${letters.join(" ")}\n${lang === "ar" ? RLM : ""}${marks}`;
    })
    .join("\n\n");

/** The marks only, for sharing without giving the word away. */
export const shareGrid = (answer: string[], guesses: string[]) =>
  guesses.map((guess) => marksOf(answer, lettersOf(guess)).join("")).join("\n");

export const solved = (answer: string[], guesses: string[]) =>
  guesses.some((guess) => guess === answer.join(""));

export const finished = (answer: string[], guesses: string[]) =>
  solved(answer, guesses) || guesses.length >= MAX_GUESSES;
