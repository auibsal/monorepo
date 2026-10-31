"use client";

import { Input } from "@repo/design-system/components/ui/input";
import type { Locale } from "@repo/internationalization";
import { formatFieldValue } from "@repo/internationalization/format";
import { useLocale } from "next-intl";
import type { ComponentProps } from "react";

/**
 * A date (or date and time) field: the device's own picker, which works
 * well on phones and with screen readers, with the chosen date written
 * under it in the house format ("Friday, November 6, 2026, 6:00 PM"), so
 * the browser's numeric order (mm/dd) never decides what a reader sees.
 */
export const DateInput = ({
  type = "date",
  ...props
}: Omit<ComponentProps<typeof Input>, "type"> & {
  readonly type?: "date" | "datetime-local";
}) => {
  const locale = useLocale() as Locale;
  const value = typeof props.value === "string" ? props.value : "";
  const shown = formatFieldValue(value, locale);
  return (
    <span className="grid gap-1">
      <Input dir="ltr" {...props} type={type} />
      {shown ? (
        <span aria-live="polite" className="type-caption text-text-secondary">
          {shown}
        </span>
      ) : null}
    </span>
  );
};
