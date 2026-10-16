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
        className="underline-offset-4 hover:underline"
        onClick={() => document.dispatchEvent(new Event(OPEN_CONSENT))}
        type="button"
      >
        {t("cookieSettings")}
      </button>
    </li>
  );
};
