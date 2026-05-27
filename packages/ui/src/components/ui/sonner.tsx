'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'system'}
      className="toaster group"
      // 1. Native BiDi Support: Automatically flips icon and close-button alignment for Arabic text
      dir="auto"
      toastOptions={{
        classNames: {
          toast:
            // 2. Synchronized with semantic tokens: shadow-brutalist-sm handles dark mode physics natively
            'group toast group-[.toaster]:bg-white group-[.toaster]:text-auib-charcoal dark:group-[.toaster]:bg-auib-charcoal dark:group-[.toaster]:text-white group-[.toaster]:border-2 group-[.toaster]:border-auib-charcoal dark:group-[.toaster]:border-white group-[.toaster]:shadow-brutalist-sm group-[.toaster]:rounded-none',
          description: 'group-[.toast]:text-neutral-600 dark:group-[.toast]:text-neutral-300',
          actionButton:
            'group-[.toast]:bg-auib-charcoal group-[.toast]:text-white dark:group-[.toast]:bg-white dark:group-[.toast]:text-auib-charcoal group-[.toast]:rounded-none group-[.toast]:border-2 group-[.toast]:border-transparent group-[.toast]:font-bold group-[.toast]:uppercase group-[.toast]:tracking-wider group-[.toast]:text-xs group-[.toast]:transition-all active:group-[.toast]:translate-y-0.5 active:group-[.toast]:translate-x-0.5',
          cancelButton:
            'group-[.toast]:bg-neutral-200 group-[.toast]:text-auib-charcoal dark:group-[.toast]:bg-neutral-800 dark:group-[.toast]:text-white group-[.toast]:rounded-none group-[.toast]:border-2 group-[.toast]:border-transparent group-[.toast]:font-bold group-[.toast]:uppercase group-[.toast]:tracking-wider group-[.toast]:text-xs group-[.toast]:transition-all active:group-[.toast]:translate-y-0.5 active:group-[.toast]:translate-x-0.5',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
