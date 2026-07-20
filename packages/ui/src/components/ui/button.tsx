import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';

const buttonVariants = cva(
  // The Math Fix: Translating by 1 (4px) perfectly erases the base 4px shadow on click.
  "group/button inline-flex shrink-0 items-center justify-center rounded-none border-2 border-auib-charcoal text-sm font-bold tracking-wider whitespace-nowrap uppercase transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-auib-red focus-visible:ring-offset-2 active:translate-x-1 active:translate-y-1 active:shadow-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          // Synchronized with semantic tokens: shadow-brutalist-red and var(--color-auib-red)
          'bg-auib-charcoal text-white shadow-brutalist-red hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_var(--color-auib-red)]',
        outline:
          'bg-white text-auib-charcoal shadow-brutalist-sm hover:bg-auib-charcoal hover:text-white',
        secondary:
          'border-transparent bg-gray-200 text-auib-charcoal shadow-brutalist-sm hover:border-auib-charcoal hover:bg-gray-300',
        ghost: 'border-transparent hover:bg-auib-charcoal hover:text-white',
        destructive:
          // Synchronized with semantic tokens: var(--brutalist-shadow) respects dark mode flips
          'bg-auib-red text-white shadow-brutalist-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_var(--brutalist-shadow)]',
        link: 'border-transparent text-auib-charcoal underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        sm: "h-8 px-3 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-12 px-8 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ButtonPrimitive> & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      aria-disabled={props.disabled}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
