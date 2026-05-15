import { test } from "node:test";
import assert from "node:assert";
import { cn } from "./utils.ts";

test("cn utility", async (t) => {
  await t.test("concatenates strings", () => {
    assert.strictEqual(cn("foo", "bar"), "foo bar");
  });

  await t.test("handles conditional classes", () => {
    assert.strictEqual(cn("foo", true && "bar", false && "baz"), "foo bar");
    assert.strictEqual(cn("foo", null, undefined, "bar"), "foo bar");
  });

  await t.test("handles objects", () => {
    assert.strictEqual(cn({ foo: true, bar: false, baz: true }), "foo baz");
  });

  await t.test("handles arrays", () => {
    assert.strictEqual(cn(["foo", "bar"], "baz"), "foo bar baz");
  });

  await t.test("handles nested arrays and objects", () => {
    assert.strictEqual(cn(["foo", ["bar", { baz: true }]]), "foo bar baz");
  });

  await t.test("merges tailwind classes correctly", () => {
    // twMerge should prioritize the last class for the same property
    assert.strictEqual(cn("px-2 py-1", "px-4"), "py-1 px-4");
    assert.strictEqual(cn("text-red-500", "text-blue-500"), "text-blue-500");
  });

  await t.test("handles complex tailwind conflicts", () => {
    assert.strictEqual(cn("p-4", "pt-2"), "p-4 pt-2"); // pt-2 is more specific or a subset, but usually p-4 then pt-2 results in both or overwritten.
    // Actually twMerge handles: p-4 pt-2 -> p-4 pt-2 (padding-top is overwritten if it comes later)
    assert.strictEqual(cn("pt-2", "p-4"), "p-4"); 
  });
});
