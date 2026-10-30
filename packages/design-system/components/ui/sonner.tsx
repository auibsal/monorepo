"use client"

import { Icon } from "../sal/icon"
import { Spinner } from "./spinner"
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
        loading: <Spinner aria-hidden="true" role={undefined} />,
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
