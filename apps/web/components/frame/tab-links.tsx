"use client";

import { cn } from "@repo/design-system/lib/utils";
import { useSearchParams } from "next/navigation";
import { useAppLink } from "@/lib/link-context";

export interface TabLink<K extends string> {
  readonly count?: number;
  readonly key: K;
  readonly label: string;
}

/**
 * Tabs that are links (the plan: every view has its own address), so a
 * filtered list can be shared: `?tab=drafts`. The first tab has no
 * parameter. Counts show what is waiting, in the accent.
 */
export const TabLinks = <K extends string>({
  label,
  param = "tab",
  pathname,
  tabs,
}: {
  readonly label: string;
  readonly param?: string;
  readonly pathname: string;
  readonly tabs: readonly TabLink<K>[];
}) => {
  const Link = useAppLink();
  const current = useSearchParams().get(param) ?? tabs[0]?.key;
  return (
    <nav aria-label={label} className="overflow-x-auto border-line border-b">
      <ul className="flex gap-x-6">
        {tabs.map((tab, index) => {
          const here = tab.key === current;
          return (
            <li className="shrink-0" key={tab.key}>
              <Link
                aria-current={here ? "page" : undefined}
                className={cn(
                  "block whitespace-nowrap border-b-[1.5px] py-3 font-medium text-sm hover:text-accent",
                  here
                    ? "border-accent text-text"
                    : "border-transparent text-text-secondary"
                )}
                href={
                  index === 0 ? pathname : `${pathname}?${param}=${tab.key}`
                }
              >
                {tab.label}
                {tab.count ? (
                  <span className="ms-1.5 text-accent">{tab.count}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
