"use client"

import { cn } from "@repo/design-system/lib/utils"
import { useUiLabels } from "@repo/design-system/lib/labels"

/**
 * Something is loading: an open ring that turns, at the icons' 1.5 px line,
 * in the text's color.
 */
function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  const labels = useUiLabels()
  return (
    <svg
      role="status"
      aria-label={labels.loading}
      className={cn("size-4 animate-spin", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

export { Spinner }
