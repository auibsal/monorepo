"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-neutral-950 group-[.toaster]:border-2 group-[.toaster]:border-auib-charcoal group-[.toaster]:shadow-[4px_4px_0px_0px_#273237] group-[.toaster]:rounded-none",
          description: "group-[.toast]:text-neutral-500",
          actionButton:
            "group-[.toast]:bg-auib-charcoal group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-neutral-100 group-[.toast]:text-neutral-500",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
