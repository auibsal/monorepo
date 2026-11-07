"use client";

// A reader's progress in a game is kept in their own browser only; a
// private window or blocked storage just starts the game fresh. The prefix
// changed with the daily games (decisions.md), so every count and
// streak started again.

export const loadProgress = <T>(key: string): T | null => {
  try {
    const raw = window.localStorage.getItem(`qirtas-games:${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export const saveProgress = (key: string, value: unknown) => {
  try {
    window.localStorage.setItem(`qirtas-games:${key}`, JSON.stringify(value));
  } catch {
    // Storage is unavailable; the game still works for this visit.
  }
};
