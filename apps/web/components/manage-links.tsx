"use client";

import { hasSessionCookie } from "@repo/auth/session-cookie";
import {
  type Locale,
  localizedPath,
  nexusPath,
} from "@repo/internationalization";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { readWays, type Ways } from "@/lib/staff";

/**
 * From a public page to where the same thing is kept (owner, Oct 31, 2026:
 * every public page links to the Diwan, the partner's dashboard or
 * Membership, for whoever has them): officers see "Manage in the Diwan", a
 * partner's team their dashboard, a signed-in reader their own page.
 * Read from the sign-in and `sal_ways` hint cookies after the first
 * render, so the page stays the same for everyone and is cached; each
 * area's own gate still decides.
 */
export const ManageLinks = ({
  diwan,
  membership,
  membershipLabel = "membership",
  partner = false,
}: {
  /** A Diwan path, without /diwan ("/events/salon"). */
  readonly diwan?: string;
  /** A Membership path ("/membership/calendar"). */
  readonly membership?: string;
  /** What the Membership link names: the page, bookings or one's work. */
  readonly membershipLabel?: "membership" | "booking" | "work";
  /** Show the partner's dashboard to a partner's team. */
  readonly partner?: boolean;
}) => {
  const t = useTranslations("common.manage");
  const locale = useLocale() as Locale;
  const [ways, setWays] = useState<Ways | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    setWays(readWays(document.cookie));
    setSignedIn(hasSessionCookie(document.cookie));
  }, []);

  const links: { href: string; key: string; label: string }[] = [];
  if (diwan && ways?.diwan) {
    links.push({
      href: localizedPath(locale, nexusPath(diwan)),
      key: "diwan",
      label: t("diwan"),
    });
  }
  if (partner && ways?.partner) {
    links.push({
      href: localizedPath(locale, "/partners/dashboard"),
      key: "partner",
      label: t("partner"),
    });
  }
  if (membership && signedIn) {
    links.push({
      href: localizedPath(locale, membership),
      key: "membership",
      label: t(membershipLabel),
    });
  }
  if (links.length === 0) {
    return null;
  }
  return (
    <p className="type-caption flex flex-wrap gap-x-5 gap-y-1">
      {links.map((link) => (
        <a className="link" href={link.href} key={link.key}>
          {link.label}
        </a>
      ))}
    </p>
  );
};
