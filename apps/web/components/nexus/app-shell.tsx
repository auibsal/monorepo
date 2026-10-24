"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { LinkProvider } from "@/lib/link-context";
import { Link, usePathname } from "@/lib/nexus/navigation";
import { useNotionHandbook, useTeamWorkspace } from "@/lib/nexus/notion";
import { disablePush } from "@/lib/nexus/push";
import { LanguageSwitcher } from "./language-switcher";

// The Diwan's own sections (at most five, v6); the modules are in the
// administration's side navigation.
const sections = [
  { href: "/", key: "overview" },
  { href: "/library", key: "documents" },
  { href: "/declarations", key: "declarations" },
] as const;

/** Whether a section is the current page: the overview covers the modules. */
const isCurrent = (pathname: string, href: string) =>
  href === "/"
    ? !sections.some((s) => s.href !== "/" && pathname.startsWith(s.href))
    : pathname.startsWith(href);

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

/**
 * The Diwan frame (officers only): skip link, the site's masthead with the
 * Diwan's sections, main. Members' own pages are on the site (/account).
 */
export const AppShell = ({ children }: { children: ReactNode }) => {
  const t = useTranslations();
  const locale = useLocale();
  const { supabase } = useAuth();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const notion = useNotionLinks();
  const account = localizedPath(locale, "/account");

  const signOut = async () => {
    // A shared computer must not show the last member's notices.
    await disablePush(supabase).catch(() => undefined);
    await supabase.auth.signOut();
    queryClient.clear();
    window.location.assign(localizedPath(locale, "/"));
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
              <DropdownMenuItem asChild>
                <a href={account}>{t("web.nav.account")}</a>
              </DropdownMenuItem>
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
            <a className="link" href={account} onClick={close}>
              {t("web.nav.account")}
            </a>
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
        sections={sections.map((link) => ({
          current: isCurrent(pathname, link.href),
          href: localizedPath(locale, nexusPath(link.href)),
          label: t(`nexus.nav.${link.key}`),
        }))}
      />
      <main
        className="mx-auto w-full max-w-6xl flex-1 px-4 pt-12 pb-20 sm:pt-16 sm:pb-24"
        id="main"
      >
        <LinkProvider value={Link}>{children}</LinkProvider>
      </main>
    </div>
  );
};
