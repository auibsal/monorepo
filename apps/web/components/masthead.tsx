"use client";

import { BrandLogo } from "@repo/design-system/components/brand-logo";
import { Button } from "@repo/design-system/components/ui/button";
import { MenuIcon, XIcon } from "lucide-react";
import NextLink from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";
import { ThemeToggle } from "./theme-toggle";

export interface MastheadSection {
  readonly current: boolean;
  /** The full path, with the language prefix (localizedPath). */
  readonly href: string;
  readonly label: string;
}

interface MastheadProps {
  /** Desktop: the button or menu at the end of the bar. */
  readonly action?: ReactNode;
  /** Where the logo leads, with the language prefix. */
  readonly home: string;
  /** The language link or button, in words. */
  readonly language: ReactNode;
  /** Phones: what the menu panel shows under the sections. */
  readonly menu?: (close: () => void) => ReactNode;
  readonly navLabel: string;
  /** Names the part of the site, beside the logo ("The Nexus"). */
  readonly place?: string;
  readonly sections: readonly MastheadSection[];
}

/**
 * The one header for the whole site, public pages and the Nexus alike (v5):
 * sticky, ruled in the frame color, sections in tracked capitals (plain in
 * Arabic). On phones they open in an ink panel under the bar. The sections
 * are plain links, so moving between the site and the Nexus never reloads
 * the page.
 */
export const Masthead = ({
  action,
  home,
  language,
  menu,
  navLabel,
  place,
  sections,
}: MastheadProps) => {
  const tc = useTranslations("common");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  // A new page closes the panel (the links inside it close it too).
  const here = sections.find((section) => section.current)?.href;
  useEffect(() => {
    if (here !== undefined) {
      setOpen(false);
    }
  }, [here]);

  const links = (large: boolean) => (
    <ul className={large ? "grid gap-1" : "flex items-center gap-6"}>
      {sections.map((section) => (
        <li key={section.href}>
          <NextLink
            aria-current={section.current ? "page" : undefined}
            className={
              large
                ? "block border-rule border-b py-4 font-bold text-2xl text-title"
                : `type-label block border-b-2 py-1 text-xs hover:border-frame ${section.current ? "border-accent-line text-title" : "border-transparent"}`
            }
            href={section.href}
            onClick={close}
          >
            {section.label}
          </NextLink>
        </li>
      ))}
    </ul>
  );

  return (
    <header className="frame-b sticky top-0 z-40 bg-surface text-text print:hidden">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-3 sm:gap-4">
        <NextLink className="flex shrink-0 items-center gap-3" href={home}>
          <BrandLogo height={56} locale={locale} />
          {place ? (
            <span className="type-kicker hidden border-frame border-s-2 ps-3 sm:block">
              {place}
            </span>
          ) : null}
        </NextLink>
        <nav aria-label={navLabel} className="ms-auto hidden lg:block">
          {links(false)}
        </nav>
        <div className="ms-auto flex shrink-0 items-center gap-1 sm:gap-2 lg:ms-6">
          {language}
          <ThemeToggle className="hidden sm:inline-block" />
          {action}
          <Button
            aria-expanded={open}
            aria-label={open ? tc("closeMenu") : tc("openMenu")}
            className="lg:hidden"
            onClick={() => setOpen(!open)}
            size="icon"
            variant="outline"
          >
            {open ? (
              <XIcon aria-hidden="true" />
            ) : (
              <MenuIcon aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>
      {open ? (
        <div
          className="frame-t max-h-[calc(100dvh-5rem)] overflow-y-auto bg-surface px-4 pt-2 pb-8 text-text lg:hidden"
          data-theme="dark"
        >
          <nav aria-label={navLabel}>{links(true)}</nav>
          <ThemeToggle className="mt-4 px-0 sm:hidden" />
          {menu ? <div className="mt-6 grid gap-6">{menu(close)}</div> : null}
        </div>
      ) : null}
    </header>
  );
};
