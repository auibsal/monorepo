import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { formAnswers } = await import("@/lib/api/form-answers");

describe("a signed form's answers in the signer's copy", () => {
  test("lists answers with their labels, in the form's order", () => {
    const lines = formAnswers("en", "f39", {
      language: "English",
      piece_title: "The River",
      student_agrees: true,
    });
    expect(lines.map((l) => l.value)).toEqual(["The River", "English", "Yes"]);
    expect(lines.every((l) => l.label.length > 0)).toBe(true);
  });

  test("leaves out what wasn't answered, and unknown forms", () => {
    expect(formAnswers("en", "f39", {})).toEqual([]);
    expect(formAnswers("en", "nope", { a: 1 })).toEqual([]);
  });

  test("speaks the recipient's language", () => {
    expect(formAnswers("ar", "f39", { student_agrees: true })[0]?.value).toBe(
      "نعم"
    );
  });
});
