import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { runSteps } = await import("./steps");

const wait = (ms: number, value: unknown = ms) =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

describe("runSteps", () => {
  it("runs every step in order and keeps what each returned", async () => {
    const order: string[] = [];
    const outcome = await runSteps(
      [
        {
          name: "a",
          run: () => {
            order.push("a");
            return Promise.resolve(1);
          },
        },
        {
          name: "b",
          run: () => {
            order.push("b");
            return Promise.resolve(2);
          },
        },
      ],
      { budgetMs: 1000, stepMs: 1000 }
    );
    expect(order).toEqual(["a", "b"]);
    expect(outcome).toEqual({ done: { a: 1, b: 2 }, failed: {}, left: [] });
  });

  it("leaves a step that runs past its share, and goes on", async () => {
    const outcome = await runSteps(
      [
        { name: "slow", run: () => wait(200) },
        { name: "quick", run: () => Promise.resolve("ok") },
      ],
      { budgetMs: 1000, stepMs: 20 }
    );
    expect(outcome.left).toEqual(["slow"]);
    expect(outcome.done).toEqual({ quick: "ok" });
  });

  it("starts nothing once the budget is spent", async () => {
    let clock = 0;
    const outcome = await runSteps(
      [
        {
          name: "a",
          run: () => {
            clock = 50;
            return Promise.resolve(1);
          },
        },
        { name: "b", run: () => Promise.resolve(2) },
      ],
      { budgetMs: 40, now: () => clock, stepMs: 1000 }
    );
    expect(outcome.done).toEqual({ a: 1 });
    expect(outcome.left).toEqual(["b"]);
  });

  it("runs the steps the last run left first", async () => {
    const order: string[] = [];
    const step = (name: string) => ({
      name,
      run: () => {
        order.push(name);
        return Promise.resolve(name);
      },
    });
    await runSteps([step("a"), step("b"), step("c")], {
      budgetMs: 1000,
      first: ["c"],
      stepMs: 1000,
    });
    expect(order).toEqual(["c", "a", "b"]);
  });

  it("names a failed step and still runs the rest", async () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const outcome = await runSteps(
      [
        { name: "broken", run: () => Promise.reject(new Error("no schema")) },
        { name: "fine", run: () => Promise.resolve(true) },
      ],
      { budgetMs: 1000, stepMs: 1000 }
    );
    expect(outcome.failed).toEqual({ broken: "no schema" });
    expect(outcome.done).toEqual({ fine: true });
    error.mockRestore();
  });
});
