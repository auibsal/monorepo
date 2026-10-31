"use client";

import { Icon } from "@repo/design-system/components/sal/icon";
import { cn } from "@repo/design-system/lib/utils";
import { useTranslations } from "next-intl";
import { type ComponentProps, useState } from "react";

/**
 * A file field in the brand: a hairline area that takes a click or a
 * dropped file and names what was chosen, in place of the browser's
 * "Choose File / No file chosen". The real input covers the area, so a
 * click, a drop, `accept`, `multiple` and screen readers work as before.
 */
export const FileInput = ({
  className,
  onChange,
  ...props
}: Omit<ComponentProps<"input">, "type">) => {
  const t = useTranslations("common.file");
  const [names, setNames] = useState<string[]>([]);
  return (
    <span
      className={cn(
        "relative flex items-center gap-3 border border-line border-dashed px-4 py-3 text-sm focus-within:border-text hover:border-text",
        className
      )}
    >
      <Icon name="file-text" />
      <span className="grid">
        <span className="font-medium">
          {names.length > 0 ? names.join(", ") : t("choose")}
        </span>
        <span className="type-caption text-text-secondary">{t("drop")}</span>
      </span>
      <input
        {...props}
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={(event) => {
          setNames([...(event.target.files ?? [])].map((file) => file.name));
          onChange?.(event);
        }}
        type="file"
      />
    </span>
  );
};
