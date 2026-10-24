"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { cn } from "@repo/design-system/lib/utils";
import { localizedPath, nexusPath } from "@repo/internationalization";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Masthead, mastheadLink } from "@/components/masthead";
import { Link, usePathname, useRouter } from "@/lib/nexus/navigation";
import { useNotionHandbook, useTeamWorkspace } from "@/lib/nexus/notion";
import { disablePush } from "@/lib/nexus/push";
import { useMemberStatus } from "@/lib/nexus/queries";
import { useVisibleModules } from "./admin/admin-shell";
import { useTwoStep } from "./auth/two-step";
import { LanguageSwitcher } from "./language-switcher";

// Five sections at most (v6); the account items live in their own menu.
// The logo leads home, so Home needs no link of its own.
const memberLinks = [
  { href: "/events", key: "events" },
  { href: "/programs", key: "programs" },
  { href: "/waraq", key: "journal" },
  { href: "/society", key: "society" },
] as const;

/** Profile, and Administration for members whose roles open it. */
const useAccountLinks = () => {
  const { grants, visible } = useVisibleModules();
  const twoStep = useTwoStep();
  const admin = visible.length > 0 || Boolean(twoStep.data?.needs);
  const status = useMemberStatus();
  // Form F-18: every role holder declares conflicts each semester (P8).
  const declares = (grants.data ?? []).length > 0;
  const member = Boolean(status.data?.is_member);
  return {
    account: [
      { href: "/profile", key: "profile" },
      { href: "/library", key: "documents" },
      ...(member ? [{ href: "/offers", key: "offers" } as const] : []),
      ...(admin ? [{ href: "/admin", key: "admin" } as const] : []),
    ],
    // Service, forms and declarations together, under "My paperwork".
    paperwork: [
      { href: "/service", key: "service" },
      { href: "/forms", key: "forms" },
      ...(declares
        ? [{ href: "/declarations", key: "declarations" } as const]
        : []),
    ],
  } as const;
};

/**
 * Links into the team's Notion workspace: Start here for role holders, and
 * the officer handbook for those who may read the internal library.
 */
const useNotionLinks = () => {
  const workspace = useTeamWorkspace();
  const handbook = useNotionHandbook();
  return [
    ...(workspace ? [{ href: workspace, key: "workspace" } as const] : []),
    ...(handbook.home
      ? [{ href: handbook.home, key: "handbook" } as const]
      : []),
  ];
};

/** Phones: the sections in a bar at the bottom, in reach of the thumb. */
const TabLinks = () => {
  const t = useTranslations("nexus.nav");
  const pathname = usePathname();
  return (
    <ul className="grid grid-cols-4" data-tab-bar>
      {memberLinks.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <li key={link.href}>
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "block border-t-[1.5px] py-3 text-center font-medium text-[0.8125rem]",
                active
                  ? "border-accent text-text"
                  : "border-transparent text-text-secondary"
              )}
              href={link.href}
            >
              {t(link.key)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

/** The Nexus frame: skip link, the site's masthead with the Nexus sections, main. */
export const AppShell = ({ children }: { children: ReactNode }) => {
  const t = useTranslations();
  const locale = useLocale();
  const { supabase } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { account, paperwork } = useAccountLinks();
  const notion = useNotionLinks();

  const signOut = async () => {
    // A shared computer must not show the last member's notices.
    await disablePush(supabase).catch(() => undefined);
    await supabase.auth.signOut();
    queryClient.clear();
    router.replace("/sign-in");
  };

  const external = (
    link: { href: string; key: "workspace" | "handbook" },
    className: string
  ) => (
    <a className={className} href={link.href} rel="noopener" target="_blank">
      {t(`nexus.nav.${link.key}`)}
      <ExternalLink
        aria-label={t("common.externalLink")}
        className="size-3.5"
      />
    </a>
  );

  return (
    <div className="flex flex-1 flex-col">
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:bg-surface focus:p-2"
        href="#main"
      >
        {t("common.skipToContent")}
      </a>
      <Masthead
        action={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(mastheadLink, "hidden lg:inline")}
                type="button"
              >
                {t("nexus.nav.account")}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {account.map((link) => (
                <DropdownMenuItem asChild key={link.href}>
                  <Link href={link.href}>{t(`nexus.nav.${link.key}`)}</Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t("nexus.nav.paperwork")}</DropdownMenuLabel>
              {paperwork.map((link) => (
                <DropdownMenuItem asChild key={link.href}>
                  <Link href={link.href}>{t(`nexus.nav.${link.key}`)}</Link>
                </DropdownMenuItem>
              ))}
              {notion.length > 0 ? <DropdownMenuSeparator /> : null}
              {notion.map((link) => (
                <DropdownMenuItem asChild key={link.key}>
                  {external(link, "")}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={signOut}>
                {t("auth.signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
        home={localizedPath(locale, nexusPath())}
        language={<LanguageSwitcher />}
        menu={(close) => (
          <>
            <ul className="grid gap-2">
              {account.map((link) => (
                <li key={link.href}>
                  <Link className="link" href={link.href} onClick={close}>
                    {t(`nexus.nav.${link.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="grid gap-2">
              <p className="type-label">{t("nexus.nav.paperwork")}</p>
              <ul className="grid gap-2">
                {paperwork.map((link) => (
                  <li key={link.href}>
                    <Link className="link" href={link.href} onClick={close}>
                      {t(`nexus.nav.${link.key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            {notion.length > 0 ? (
              <ul className="grid gap-2">
                {notion.map((link) => (
                  <li key={link.key}>
                    {external(link, "link inline-flex items-center gap-1.5")}
                  </li>
                ))}
              </ul>
            ) : null}
            <Button
              className="justify-self-start"
              onClick={signOut}
              variant="link"
            >
              {t("auth.signOut")}
            </Button>
          </>
        )}
        navLabel={t("nexus.nav.label")}
        place={t("nexus.name")}
        sections={memberLinks.map((link) => ({
          current: pathname.startsWith(link.href),
          href: localizedPath(locale, nexusPath(link.href)),
          label: t(`nexus.nav.${link.key}`),
        }))}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8" id="main">
        {children}
      </main>
      <nav
        aria-label={t("nexus.nav.label")}
        className="fixed inset-x-0 bottom-0 z-40 border-line border-t bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden"
      >
        <TabLinks />
      </nav>
    </div>
  );
};
