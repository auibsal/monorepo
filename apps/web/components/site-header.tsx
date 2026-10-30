"use client";

import { hasSessionCookie } from "@repo/auth/session-cookie";
import { Icon } from "@repo/design-system/components/sal/icon";
import { cn } from "@repo/design-system/lib/utils";
import { localizedPath, nexusPath } from "@repo/internationalization";
import { type Locale, locales } from "@repo/internationalization/config";
import { Link, usePathname } from "@repo/internationalization/navigation";
import NextLink from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { hasStaffCookie } from "@/lib/staff";
import { Masthead, mastheadLink } from "./masthead";

// Five sections in the header, the same on the site, the members' pages and
// the Diwan (owner, Oct 30, 2026); the rest are in the footer, never both.
type SectionKey = "about" | "involved" | "journal" | "events" | "join";
// About · What's on · Qirtas · Get involved · Join (owner, 2026-10-25):
// programs and events are one calendar, and "Get involved" opens the
// Callboard. Join is for visitors: signed in, the end of the line opens
// Membership instead.
const sections: { href: string; key: SectionKey }[] = [
  { href: "/about", key: "about" },
  { href: "/events", key: "events" },
  { href: "/qirtas", key: "journal" },
  { href: "/callboard", key: "involved" },
  { href: "/join", key: "join" },
];

interface SiteHeaderProps {
  /** Hide the sign-in button (on the sign-in pages themselves). */
  readonly account?: boolean;
  /** Replaces the language link (the account pages keep their query). */
  readonly language?: ReactNode;
  /**
   * Whether the visitor opens the Diwan, where the page knows it (the
   * members' pages and the Diwan); elsewhere the remembered hint decides.
   */
  readonly staff?: boolean;
}

interface Way {
  readonly href: string;
  readonly label: string;
}

/**
 * Desktop, for officers: Membership opens a short menu, Membership itself
 * and the Diwan under it. Closes on a choice, Escape or a click elsewhere.
 */
const MembershipMenu = ({ diwan, way }: { diwan: Way; way: Way }) => {
  const t = useTranslations("web.nav");
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
        aria-label={t("accountMenu")}
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
        <ul className="absolute end-0 top-full z-50 mt-3 grid min-w-48 divide-y divide-line border border-line bg-surface">
          {[way, diwan].map((item) => (
            <li key={item.href}>
              <NextLink
                className="block whitespace-nowrap px-4 py-3 font-medium text-sm hover:text-accent"
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
  staff,
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
  const [staffHint, setStaffHint] = useState(false);
  // Checked again on each new page, so signing in or out shows at once.
  useEffect(() => {
    if (pathname) {
      setSignedIn(hasSessionCookie(document.cookie));
      setStaffHint(hasStaffCookie(document.cookie));
    }
  }, [pathname]);
  const way: Way = signedIn
    ? { href: localizedPath(locale, "/membership"), label: t("account") }
    : { href: localizedPath(locale, "/sign-in"), label: t("signIn") };
  // The Diwan sits under Membership, for officers only (owner, Oct 30, 2026).
  const diwan: Way | null =
    signedIn && (staff ?? staffHint)
      ? { href: localizedPath(locale, nexusPath()), label: t("diwan") }
      : null;

  return (
    <Masthead
      action={(() => {
        if (!account) {
          return null;
        }
        if (diwan) {
          return <MembershipMenu diwan={diwan} way={way} />;
        }
        return (
          <NextLink
            className={cn(mastheadLink, "inline-flex items-center gap-1.5")}
            href={way.href}
          >
            <Icon name={signedIn ? "user" : "log-in"} />
            {way.label}
          </NextLink>
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
                {diwan ? (
                  <NextLink
                    className="ms-7 font-medium text-text-secondary hover:text-accent"
                    href={diwan.href}
                    onClick={close}
                  >
                    {diwan.label}
                  </NextLink>
                ) : null}
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
      sections={sections
        .filter((section) => !(signedIn && section.key === "join"))
        .map((section) => ({
          current: pathname.startsWith(section.href),
          href: localizedPath(locale, section.href),
          label: t(section.key),
        }))}
    />
  );
};
