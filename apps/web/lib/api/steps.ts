import "server-only";

import { parseError } from "@/lib/observability/error";
import { log } from "@/lib/observability/log";

/** One step of a scheduled route: a name and the work. */
export interface Step {
  name: string;
  run: () => Promise<unknown>;
}

export interface StepsOutcome {
  /** What each step that finished returned. */
  done: Record<string, unknown>;
  /** Steps that failed, with the error's message. */
  failed: Record<string, string>;
  /** Steps left for the next run: not started in time, or out of time. */
  left: string[];
}

const OUT_OF_TIME = Symbol("out of time");

const timeLeft = <T>(work: Promise<T>, ms: number) =>
  new Promise<T | typeof OUT_OF_TIME>((resolve, reject) => {
    const timer = setTimeout(() => resolve(OUT_OF_TIME), Math.max(ms, 0));
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

/**
 * Runs a scheduled route's steps one after another within a time budget
 * (Vercel stops a route at 60 seconds; decisions.md, The site: no silent
 * failures). A step that would start after the budget is spent waits for
 * the next run; one that runs past its own share is left behind and named;
 * one that fails doesn't stop the others. Steps named in `first` (those
 * the last run left) go first, so a slow step can't starve the rest.
 */
export const runSteps = async (
  steps: Step[],
  {
    budgetMs,
    first = [],
    hardStopMs = budgetMs,
    now = Date.now,
    stepMs,
  }: {
    /** No step starts after this. */
    budgetMs: number;
    first?: string[];
    /** No step runs past this, from the start. */
    hardStopMs?: number;
    now?: () => number;
    /** No step runs longer than this. */
    stepMs: number;
  }
): Promise<StepsOutcome> => {
  const start = now();
  const ordered = [
    ...steps.filter((s) => first.includes(s.name)),
    ...steps.filter((s) => !first.includes(s.name)),
  ];
  const outcome: StepsOutcome = { done: {}, failed: {}, left: [] };
  for (const step of ordered) {
    const elapsed = now() - start;
    if (elapsed >= budgetMs) {
      outcome.left.push(step.name);
      continue;
    }
    try {
      const share = Math.min(stepMs, hardStopMs - elapsed);
      // biome-ignore lint/performance/noAwaitInLoops: one step at a time, within the budget
      const value = await timeLeft(step.run(), share);
      if (value === OUT_OF_TIME) {
        outcome.left.push(step.name);
        log.warn("step out of time", { step: step.name });
      } else {
        outcome.done[step.name] = value;
      }
    } catch (error) {
      outcome.failed[step.name] =
        error instanceof Error ? error.message : String(error);
      log.error("step failed", { error: parseError(error), step: step.name });
    }
  }
  return outcome;
};
