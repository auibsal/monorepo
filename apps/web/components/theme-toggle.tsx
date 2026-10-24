"use client";

import { cn } from "@repo/design-system/lib/utils";
import { useTranslations } from "next-intl";
import { chooseTheme, currentTheme } from "@/lib/theme";

/**
 * Switches between light and dark mode, in words (the brand keeps icons to
 * the functional set). The label is picked by CSS from the theme on <html>,
 * so it is right from the first paint, before React runs.
 */
export const ThemeToggle = ({ className }: { className?: string }) => {
  const t = useTranslations("common.theme");
  return (
    <button
      className={cn(
        "whitespace-nowrap px-2 py-1 text-sm underline-offset-4 hover:underline",
        className
      )}
      onClick={() => chooseTheme(currentTheme() === "dark" ? "light" : "dark")}
      type="button"
    >
      <span className="[:root[data-theme=dark]_&]:hidden">{t("dark")}</span>
      <span className="hidden [:root[data-theme=dark]_&]:inline">
        {t("light")}
      </span>
    </button>
  );
};
