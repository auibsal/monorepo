"use client";

import { cn } from "@repo/brand/lib/utils";
import { type ReactNode, useEffect, useRef, useState } from "react";

/**
 * The page's main action (the plan's rule: one solid button, under the
 * title). Once it scrolls out of view, the same action stays in a bar at
 * the bottom of the screen (within thumb reach on a phone) until the
 * footer comes into view.
 */
export const ActionBar = ({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [away, setAway] = useState(false);
  const [atFooter, setAtFooter] = useState(false);
  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(([entry]) =>
      setAtFooter(entry?.isIntersecting ?? false)
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(([entry]) =>
      setAway(
        entry
          ? !entry.isIntersecting && entry.boundingClientRect.top < 0
          : false
      )
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        className={cn("flex flex-wrap items-center gap-x-6 gap-y-3", className)}
        ref={ref}
      >
        {children}
      </div>
      {away && !atFooter ? (
        <div className="border-line bg-surface fixed inset-x-0 bottom-0 z-30 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] print:hidden">
          <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-6 gap-y-2">
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
};
