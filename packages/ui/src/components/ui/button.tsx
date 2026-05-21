import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { type VariantProps, cva } from 'class-variance-authority';

import { cn } from '../../lib/utils';

const buttonVariants = cva(
  // 1. Math Fix: Changed active translations to 4px (1 in Tailwind scale) to perfectly erase the base 4px shadow.
  "group/button border-auib-charcoal focus-visible:ring-auib-red inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-none border-2 text-sm font-bold uppercase tracking-wider outline-none transition-all focus-visible:ring-2 focus-visible:ring-offset-2 active:translate-x-1 active:translate-y-1 active:shadow-none disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          'bg-auib-charcoal text-white shadow-[4px_4px_0px_0px_#E63946] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#E63946]',
        outline:
          'text-auib-charcoal hover:bg-auib-charcoal bg-white shadow-[4px_4px_0px_0px_#273237] hover:text-white',
        secondary:
          'text-auib-charcoal hover:border-auib-charcoal border-transparent bg-gray-200 shadow-[4px_4px_0px_0px_#273237] hover:bg-gray-300',
        ghost: 'hover:bg-auib-charcoal border-transparent hover:text-white',
        destructive:
          'bg-auib-red text-white shadow-[4px_4px_0px_0px_#273237] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#273237]',
        link: 'text-auib-charcoal border-transparent underline-offset-4 hover:underline',
      },
      size: {
        default: 'has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 h-10 px-4 py-2',
        sm: "has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 h-8 px-3 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4 h-12 px-8 text-base',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

function Button({
  className,
  variant,
  size,
  ...props
  // 2. Used React 19's native ref passthrough compatibility via standard props
}: React.ComponentProps<typeof ButtonPrimitive> & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
