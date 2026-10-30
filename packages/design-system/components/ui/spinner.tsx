"use client"

import { cn } from "@repo/design-system/lib/utils"
import { useUiLabels } from "@repo/design-system/lib/labels"

/**
 * Something is loading: a square of hairline that turns, in the text's
 * color. The icon set has no spinner, so it draws none (brand book, Icons).
 */
function Spinner({ className, ...props }: React.ComponentProps<"span">) {
  const labels = useUiLabels()
  return (
    <span
      role="status"
      aria-label={labels.loading}
      className={cn(
        "inline-block size-4 animate-spin border-[1.5px] border-current border-t-transparent",
        className
      )}
      {...props}
    />
  )
}

export { Spinner }
