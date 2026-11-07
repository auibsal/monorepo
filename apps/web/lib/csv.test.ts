import { describe, expect, test } from "vitest";
import { parseCsv } from "./csv";

describe("parseCsv", () => {
  test("names fields by the first row, with quoted commas and quotes", () => {
    const rows = parseCsv(
      'email,their_words,quote_words\r\na@auib.edu.iq,"WAR, POVERTY, FAMINE, let\'s eat cake.",yes\n' +
        'b@auib.edu.iq,"""the past"" HEMMINGWAY",yes\n\n'
    );
    expect(rows).toEqual([
      {
        email: "a@auib.edu.iq",
        quote_words: "yes",
        their_words: "WAR, POVERTY, FAMINE, let's eat cake.",
      },
      {
        email: "b@auib.edu.iq",
        quote_words: "yes",
        their_words: '"the past" HEMMINGWAY',
      },
    ]);
  });

  test("an empty field stays empty and a missing one is blank", () => {
    expect(parseCsv("a,b,c\n1,,3\n4")).toEqual([
      { a: "1", b: "", c: "3" },
      { a: "4", b: "", c: "" },
    ]);
  });
});
