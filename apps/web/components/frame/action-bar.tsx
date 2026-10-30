"use client";

import { cn } from "@repo/design-system/lib/utils";
import { type ReactNode, useEffect, useRef, useState } from "react";

/**
 * The page's main action (the plan's rule: one solid button, under the
 * title). On phones, once it scrolls out of view, the same action stays in
 * a bar at the bottom of the screen, within thumb reach.
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
      {away ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-line border-t bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden print:hidden">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
};
