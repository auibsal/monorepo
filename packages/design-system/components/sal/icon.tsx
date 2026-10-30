import { createElement } from "react";
import { cn } from "../../lib/utils";
import { type IconName, iconData } from "./icon-data";

export type { IconName } from "./icon-data";

interface IconProps {
  readonly className?: string;
  /**
   * Names the icon for screen readers when it stands alone; without one it
   * sits beside its word and is hidden from them.
   */
  readonly label?: string;
  readonly name: IconName;
}

/**
 * One of the Society's icons (brand/icons: Lucide, redrawn at a 1.5 px line
 * with square ends). At the text's size (1.15 em) and in its color. Never in
 * a headline, as a bullet or as decoration (brand book, Icons).
 */
export const Icon = ({ className, label, name }: IconProps) => (
  <svg
    aria-hidden={label ? undefined : true}
    aria-label={label}
    className={cn("inline-block size-[1.15em] shrink-0", className)}
    fill="none"
    focusable="false"
    role={label ? "img" : undefined}
    stroke="currentColor"
    strokeLinecap="square"
    strokeLinejoin="miter"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    {iconData[name].map(([tag, attributes], index) =>
      // Each icon's shapes never change order, so their place is their key.
      createElement(tag, { ...attributes, key: index })
    )}
  </svg>
);
