"use client";

import { OPEN_CONSENT, zarazConsent } from "@repo/analytics/consent";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/**
 * Reopens the consent card, so a visitor can change their analytics choice
 * at any time. Shown only where Zaraz consent runs.
 */
export const CookieSettings = () => {
  const t = useTranslations("web.footer");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const find = () => setReady(zarazConsent() !== null);
    find();
    document.addEventListener("zarazConsentAPIReady", find);
    return () => document.removeEventListener("zarazConsentAPIReady", find);
  }, []);

  if (!ready) {
    return null;
  }
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
