"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useWays } from "@/components/account/member-shell";
import { Breadcrumb, SideMenu } from "@/components/side-menu";
import { SiteHeader } from "@/components/site-header";
import { DeepPageProvider, useIsDeepPage } from "@/lib/deep-page";
import { Link, usePathname } from "@/lib/diwan/navigation";
import { LinkProvider } from "@/lib/link-context";
import { useDiwanMenu } from "./admin/admin-shell";
import { FindPanel } from "./admin/find-panel";
import { LanguageSwitcher } from "./language-switcher";

const DiwanFrame = ({ children }: { children: ReactNode }) => {
  const t = useTranslations("diwan.admin.sections");
  const pathname = usePathname();
  const items = useDiwanMenu();
  const deep = useIsDeepPage();
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-10">
      {deep ? (
        <div className="hidden lg:block" />
      ) : (
        <SideMenu
          items={items}
          label={t("label")}
          link={Link}
          pathname={pathname}
        />
      )}
      <div className="min-w-0">
        {deep ? (
          <Breadcrumb items={items} link={Link} pathname={pathname} />
        ) : null}
        <main className="min-w-0 pt-12 pb-20 sm:pt-16 sm:pb-24" id="main">
          <LinkProvider value={Link}>{children}</LinkProvider>
        </main>
      </div>
    </div>
  );
};

/**
 * The Diwan frame (officers only): skip link, the site's own header (the
 * only menu across the top), the find-anything line (it opens in place,
 * pushing the page down), then the side menu beside the page, or, on a
 * record's own page, the breadcrumb and the way back (decisions.md, The
 * site: one navigation standard).
 */
export const AppShell = ({ children }: { children: ReactNode }) => {
  const t = useTranslations("common");

  return (
    <div className="flex flex-1 flex-col">
      <a
        className="focus:bg-surface sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:p-2"
        href="#main"
      >
        {t("skipToContent")}
      </a>
      <SiteHeader language={<LanguageSwitcher />} ways={useWays()} />
      <FindPanel />
      <DeepPageProvider>
        <DiwanFrame>{children}</DiwanFrame>
      </DeepPageProvider>
    </div>
  );
};
