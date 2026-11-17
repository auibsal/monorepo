import { describe, expect, test } from "vitest";
import { captionProblems } from "./captions";

const vtt = (cues: string) => `WEBVTT\n\n${cues}\n`;

describe("the DCMP caption check", () => {
  test("two short lines pass", () => {
    expect(
      captionProblems(
        vtt("00:00:01.000 --> 00:00:03.000\nNext stop:\nal-Mutanabbi Street")
      )
    ).toEqual([]);
  });
  test("a line over 32 characters is named", () => {
    expect(
      captionProblems(
        vtt(
          "1\n00:00:01.000 --> 00:00:03.000\nThis line is much too long to read in time"
        )
      )
    ).toEqual([
      {
        cue: 1,
        kind: "long_line",
        text: "This line is much too long to read in time",
      },
    ]);
  });
  test("three lines at once are too many", () => {
    expect(
      captionProblems(
        vtt("00:00:01.000 --> 00:00:03.000\nOne\nTwo\nThree")
      ).map((p) => p.kind)
    ).toEqual(["too_many_lines"]);
  });
  test("Arabic counts letters, and tags are not text", () => {
    expect(
      captionProblems(
        vtt(
          "00:00:01.000 --> 00:00:03.000\n<v Host>المحطة التالية: شارع المتنبي"
        )
      )
    ).toEqual([]);
  });
});
