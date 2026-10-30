"use client";

import { Icon } from "@repo/design-system/components/sal/icon";
import { cn } from "@repo/design-system/lib/utils";
import { useTranslations } from "next-intl";
import { chooseTheme, currentTheme } from "@/lib/theme";

/**
 * Switches between light and dark mode: the moon or the sun alone, named
 * for screen readers (brand book, Icons). Which one shows is picked by CSS
 * from the theme on <html>, so it is right from the first paint, before
 * React runs.
 */
export const ThemeToggle = ({ className }: { className?: string }) => {
  const t = useTranslations("common.theme");
  return (
    <button
      className={cn(
        "inline-flex items-center py-1.5 font-medium text-[0.90625rem] hover:text-accent",
        className
      )}
      onClick={() => chooseTheme(currentTheme() === "dark" ? "light" : "dark")}
      type="button"
    >
      <span className="inline-flex [:root[data-theme=dark]_&]:hidden">
        <Icon name="moon" />
        <span className="sr-only">{t("dark")}</span>
      </span>
      <span className="hidden [:root[data-theme=dark]_&]:inline-flex">
        <Icon name="sun" />
        <span className="sr-only">{t("light")}</span>
      </span>
    </button>
  );
};
