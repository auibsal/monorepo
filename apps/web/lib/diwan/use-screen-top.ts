"use client";

import { useEffect, useRef } from "react";

/**
 * When a page swaps one screen for another in place (the form for "Check
 * your inbox"), the browser keeps the old scroll position: on a phone the
 * shorter screen leaves the reader in the footer. This takes them back to
 * the top and gives the new heading focus, without scrolling to it, so
 * screen readers announce it. It does nothing on the first render.
 */
export const useScreenTop = (screen: unknown) => {
  const shown = useRef(screen);
  useEffect(() => {
    if (Object.is(shown.current, screen)) {
      return;
    }
    shown.current = screen;
    window.scrollTo({ top: 0 });
    const heading = document.querySelector<HTMLElement>("main h1");
    if (heading) {
      heading.tabIndex = -1;
      heading.classList.add("outline-none");
      heading.focus({ preventScroll: true });
    }
  }, [screen]);
};
