import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

/**
 * SAL card (v5 Screens): surface-tint ground, square, a 2px frame. Add
 * `` for a card that is a single action or feature.
 */
export const SalCard = ({ className, ...props }: ComponentProps<"section">) => (
  <section
    className={cn(
      "grid gap-3 border border-line border-t p-space-4",
      className
    )}
    {...props}
  />
);
