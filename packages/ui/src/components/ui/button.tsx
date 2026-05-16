import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border-2 border-auib-charcoal rounded-none text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-auib-red focus-visible:ring-offset-2 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-auib-charcoal text-white shadow-[4px_4px_0px_0px_#E63946] hover:shadow-[6px_6px_0px_0px_#E63946] hover:-translate-y-0.5 hover:-translate-x-0.5",
        outline:
          "bg-white text-auib-charcoal shadow-[4px_4px_0px_0px_#273237] hover:bg-auib-charcoal hover:text-white",
        secondary:
          "bg-gray-200 text-auib-charcoal hover:bg-gray-300 border-transparent hover:border-auib-charcoal shadow-[4px_4px_0px_0px_#273237]",
        ghost:
          "border-transparent hover:bg-auib-charcoal hover:text-white",
        destructive:
          "bg-auib-red text-white shadow-[4px_4px_0px_0px_#273237] hover:shadow-[6px_6px_0px_0px_#273237] hover:-translate-y-0.5 hover:-translate-x-0.5",
        link: "border-transparent text-auib-charcoal underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        sm: "h-8 px-3 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 px-8 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
