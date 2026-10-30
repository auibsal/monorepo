"use client";

import { Icon } from "@repo/design-system/components/sal/icon";
import { useTranslations } from "next-intl";
import { Fragment } from "react";
import { useAppLink } from "@/lib/link-context";

export interface PathItem {
  readonly href: string;
  readonly label: string;
}

/**
 * Where a detail page sits, above its title in the Diwan: "Qirtas › Newsroom
 * › the piece". Public pages say where they belong in the facts line under
 * the title instead, since the brand puts nothing above a headline there.
 */
export const PathLine = ({
  items,
}: {
  readonly items: readonly PathItem[];
}) => {
  const t = useTranslations("common");
  const Link = useAppLink();
  return (
    <nav
      aria-label={t("youAreHere")}
      className="type-caption text-text-secondary"
    >
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => (
          <Fragment key={item.href}>
            {index > 0 ? (
              <li aria-hidden="true">
                <Icon className="size-3 -rotate-90" name="chevron-down" />
              </li>
            ) : null}
            <li>
              <Link
                className="hover:text-accent hover:underline"
                href={item.href}
              >
                {item.label}
              </Link>
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
};
