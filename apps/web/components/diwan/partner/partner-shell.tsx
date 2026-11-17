"use client";

import { Link, usePathname } from "@repo/internationalization/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Breadcrumb, SideMenu } from "@/components/side-menu";
import { DeepPageProvider, useIsDeepPage } from "@/lib/deep-page";
import { PARTNER_PAGES } from "./workspace";

const PartnerFrame = ({ children }: { children: ReactNode }) => {
  const t = useTranslations("diwan.partnerDesk");
  const pathname = usePathname();
  const deep = useIsDeepPage();
  const items = PARTNER_PAGES.map((page) => ({
    href: page.href,
    key: page.key,
    label: t(`tabs.${page.key}`),
  }));
  const root = "/partners/dashboard";
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-10">
      {deep ? (
        <div className="hidden lg:block" />
      ) : (
        <SideMenu
          items={items}
          label={t("tabsLabel")}
          link={Link}
          pathname={pathname}
          root={root}
        />
      )}
      <div className="min-w-0">
        {deep ? (
          <Breadcrumb
            items={items}
            link={Link}
            pathname={pathname}
            root={root}
          />
        ) : null}
        <main className="min-w-0 pt-12 pb-20 sm:pt-16 sm:pb-24" id="main">
          {children}
        </main>
      </div>
    </div>
  );
};

/**
 * The partner dashboard's frame: the one side menu (decisions.md, The
 * site: one navigation standard) beside its page.
 */
export const PartnerShell = ({ children }: { children: ReactNode }) => (
  <DeepPageProvider>
    <PartnerFrame>{children}</PartnerFrame>
  </DeepPageProvider>
);
