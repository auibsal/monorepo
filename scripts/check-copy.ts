#!/usr/bin/env bun
/**
 * "Say it once, say it short" (decisions.md, The site; Standards and
 * language), checked on the English messages, the source every edition
 * follows:
 *
 * 1. Your account, the Diwan and the partner dashboard (`diwan.*`) carry no
 *    introductory text: no `lede`, `intro` or `description` under a title.
 * 2. A public introduction (`web.**.lede`) is one sentence of 25 words or
 *    fewer.
 * 3. No sentence of eight words or more appears on two pages.
 * 4. Each public page's English reads at grade 9 or below (Flesch–Kincaid).
 *
 * `bun run check:copy`; `--report` prints the totals instead of failing.
 */
import en from "../packages/internationalization/messages/en.json";

interface Tree {
  [key: string]: string | Tree;
}

const leaves = (tree: Tree, path: string[] = []): [string[], string][] =>
  Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string"
      ? [[[...path, key], value] as [string[], string]]
      : leaves(value, [...path, key])
  );

const all = leaves(en as unknown as Tree);
const WORD = /[A-Za-z’'-]+/gu;
const words = (text: string) => text.match(WORD)?.length ?? 0;
const ICU = /\{[^{}]*\}/gu;
const plain = (text: string) => text.replace(ICU, "it");
const SENTENCE_END = /(?<=[.?!])\s+(?=[A-Z“"])/u;
const sentences = (text: string) =>
  plain(text)
    .split(SENTENCE_END)
    .map((s) => s.trim())
    .filter(Boolean);

const INTRO = /^(lede|intro|description|[a-z]+Lede|[a-z]+Intro)$/u;
const PUBLIC_LEDE = /^(lede|sentence|[a-z]+Lede)$/u;

const problems: string[] = [];
const report = process.argv.includes("--report");

// 1. Titles only in the private spaces.
// Labels ("Description") aren't introductions: six words or more are.
const privateIntros = all.filter(
  ([path, text]) =>
    path[0] === "diwan" && INTRO.test(path.at(-1) ?? "") && words(text) >= 6
);
for (const [path] of privateIntros) {
  problems.push(
    `${path.join(".")}: an introduction in Your account or the Diwan`
  );
}

// 2. One short sentence under a public title.
for (const [path, text] of all) {
  // Public pages, and the public pages framed like the account (`sentence`).
  const last = path.at(-1) ?? "";
  if (!PUBLIC_LEDE.test(last) || (path[0] !== "web" && last !== "sentence")) {
    continue;
  }
  const count = sentences(text).length;
  if (count > 1 || words(text) > 25) {
    problems.push(
      `${path.join(".")}: a public introduction of ${count} sentences, ${words(text)} words`
    );
  }
}

// 3. Each sentence once: the same sentence on two pages.
const page = (path: string[]) => path.slice(0, 3).join(".");
const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
const seen = new Map<string, string>();
// An agreement's full text quotes the Policy Manual word for word.
const QUOTED = /^diwan\.journal\.agreement\./u;
for (const [path, text] of all) {
  if (QUOTED.test(path.join("."))) {
    continue;
  }
  for (const sentence of sentences(text)) {
    if (words(sentence) < 8) {
      continue;
    }
    const key = normalize(sentence);
    const first = seen.get(key);
    if (first === undefined) {
      seen.set(key, path.join("."));
    } else if (page(first.split(".")) !== page(path)) {
      problems.push(`${path.join(".")}: repeats ${first} ("${sentence}")`);
    }
  }
}

// 4. Plain language: Flesch–Kincaid grade of each public page's English.
const NOT_LETTER = /[^a-z]/gu;
const SILENT_END = /(?:[^laeiouy]es|ed|[^laeiouy]e)$/u;
const LEADING_Y = /^y/u;
const VOWELS = /[aeiouy]{1,2}/gu;
const syllables = (word: string) => {
  const w = word.toLowerCase().replace(NOT_LETTER, "");
  if (w.length <= 3) {
    return 1;
  }
  const groups = w.replace(SILENT_END, "").replace(LEADING_Y, "").match(VOWELS);
  return Math.max(1, groups?.length ?? 1);
};
const grade = (texts: string[]) => {
  const text = texts.map(plain).join(" ");
  const ws = text.match(WORD) ?? [];
  const ss = Math.max(1, texts.flatMap(sentences).length);
  const sy = ws.reduce((sum, w) => sum + syllables(w), 0);
  return ws.length === 0
    ? 0
    : 0.39 * (ws.length / ss) + 11.8 * (sy / ws.length) - 15.59;
};
const MAX_GRADE = 9;
const pages = new Map<string, string[]>();
for (const [path, text] of all) {
  // Running text only: labels and buttons are not prose.
  if (path[0] !== "web" || words(text) < 6) {
    continue;
  }
  const key = path.slice(0, 2).join(".");
  pages.set(key, [...(pages.get(key) ?? []), text]);
}
// The formula needs about a hundred words to mean anything.
const MIN_GRADED_WORDS = 100;
for (const [key, texts] of pages) {
  const g = grade(texts);
  const count = texts.reduce((sum, text) => sum + words(text), 0);
  if (count >= MIN_GRADED_WORDS && g > MAX_GRADE) {
    problems.push(`${key}: reads at grade ${g.toFixed(1)}, above ${MAX_GRADE}`);
  }
}

if (report) {
  const total = all.reduce((sum, [, text]) => sum + words(text), 0);
  const intros = all.filter(([path]) => INTRO.test(path.at(-1) ?? ""));
  console.log(
    JSON.stringify(
      {
        englishWords: total,
        introductions: intros.length,
        introductionsOf15Words: intros.filter(([, t]) => words(t) >= 15).length,
        over30Words: all.filter(([, t]) => words(t) > 30).length,
        problems: problems.length,
      },
      null,
      2
    )
  );
  for (const problem of problems) {
    console.log(`  ${problem}`);
  }
  process.exit(0);
}
if (problems.length > 0) {
  console.error("Say it once, say it short (decisions.md, The site):");
  for (const problem of problems) {
    console.error(`  ${problem}`);
  }
  process.exit(1);
}
console.log("Copy: every page says it once, short.");
