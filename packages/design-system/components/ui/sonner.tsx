"use client"

import { Icon } from "../sal/icon"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  // SAL: light only; functional icons only (check, loading).
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <Icon name="check" />,
        info: <Icon name="info" />,
        warning: <Icon name="circle-alert" />,
        error: <Icon name="circle-alert" />,
        loading: (
          <span
            aria-hidden="true"
            className="inline-block size-4 animate-spin border-[1.5px] border-current border-t-transparent"
          />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
