"use client";

import { useAuth } from "@repo/auth/provider";
import { cn } from "@repo/design-system/lib/utils";
import { localizedPath, nexusPath } from "@repo/internationalization";
import {
  Link,
  usePathname,
  useRouter,
} from "@repo/internationalization/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useVisibleModules } from "@/components/nexus/admin/admin-shell";
import { useTwoStep } from "@/components/nexus/auth/two-step";
import { disablePush } from "@/lib/nexus/push";
import { useMemberStatus } from "@/lib/nexus/queries";

/** Whether a link is the current page: Overview only on itself. */
const isCurrent = (pathname: string, href: string) =>
  href === "/account"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

/**
 * The account's own pages, in one row under the site's header: overview,
 * profile, requests, service, offers, the Society, and the Diwan for
 * those whose roles open it.
 */
const useAccountLinks = () => {
  const { visible } = useVisibleModules();
  const twoStep = useTwoStep();
  const status = useMemberStatus();
  const staff = visible.length > 0 || Boolean(twoStep.data?.needs);
  const member = Boolean(status.data?.is_member);
  return {
    links: [
      { href: "/account", key: "overview" },
      { href: "/account/profile", key: "profile" },
      { href: "/account/requests", key: "forms" },
      { href: "/account/service", key: "service" },
      ...(member ? [{ href: "/account/offers", key: "offers" } as const] : []),
      ...(member ? [{ href: "/society", key: "society" } as const] : []),
    ] as const,
    staff,
  };
};

/** The account's links, sign-out, and the way into the Diwan for officers. */
const AccountNav = () => {
  const t = useTranslations("nexus.nav");
  const ta = useTranslations("auth");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const { links, staff } = useAccountLinks();

  const signOut = async () => {
    // A shared computer must not show the last member's notices.
    await disablePush(supabase).catch(() => undefined);
    await supabase.auth.signOut();
    queryClient.clear();
    router.replace("/");
  };

  return (
    <nav
      aria-label={t("account")}
      className="border-line border-b print:hidden"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-x-6 overflow-x-auto px-4">
        <ul className="flex gap-x-6">
          {links.map((link) => {
            const current = isCurrent(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "block whitespace-nowrap border-b-[1.5px] py-3 font-medium text-sm hover:text-accent",
                    current
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
        <div className="ms-auto flex shrink-0 items-center gap-x-6">
          {staff ? (
            <a
              className="whitespace-nowrap py-3 font-medium text-sm hover:text-accent"
              href={localizedPath(locale, nexusPath())}
            >
              {t("diwan")}
            </a>
          ) : null}
          <button
            className="whitespace-nowrap py-3 font-medium text-sm text-text-secondary hover:text-accent"
            onClick={signOut}
            type="button"
          >
            {ta("signOut")}
          </button>
        </div>
      </div>
    </nav>
  );
};

/** Pages that show the account's row of links. */
const ACCOUNT_PAGES = /^\/(account|society)(\/|$)/;

/** The members' pages: the account row where it belongs, then the page. */
export const MemberShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const { user } = useAuth();
  return (
    <>
      {user && ACCOUNT_PAGES.test(pathname) ? <AccountNav /> : null}
      <main
        className="mx-auto w-full max-w-6xl flex-1 px-4 pt-12 pb-20 sm:pt-16 sm:pb-24"
        id="main"
      >
        {children}
      </main>
    </>
  );
};
