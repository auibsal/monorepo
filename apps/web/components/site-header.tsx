"use client";

import { hasSessionCookie } from "@repo/auth/session-cookie";
import { cn } from "@repo/design-system/lib/utils";
import { localizedPath } from "@repo/internationalization";
import { type Locale, locales } from "@repo/internationalization/config";
import { Link, usePathname } from "@repo/internationalization/navigation";
import NextLink from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";
import { Masthead, mastheadLink } from "./masthead";

// Five sections in the header; the rest are in the footer.
type SectionKey = "about" | "involved" | "journal" | "events" | "join";
// About · What's on · Qirtas · Get involved · Join (owner, 2026-10-25):
// programs and events are one calendar, and "Get involved" opens the
// Callboard. Programs moved to the footer.
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
}

/** The public site's sections in the one masthead, with the way in. */
export const SiteHeader = ({ account = true, language }: SiteHeaderProps) => {
  const t = useTranslations("web.nav");
  const tc = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const other = (locales.find((l) => l !== locale) ?? locale) as Locale;
  // Signed in (the session cookie): the link opens the account instead of
  // asking to sign in. Read after the first render, so the page itself
  // stays the same for everyone.
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => setSignedIn(hasSessionCookie(document.cookie)), []);
  const way = signedIn
    ? { href: localizedPath(locale, "/membership"), label: t("account") }
    : { href: localizedPath(locale, "/sign-in"), label: t("signIn") };

  return (
    <Masthead
      action={
        account ? (
          <NextLink
            className={cn(mastheadLink, "hidden sm:inline")}
            href={way.href}
          >
            {way.label}
          </NextLink>
        ) : null
      }
      home={localizedPath(locale, "/")}
      language={
        language ?? (
          <Link
            className={mastheadLink}
            href={pathname}
            lang={other}
            locale={other}
          >
            {tc("otherLanguage")}
          </Link>
        )
      }
      menu={
        account
          ? (close) => (
              <NextLink className="link" href={way.href} onClick={close}>
                {way.label}
              </NextLink>
            )
          : undefined
      }
      navLabel={tc("society")}
      sections={sections.map((section) => ({
        current: pathname.startsWith(section.href),
        href: localizedPath(locale, section.href),
        label: t(section.key),
      }))}
    />
  );
};
