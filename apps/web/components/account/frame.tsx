"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/nexus/language-switcher";
import { SiteHeader } from "@/components/site-header";

/** The site's skip link and header around the members' pages. */
export const AccountFrame = ({ children }: { children: ReactNode }) => {
  const t = useTranslations("common");
  return (
    <>
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:bg-surface focus:p-2"
        href="#main"
      >
        {t("skipToContent")}
      </a>
      <SiteHeader language={<LanguageSwitcher />} />
      {children}
    </>
  );
};
