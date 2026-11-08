"use client";

import { Label } from "@repo/brand/components/ui/label";
import { cn } from "@repo/brand/lib/utils";
import { type ReactNode, useId } from "react";

export interface FieldProps {
  readonly children: (id: string) => ReactNode;
  readonly className?: string;
  readonly hint?: string;
  readonly label: string;
}

/** A labeled field; the render prop receives the control's id. */
export const Field = ({ children, className, hint, label }: FieldProps) => {
  const id = useId();
  return (
    <div className={cn("grid content-start gap-2", className)}>
      <Label htmlFor={id} id={`${id}-label`}>
        {label}
      </Label>
      {children(id)}
      {hint ? <p className="type-caption">{hint}</p> : null}
    </div>
  );
};
