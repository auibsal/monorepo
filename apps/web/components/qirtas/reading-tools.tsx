"use client";

/**
 * A hairline across the top that fills as the article is read (design
 * review C15). Pure CSS on the scroll timeline (`reading-progress` in the
 * design system); browsers without it, and reduced motion, show nothing.
 */
export const ReadingProgress = () => (
  <div aria-hidden className="reading-progress print:hidden" />
);
