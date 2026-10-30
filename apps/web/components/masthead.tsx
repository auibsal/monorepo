"use client";

import { BrandLogo } from "@repo/design-system/components/brand-logo";
import { Icon } from "@repo/design-system/components/sal/icon";
import { cn } from "@repo/design-system/lib/utils";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
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
  /** Desktop: the text link or menu at the end of the line (Sign in, Membership). */
  readonly action?: ReactNode;
  /** Where the logo leads, with the language prefix. */
  readonly home: string;
  /** The language link or button, in words. */
  readonly language: ReactNode;
  /** Phones and tablets: what the menu panel shows under the sections. */
  readonly menu?: (close: () => void) => ReactNode;
  readonly navLabel: string;
  /** The search link, an icon with its label, before the language. */
  readonly search?: ReactNode;
  readonly sections: readonly MastheadSection[];
}

/** The words in the header's utility row: Medium 14.5 px, no box. */
export const mastheadLink =
  "whitespace-nowrap py-1.5 font-medium text-[0.90625rem] hover:text-accent";

/**
 * The one header for the whole site, public pages and the portal alike:
 * one line, the lockup in the page's language (56 px, 40 px on phones), at most
 * six sections in Ubuntu Medium, sentence case, then search, the language,
 * the theme and Sign in (icons from the set, words where they could be
 * misread). A hairline below; the current section carries
 * a 1.5 px accent underline. Below the desktop width the bar keeps only the
 * logo and the menu button: the sections, the way in, search, the language
 * and the theme open in a panel under it. Links are plain links, so moving
 * between the site and the portal never reloads the page.
 */
export const Masthead = ({
  action,
  home,
  language,
  menu,
  navLabel,
  search,
  sections,
}: MastheadProps) => {
  const tc = useTranslations("common");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  // A new page (or language) closes the panel.
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) {
      setOpen(false);
    }
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-line border-b bg-surface text-text print:hidden">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6 lg:h-[4.75rem] lg:gap-10">
        <NextLink className="flex shrink-0 items-center gap-3" href={home}>
          <BrandLogo className="h-10 lg:h-14" height={56} locale={locale} />
        </NextLink>
        <nav aria-label={navLabel} className="ms-auto hidden lg:block">
          <ul className="flex items-center gap-[1.875rem]">
            {sections.map((section) => (
              <li key={section.href}>
                <NextLink
                  aria-current={section.current ? "page" : undefined}
                  className={cn(
                    mastheadLink,
                    "block border-b-[1.5px]",
                    section.current ? "border-accent" : "border-transparent"
                  )}
                  href={section.href}
                  onClick={close}
                >
                  {section.label}
                </NextLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ms-auto flex shrink-0 items-center gap-4 lg:ms-0 lg:gap-[1.375rem]">
          <div className="hidden lg:contents">
            {search}
            {language}
            <ThemeToggle />
            {action}
          </div>
          <button
            aria-expanded={open}
            aria-label={open ? tc("closeMenu") : tc("openMenu")}
            className={cn(mastheadLink, "inline-flex items-center lg:hidden")}
            onClick={() => setOpen(!open)}
            type="button"
          >
            <Icon name={open ? "x" : "menu"} />
          </button>
        </div>
      </div>
      {open ? (
        <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-line border-t bg-surface px-4 pb-8 text-text sm:px-6 lg:hidden">
          <nav aria-label={navLabel}>
            <ul className="grid">
              {sections.map((section) => (
                <li className="border-line border-b" key={section.href}>
                  <NextLink
                    aria-current={section.current ? "page" : undefined}
                    className={cn(
                      "block py-4 font-light text-[1.75rem] leading-tight tracking-[-0.02em]",
                      section.current && "text-accent"
                    )}
                    href={section.href}
                    onClick={close}
                  >
                    {section.label}
                  </NextLink>
                </li>
              ))}
            </ul>
          </nav>
          {menu ? <div className="mt-6 grid gap-4">{menu(close)}</div> : null}
          <div className="mt-6 flex items-center gap-6 border-line border-t pt-5">
            {search}
            {language}
            <ThemeToggle />
          </div>
        </div>
      ) : null}
    </header>
  );
};
