"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

interface ZarazConsent {
  consent?: { modal?: boolean };
  showConsentModal?: () => void;
}

/**
 * Reopens Cloudflare Zaraz's consent window, so a visitor can change their
 * analytics choice at any time. Shown only where Zaraz runs.
 */
export const CookieSettings = () => {
  const t = useTranslations("web.footer");
  const [zaraz, setZaraz] = useState<ZarazConsent | null>(null);

  useEffect(() => {
    const find = () => {
      const z = (window as { zaraz?: ZarazConsent }).zaraz;
      if (typeof z?.showConsentModal === "function") {
        setZaraz(z);
      }
    };
    find();
    document.addEventListener("zarazConsentAPIReady", find);
    return () => document.removeEventListener("zarazConsentAPIReady", find);
  }, []);

  if (!zaraz) {
    return null;
  }
  return (
    <li>
      <button
        className="underline-offset-4 hover:underline"
        onClick={() => zaraz.showConsentModal?.()}
        type="button"
      >
        {t("cookieSettings")}
      </button>
    </li>
  );
};
