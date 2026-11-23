import { cn } from "@repo/brand/lib/utils";
import type { ReactNode } from "react";

/**
 * The page's main action (one solid button), kept in view: a bar stuck
 * to the bottom of the screen, within thumb reach on a phone, from the
 * page's first view until its end, where it rests above the footer. Place
 * it as the last child of the page's body: CSS keeps it there (`sticky`),
 * so there is one copy of the action, and what it shows (Book, then
 * Cancel) never jumps between two.
 */
export const ActionBar = ({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) => (
  <div
    className={cn(
      "border-line bg-surface sticky bottom-0 z-30 -mx-4 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] print:hidden",
      className
    )}
  >
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {children}
    </div>
  </div>
);
