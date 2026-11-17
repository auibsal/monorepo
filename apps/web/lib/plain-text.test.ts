import { describe, expect, test } from "vitest";
import { withoutTags } from "./plain-text";

describe("text without markup", () => {
  test("tags go, words stay", () => {
    expect(withoutTags("<v Host>Next stop</v>").trim()).toBe("Next stop");
  });
  test("nested and broken tags leave nothing behind", () => {
    expect(withoutTags("a<<script>script>b")).not.toContain("<");
    expect(withoutTags("a<scr<script>ipt>b")).not.toContain("script");
  });
});
