"use client";

import { Icon } from "@repo/brand/components/sal/icon";
import { cn } from "@repo/brand/lib/utils";
import { useTranslations } from "next-intl";
import type { ComponentType, ReactNode } from "react";

export interface MenuItem {
  /** Waiting items, shown in the accent. */
  readonly count?: number;
  readonly href: string;
  /** Its own views, shown under it while it is open. */
  readonly items?: readonly MenuItem[];
  readonly key: string;
  readonly label: string;
}

type LinkLike = ComponentType<{
  readonly "aria-current"?: "page";
  readonly children: ReactNode;
  readonly className?: string;
  readonly href: string;
}>;

/** The item a path is on: itself, or the one holding it most closely. */
export const itemHere = (
  items: readonly MenuItem[],
  pathname: string,
  root = "/"
) => {
  let best: MenuItem | undefined;
  for (const item of items) {
    const holds =
      pathname === item.href ||
      (item.href !== root && pathname.startsWith(`${item.href}/`));
    if (holds && (!best || item.href.length > best.href.length)) {
      best = item;
    }
  }
  return best;
};

const Entry = ({
  item,
  link: Link,
  nested,
  open,
  pathname,
}: {
  readonly item: MenuItem;
  readonly link: LinkLike;
  readonly nested: boolean;
  readonly open: boolean;
  readonly pathname: string;
}) => {
  const current = pathname === item.href;
  const label = (
    <>
      {item.label}
      {item.count ? (
        <span className="text-accent ms-1.5">{item.count}</span>
      ) : null}
    </>
  );
  const style = cn(
    "block border-s-[1.5px] py-2 ps-3 text-sm",
    nested ? "ms-3" : "font-medium",
    open || current
      ? "border-accent text-text"
      : "text-text-secondary hover:text-accent border-transparent"
  );
  // The page shown is named, never a link to itself.
  return current ? (
    <span aria-current="page" className={style}>
      {label}
    </span>
  ) : (
    <Link className={style} href={item.href}>
      {label}
    </Link>
  );
};

const List = ({
  items,
  link,
  pathname,
  root,
}: {
  readonly items: readonly MenuItem[];
  readonly link: LinkLike;
  readonly pathname: string;
  readonly root: string;
}) => {
  const here = itemHere(items, pathname, root);
  return (
    <ul className="grid gap-0.5">
      {items.map((item) => {
        const open = item.key === here?.key;
        const views = open && item.items && item.items.length > 1;
        const view = views ? itemHere(item.items ?? [], pathname, root) : null;
        return (
          <li key={item.key}>
            <Entry
              item={item}
              link={link}
              nested={false}
              open={open && pathname !== item.href}
              pathname={pathname}
            />
            {views ? (
              <ul className="grid gap-0.5">
                {(item.items ?? []).map((child) => (
                  <li key={child.key}>
                    <Entry
                      item={child}
                      link={link}
                      nested
                      open={view?.key === child.key && pathname !== child.href}
                      pathname={pathname}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
};

/**
 * The one side menu (decisions.md, The site: one navigation standard) for
 * Your account, the Diwan and the partner dashboard: a vertical list on a
 * computer and behind a Menu button on a phone, the current page marked
 * and never a link to itself. The header stays the only menu across the
 * top; tabs are only for the views of one record or list.
 */
export const SideMenu = ({
  items,
  label,
  link,
  pathname,
  root = "/",
}: {
  readonly items: readonly MenuItem[];
  readonly label: string;
  readonly link: LinkLike;
  readonly pathname: string;
  /** The space's own first page, which holds no other. */
  readonly root?: string;
}) => {
  const t = useTranslations("common");
  if (items.length === 0) {
    return null;
  }
  return (
    <nav aria-label={label} className="print:hidden">
      <details className="group border-line border-b lg:hidden" key={pathname}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <span>{t("menu")}</span>
          <Icon
            className="size-4 transition-transform group-open:rotate-180"
            name="chevron-down"
          />
        </summary>
        <div className="pb-3">
          <List items={items} link={link} pathname={pathname} root={root} />
        </div>
      </details>
      <div className="sticky top-6 hidden pt-12 sm:pt-16 lg:block">
        <List items={items} link={link} pathname={pathname} root={root} />
      </div>
    </nav>
  );
};

/**
 * A deep page's way back (decisions.md, The site): the breadcrumb to it
 * and a link back to the list it came from.
 */
export const Breadcrumb = ({
  items,
  link: Link,
  pathname,
  root = "/",
}: {
  readonly items: readonly MenuItem[];
  readonly link: LinkLike;
  readonly pathname: string;
  readonly root?: string;
}) => {
  const t = useTranslations("common");
  const top = itemHere(items, pathname, root);
  if (!top) {
    return null;
  }
  const view = top.items ? itemHere(top.items, pathname, root) : undefined;
  const trail = view && view.href !== top.href ? [top, view] : [top];
  const back = trail.at(-1) ?? top;
  return (
    <nav
      aria-label={t("breadcrumb")}
      className="type-caption flex flex-wrap items-center gap-x-4 gap-y-1 pt-6 print:hidden"
    >
      <ol className="flex flex-wrap items-center gap-x-2">
        {trail.map((item, index) => (
          <li className="flex items-center gap-x-2" key={item.key}>
            {index > 0 ? <span aria-hidden="true">›</span> : null}
            <Link className="link" href={item.href}>
              {item.label}
            </Link>
          </li>
        ))}
      </ol>
      <Link className="link" href={back.href}>
        {t("backTo", { place: back.label })}
      </Link>
    </nav>
  );
};
