import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@repo/design-system/lib/utils"
import { Slot } from "radix-ui"

// SAL v6: one solid `accent` button per view, 48–50 px, square, sentence
// case. Every other variant is an underlined text link (no frames, no
// offset blocks, no tracked capitals); icon sizes stay square.
const linkLook =
  "text-text underline decoration-1 underline-offset-4 hover:text-accent"
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 font-medium text-[0.9375rem] whitespace-nowrap outline-none disabled:pointer-events-none disabled:opacity-50 aria-invalid:text-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: linkLook,
        outline: linkLook,
        secondary: linkLook,
        ghost: "text-text hover:underline hover:underline-offset-4",
        link: linkLook,
      },
      size: {
        default: "h-12 px-6 has-[>svg]:px-5",
        xs: "h-7 gap-1 px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-10 gap-1.5 px-4 text-sm has-[>svg]:px-3",
        lg: "h-[3.125rem] px-[1.625rem] has-[>svg]:px-6",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    compoundVariants: [
      {
        // Text links sit on the line, with no button box around them.
        variant: ["destructive", "outline", "secondary", "ghost", "link"],
        size: ["default", "xs", "sm", "lg"],
        class: "h-auto px-0 py-1 has-[>svg]:px-0",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
