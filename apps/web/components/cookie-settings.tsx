"use client";

import { OPEN_CONSENT } from "@repo/analytics/consent";
import { useTranslations } from "next-intl";

/**
 * Reopens the consent card, so a visitor can change their choices at any
 * time. The footer shows it only while the card has something to ask about.
 */
export const CookieSettings = () => {
  const t = useTranslations("web.footer");
  return (
    <li>
      <button
        className="hover:text-accent hover:underline hover:underline-offset-4"
        onClick={() => document.dispatchEvent(new Event(OPEN_CONSENT))}
        type="button"
      >
        {t("cookieSettings")}
      </button>
    </li>
  );
};
