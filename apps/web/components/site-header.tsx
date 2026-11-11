"use client";

import { Icon } from "@repo/brand/components/sal/icon";
import { buttonVariants } from "@repo/brand/components/ui/button";
import { cn } from "@repo/brand/lib/utils";
import { diwanPath, localizedPath } from "@repo/internationalization";
import { type Locale, locales } from "@repo/internationalization/config";
import { Link, usePathname } from "@repo/internationalization/navigation";
import NextLink from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { hasSessionCookie } from "@/lib/auth/session-cookie";
import { readWays, type Ways } from "@/lib/staff";
import { Masthead, mastheadLink } from "./masthead";

// The header's sections, the same on the site, the members' pages and the
// Diwan (decisions.md); the rest are in the footer, never both.
type SectionKey =
  | "about"
  | "company"
  | "involved"
  | "journal"
  | "events"
  | "nextStop";
// What's on · Qirtas · The Company · Next Stop · Get involved · About, with
// a Join button for visitors (decisions §19); signed in, the end of the
// line opens Membership instead.
const sections: { href: string; key: SectionKey }[] = [
  { href: "/events", key: "events" },
  { href: "/qirtas", key: "journal" },
  { href: "/company", key: "company" },
  { href: "/next-stop", key: "nextStop" },
  { href: "/get-involved", key: "involved" },
  { href: "/about", key: "about" },
];

interface SiteHeaderProps {
  /** Hide the sign-in button (on the sign-in pages themselves). */
  readonly account?: boolean;
  /** Replaces the language link (the account pages keep their query). */
  readonly language?: ReactNode;
  /**
   * Where the visitor goes beyond the site, where the page knows it (the
   * members' pages, the account, the Diwan and the partners' dashboard);
   * elsewhere the remembered hint decides.
   */
  readonly ways?: Ways;
}

interface Way {
  readonly href: string;
  readonly label: string;
}

/**
 * Desktop, for officers and partners' teams: Membership (or Account) opens
 * a short menu, itself and the Diwan or the partner's dashboard under it.
 * Closes on a choice, Escape or a click elsewhere.
 */
const MembershipMenu = ({
  extras,
  way,
}: {
  extras: readonly Way[];
  way: Way;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) {
      setOpen(false);
    }
  }, [pathname]);
  useEffect(() => {
    if (!open) {
      return;
    }
    const away = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        aria-expanded={open}
        className={cn(mastheadLink, "inline-flex items-center gap-1.5")}
        onClick={() => setOpen(!open)}
        type="button"
      >
        <Icon name="user" />
        {way.label}
        <Icon
          className={cn("size-4 transition-transform", open && "rotate-180")}
          name="chevron-down"
        />
      </button>
      {open ? (
        <ul className="divide-line border-line bg-surface absolute end-0 top-full z-50 mt-3 grid min-w-48 divide-y border">
          {[way, ...extras].map((item) => (
            <li key={item.href}>
              <NextLink
                className="hover:text-accent block px-4 py-3 text-sm font-medium whitespace-nowrap"
                href={item.href}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </NextLink>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

/** The public site's sections in the one masthead, with the way in. */
export const SiteHeader = ({
  account = true,
  language,
  ways,
}: SiteHeaderProps) => {
  const t = useTranslations("web.nav");
  const tc = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const other = (locales.find((l) => l !== locale) ?? locale) as Locale;
  // Signed in (the session cookie): the link opens the account instead of
  // asking to sign in, and Join steps aside. Read after the first render,
  // so the page itself stays the same for everyone.
  const [signedIn, setSignedIn] = useState(false);
  const [waysHint, setWaysHint] = useState<Ways | null>(null);
  // Checked again on each new page, so signing in or out shows at once.
  useEffect(() => {
    if (pathname) {
      setSignedIn(hasSessionCookie(document.cookie));
      setWaysHint(readWays(document.cookie));
    }
  }, [pathname]);
  const known = ways ?? waysHint;
  // One Membership for everyone (decisions.md).
  const way: Way = signedIn
    ? { href: localizedPath(locale, "/account"), label: t("account") }
    : { href: localizedPath(locale, "/sign-in"), label: t("signIn") };
  // The Diwan sits under Membership, for staff only (decisions.md); a partner's people have their dashboard there instead (Oct 31).
  const extras: Way[] = signedIn
    ? [
        ...(known?.diwan
          ? [{ href: localizedPath(locale, diwanPath()), label: t("diwan") }]
          : []),
        ...(known?.partner
          ? [
              {
                href: localizedPath(locale, "/partners/dashboard"),
                label: t("partner"),
              },
            ]
          : []),
      ]
    : [];

  return (
    <Masthead
      action={(() => {
        if (!account) {
          return null;
        }
        if (extras.length > 0) {
          return <MembershipMenu extras={extras} way={way} />;
        }
        return (
          <>
            <NextLink
              className={cn(mastheadLink, "inline-flex items-center gap-1.5")}
              href={way.href}
            >
              <Icon name={signedIn ? "user" : "log-in"} />
              {way.label}
            </NextLink>
            {signedIn ? null : (
              <NextLink
                className={buttonVariants({ size: "sm" })}
                href={localizedPath(locale, "/join")}
              >
                {t("join")}
              </NextLink>
            )}
          </>
        );
      })()}
      home={localizedPath(locale, "/")}
      language={
        language ?? (
          <Link
            className={cn(mastheadLink, "inline-flex items-center gap-1.5")}
            href={pathname}
            lang={other}
            locale={other}
          >
            <Icon name="globe" />
            {tc("otherLanguage")}
          </Link>
        )
      }
      menu={
        account
          ? (close) => (
              <>
                <NextLink
                  className="inline-flex items-center gap-2 font-medium"
                  href={way.href}
                  onClick={close}
                >
                  <Icon name={signedIn ? "user" : "log-in"} />
                  {way.label}
                </NextLink>
                {signedIn ? null : (
                  <NextLink
                    className={cn(buttonVariants(), "justify-self-start")}
                    href={localizedPath(locale, "/join")}
                    onClick={close}
                  >
                    {t("join")}
                  </NextLink>
                )}
                {extras.map((extra) => (
                  <NextLink
                    className="text-text-secondary hover:text-accent ms-7 font-medium"
                    href={extra.href}
                    key={extra.href}
                    onClick={close}
                  >
                    {extra.label}
                  </NextLink>
                ))}
              </>
            )
          : undefined
      }
      navLabel={tc("society")}
      search={
        <NextLink
          aria-label={t("search")}
          className={cn(mastheadLink, "inline-flex items-center")}
          href={localizedPath(locale, "/search")}
        >
          <Icon name="search" />
        </NextLink>
      }
      sections={sections.map((section) => ({
        current: pathname.startsWith(section.href),
        href: localizedPath(locale, section.href),
        label: t(section.key),
      }))}
    />
  );
};
