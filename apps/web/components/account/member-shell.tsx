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
import { ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useVisibleModules } from "@/components/nexus/admin/admin-shell";
import { useTwoStep } from "@/components/nexus/auth/two-step";
import { disablePush } from "@/lib/nexus/push";
import { useMemberStatus } from "@/lib/nexus/queries";

interface AccountLink {
  /** Pages that count as this link's own (Settings holds Profile and Requests). */
  readonly also?: readonly string[];
  readonly href: string;
  readonly key:
    | "today"
    | "calendar"
    | "callboard"
    | "society"
    | "record"
    | "settings";
}

/** Whether a link is the current page: Today only on itself. */
const isCurrent = (pathname: string, link: AccountLink) =>
  [link.href, ...(link.also ?? [])].some((href) =>
    href === "/account"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`)
  );

/**
 * The account's own pages, in one row under the site's header (owner,
 * 2026-10-25): Today · My calendar · Callboard · Society · Record ·
 * Settings, and the Diwan for those whose roles open it. Profile and
 * Requests sit under Settings; perks are on the card.
 */
const useAccountLinks = () => {
  const { visible } = useVisibleModules();
  const twoStep = useTwoStep();
  const status = useMemberStatus();
  const staff = visible.length > 0 || Boolean(twoStep.data?.needs);
  const member = Boolean(status.data?.is_member);
  const links: AccountLink[] = [
    { href: "/account", key: "today" },
    ...(member
      ? ([
          { href: "/events/book", key: "calendar" },
          { href: "/callboard", key: "callboard" },
          { href: "/society", key: "society" },
        ] as const)
      : []),
    { href: "/account/service", key: "record" },
    {
      also: ["/account/profile", "/account/requests"],
      href: "/account/settings",
      key: "settings",
    },
  ];
  return { links, staff };
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

  const current = links.find((link) => isCurrent(pathname, link));
  const extras = (
    <>
      {staff ? (
        <a
          className="whitespace-nowrap py-3 font-medium text-sm hover:text-accent"
          href={localizedPath(locale, nexusPath())}
        >
          {t("diwan")}
        </a>
      ) : null}
      <button
        className="whitespace-nowrap py-3 text-start font-medium text-sm text-text-secondary hover:text-accent"
        onClick={signOut}
        type="button"
      >
        {ta("signOut")}
      </button>
    </>
  );

  return (
    <nav
      aria-label={t("account")}
      className="border-line border-b print:hidden"
    >
      {/* Phones: one line naming the page, opening the full list. */}
      <details
        className="group mx-auto w-full max-w-6xl px-4 md:hidden"
        // A new page closes the list.
        key={pathname}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 font-medium text-sm [&::-webkit-details-marker]:hidden">
          <span>{t(current?.key ?? "today")}</span>
          <ChevronDown
            aria-hidden="true"
            className="size-4 transition-transform group-open:rotate-180"
          />
        </summary>
        <ul className="grid divide-y divide-line border-line border-t">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                aria-current={isCurrent(pathname, link) ? "page" : undefined}
                className={cn(
                  "block py-3 text-sm hover:text-accent",
                  isCurrent(pathname, link)
                    ? "font-medium text-accent"
                    : "text-text"
                )}
                href={link.href}
              >
                {t(link.key)}
              </Link>
            </li>
          ))}
        </ul>
        <div className="grid border-line border-t">{extras}</div>
      </details>
      {/* Wider screens: the links in one row, sign-out at the end. */}
      <div className="mx-auto hidden w-full max-w-6xl items-center gap-x-6 px-4 md:flex">
        <ul className="flex min-w-0 gap-x-6 overflow-x-auto">
          {links.map((link) => {
            const here = isCurrent(pathname, link);
            return (
              <li className="shrink-0" key={link.href}>
                <Link
                  aria-current={here ? "page" : undefined}
                  className={cn(
                    "block whitespace-nowrap border-b-[1.5px] py-3 font-medium text-sm hover:text-accent",
                    here
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
          {extras}
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
