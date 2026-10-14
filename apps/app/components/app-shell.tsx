"use client";

import { useAuth } from "@repo/auth/provider";
import { project } from "@repo/config";
import { BrandLogo } from "@repo/design-system/components/brand-logo";
import { Button } from "@repo/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@repo/design-system/components/ui/sheet";
import { cn } from "@repo/design-system/lib/utils";
import { localizedPath } from "@repo/internationalization";
import {
  Link,
  usePathname,
  useRouter,
} from "@repo/internationalization/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, MenuIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { useNotionHandbook, useTeamWorkspace } from "@/lib/notion";
import { disablePush } from "@/lib/push";
import { useMemberStatus } from "@/lib/queries";
import { useVisibleModules } from "./admin/admin-shell";
import { useTwoStep } from "./auth/two-step";
import { LanguageSwitcher } from "./language-switcher";

// Five sections at most (v5); the account items live in their own menu.
const memberLinks = [
  { href: "/", key: "home" },
  { href: "/events", key: "events" },
  { href: "/programs", key: "programs" },
  { href: "/journal", key: "journal" },
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
  return [
    { href: "/profile", key: "profile" },
    { href: "/service", key: "service" },
    { href: "/forms", key: "forms" },
    { href: "/documents", key: "documents" },
    ...(member ? [{ href: "/offers", key: "offers" } as const] : []),
    ...(declares
      ? [{ href: "/declarations", key: "declarations" } as const]
      : []),
    ...(admin ? [{ href: "/admin", key: "admin" } as const] : []),
  ] as const;
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

const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => {
  const t = useTranslations("nexus.nav");
  const pathname = usePathname();
  const links = memberLinks;

  return (
    <ul className="flex flex-col lg:flex-row lg:items-center lg:gap-6">
      {links.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <li key={link.href}>
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "lg:type-label block border-rule border-b py-4 font-bold text-xl lg:border-transparent lg:border-b-2 lg:py-1 lg:text-xs lg:hover:border-frame",
                active && "text-title lg:border-accent-line"
              )}
              href={link.href}
              onClick={onNavigate}
            >
              {t(link.key)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

/** The Nexus frame: skip link, header with words-first navigation, main. */
export const AppShell = ({ children }: { children: ReactNode }) => {
  const t = useTranslations();
  const locale = useLocale();
  const { supabase } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const account = useAccountLinks();
  const notion = useNotionLinks();

  const signOut = async () => {
    // A shared computer must not show the last member's notices.
    await disablePush(supabase).catch(() => undefined);
    await supabase.auth.signOut();
    queryClient.clear();
    router.replace("/sign-in");
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:bg-surface focus:p-2"
        href="#main"
      >
        {t("common.skipToContent")}
      </a>
      <header className="frame-b sticky top-0 z-40 bg-surface print:hidden">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3">
          <Link className="shrink-0" href="/">
            <BrandLogo ground="dark" height={56} locale={locale} />
            <span className="sr-only">{t("nexus.name")}</span>
          </Link>
          <nav
            aria-label={t("nexus.nav.label")}
            className="ms-auto hidden lg:block"
          >
            <NavLinks />
          </nav>
          <div className="ms-auto flex items-center gap-2 lg:ms-6">
            <LanguageSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="hidden lg:inline-flex"
                  size="sm"
                  variant="outline"
                >
                  {t("nexus.nav.account")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {account.map((link) => (
                  <DropdownMenuItem asChild key={link.href}>
                    <Link href={link.href}>{t(`nexus.nav.${link.key}`)}</Link>
                  </DropdownMenuItem>
                ))}
                {notion.map((link) => (
                  <DropdownMenuItem asChild key={link.key}>
                    <a href={link.href} rel="noopener" target="_blank">
                      {t(`nexus.nav.${link.key}`)}
                      <ExternalLink
                        aria-label={t("common.externalLink")}
                        className="size-3.5"
                      />
                    </a>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={signOut}>
                  {t("auth.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Sheet onOpenChange={setOpen} open={open}>
              <SheetTrigger asChild>
                <Button className="lg:hidden" size="icon" variant="outline">
                  <MenuIcon aria-hidden="true" />
                  <span className="sr-only">{t("common.openMenu")}</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                className="p-4"
                side={locale === "ar" ? "left" : "right"}
              >
                <SheetTitle className="type-subheading">
                  {t("nexus.name")}
                </SheetTitle>
                <nav aria-label={t("nexus.nav.label")} className="mt-4">
                  <NavLinks onNavigate={() => setOpen(false)} />
                </nav>
                <ul className="mt-6 grid gap-2">
                  {account.map((link) => (
                    <li key={link.href}>
                      <Link
                        className="underline underline-offset-4"
                        href={link.href}
                        onClick={() => setOpen(false)}
                      >
                        {t(`nexus.nav.${link.key}`)}
                      </Link>
                    </li>
                  ))}
                  {notion.map((link) => (
                    <li key={link.key}>
                      <a
                        className="inline-flex items-center gap-1.5 underline underline-offset-4"
                        href={link.href}
                        rel="noopener"
                        target="_blank"
                      >
                        {t(`nexus.nav.${link.key}`)}
                        <ExternalLink
                          aria-label={t("common.externalLink")}
                          className="size-3.5"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6 w-full"
                  onClick={signOut}
                  variant="outline"
                >
                  {t("auth.signOut")}
                </Button>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8" id="main">
        {children}
      </main>
      <footer className="frame-t print:hidden">
        <p className="type-caption mx-auto w-full max-w-6xl px-4 py-4">
          <a
            className="underline-offset-4 hover:underline"
            href={`${project.hosts.web}${localizedPath(locale)}`}
          >
            {t("nexus.nav.publicSite")}
          </a>
        </p>
      </footer>
    </div>
  );
};
