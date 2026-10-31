"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useWays } from "@/components/account/member-shell";
import { SiteHeader } from "@/components/site-header";
import { LinkProvider } from "@/lib/link-context";
import { Link } from "@/lib/nexus/navigation";
import { DiwanNav } from "./admin/admin-shell";
import { LanguageSwitcher } from "./language-switcher";

/**
 * The Diwan frame (officers only): skip link, the site's own header (owner,
 * Oct 30, 2026: the same main menu everywhere), the Diwan's row of six
 * sections, main. Members' own pages are on the site (/membership).
 */
export const AppShell = ({ children }: { children: ReactNode }) => {
  const t = useTranslations("common");

  return (
    <div className="flex flex-1 flex-col">
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:bg-surface focus:p-2"
        href="#main"
      >
        {t("skipToContent")}
      </a>
      <SiteHeader language={<LanguageSwitcher />} ways={useWays()} />
      <DiwanNav />
      <main
        className="mx-auto w-full max-w-6xl flex-1 px-4 pt-12 pb-20 sm:pt-16 sm:pb-24"
        id="main"
      >
        <LinkProvider value={Link}>{children}</LinkProvider>
      </main>
    </div>
  );
};
