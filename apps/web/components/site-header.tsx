"use client";

import { hasSessionCookie } from "@repo/auth/session-cookie";
import { Button } from "@repo/design-system/components/ui/button";
import { localizedPath, nexusPath } from "@repo/internationalization";
import { type Locale, locales } from "@repo/internationalization/config";
import { Link, usePathname } from "@repo/internationalization/navigation";
import NextLink from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";
import { Masthead } from "./masthead";

// Five sections in the header (v5); Give, News and Documents are in the footer.
type SectionKey = "about" | "programs" | "journal" | "events" | "join";
const sections: { href: string; key: SectionKey }[] = [
  { href: "/about", key: "about" },
  { href: "/programs", key: "programs" },
  { href: "/waraq", key: "journal" },
  { href: "/events", key: "events" },
  { href: "/join", key: "join" },
];

interface SiteHeaderProps {
  /** Hide the sign-in button (on the sign-in pages themselves). */
  readonly account?: boolean;
  /** Replaces the language link (the Nexus pages keep their query). */
  readonly language?: ReactNode;
}

/** The public site's sections in the one masthead, with the way in. */
export const SiteHeader = ({ account = true, language }: SiteHeaderProps) => {
  const t = useTranslations("web.nav");
  const tc = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const other = (locales.find((l) => l !== locale) ?? locale) as Locale;
  // Signed in (the session cookie): the button opens the Nexus instead of
  // asking to sign in. Read after the first render, so the page itself
  // stays the same for everyone.
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => setSignedIn(hasSessionCookie(document.cookie)), []);
  const way = signedIn
    ? { href: localizedPath(locale, nexusPath()), label: t("openNexus") }
    : {
        href: localizedPath(locale, nexusPath("/sign-in")),
        label: t("signIn"),
      };

  return (
    <Masthead
      action={
        account ? (
          <Button asChild className="hidden sm:inline-flex" size="sm">
            <NextLink href={way.href}>{way.label}</NextLink>
          </Button>
        ) : null
      }
      home={localizedPath(locale, "/")}
      language={
        language ?? (
          <Link
            className="whitespace-nowrap px-2 py-1 text-sm underline-offset-4 hover:underline"
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
              <Button asChild className="w-full" size="lg">
                <NextLink href={way.href} onClick={close}>
                  {way.label}
                </NextLink>
              </Button>
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
