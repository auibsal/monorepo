"use client";

import { type Locale, localizedPath } from "@repo/internationalization";
import { useLocale, useTranslations } from "next-intl";

/**
 * The public page of what this Diwan, partner or Membership page keeps
 * (owner, Oct 31, 2026: wherever something is tied to a public page, link
 * to it). A site address, in the page's language, outside the Diwan.
 */
export const OnTheSite = ({
  href,
  label,
}: {
  /** The site's own path, without the language ("/events/salon"). */
  readonly href: string;
  readonly label?: string;
}) => {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  return (
    <a className="link" href={localizedPath(locale, href)}>
      {label ?? t("onTheSite")}
    </a>
  );
};
