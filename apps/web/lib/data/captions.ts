/**
 * The DCMP Captioning Key's line rules for a WebVTT caption file
 * (decisions.md, Frameworks followed: Publishing; Next Stop: captions): at
 * most two lines on screen at once, each of at most 32 characters. Returns
 * the cues that break them, by their order in the file.
 */
export const MAX_LINE = 32;
const MAX_LINES = 2;

export interface CaptionProblem {
  /** The cue's number, counting from 1. */
  readonly cue: number;
  readonly kind: "long_line" | "too_many_lines";
  readonly text: string;
}

const TIMING = /-->/u;
const TAGS = /<[^>]+>/gu;
const BLANK_LINES = /\r?\n\s*\r?\n/u;
const LINE = /\r?\n/u;

export const captionProblems = (vtt: string): CaptionProblem[] => {
  const problems: CaptionProblem[] = [];
  let cue = 0;
  for (const block of vtt.split(BLANK_LINES)) {
    const lines = block.split(LINE);
    const at = lines.findIndex((line) => TIMING.test(line));
    if (at === -1) {
      continue;
    }
    cue += 1;
    const text = lines
      .slice(at + 1)
      .map((line) => line.replace(TAGS, "").trim())
      .filter(Boolean);
    if (text.length > MAX_LINES) {
      problems.push({ cue, kind: "too_many_lines", text: text.join(" / ") });
    }
    for (const line of text) {
      if ([...line].length > MAX_LINE) {
        problems.push({ cue, kind: "long_line", text: line });
      }
    }
  }
  return problems;
};
