import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

/**
 * SAL card: a block of related content with no fill and no border,
 * set off from its neighbours by a hairline above and space. Use it only
 * for a separate object (a ticket, a notice); lists of things are rows with
 * hairlines, not cards.
 */
export const SalCard = ({ className, ...props }: ComponentProps<"section">) => (
  <section
    className={cn("grid gap-3 border-line border-t pt-space-4", className)}
    {...props}
  />
);
