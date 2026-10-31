"use client";

import { useAuth } from "@repo/auth/provider";
import { Icon } from "@repo/design-system/components/sal/icon";
import { cn } from "@repo/design-system/lib/utils";
import {
  Link,
  usePathname,
  useRouter,
} from "@repo/internationalization/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect } from "react";
import { useVisibleModules } from "@/components/nexus/admin/admin-shell";
import { useTwoStep } from "@/components/nexus/auth/two-step";
import { useMyPartners } from "@/lib/nexus/partners";
import { disablePush } from "@/lib/nexus/push";
import { useMemberStatus } from "@/lib/nexus/queries";
import { rememberWays, type Ways } from "@/lib/staff";

interface AccountLink {
  /** Pages that count as this link's own (Settings holds Profile and Requests). */
  readonly also?: readonly string[];
  readonly href: string;
  readonly key:
    | "today"
    | "calendar"
    | "society"
    | "record"
    | "settings"
    | "accountHome";
}

/** Whether a link is the current page: Today only on itself. */
const isCurrent = (pathname: string, link: AccountLink) =>
  [link.href, ...(link.also ?? [])].some((href) =>
    href === "/membership" || href === "/account"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`)
  );

/**
 * Where the signed-in person goes beyond the public site (owner, Oct 31,
 * 2026): Membership for members, Account for everyone else, the Diwan for
 * officers (a role, or one waiting on two-step sign-in) and Partner for a
 * partner's team. Remembered in a cookie so the public pages can show the
 * same; UX only.
 */
export const useWays = (): Ways => {
  const { loading, user } = useAuth();
  const { grants, visible } = useVisibleModules();
  const twoStep = useTwoStep();
  const status = useMemberStatus();
  const partners = useMyPartners();
  const ways: Ways = {
    diwan:
      Boolean(user) && (visible.length > 0 || Boolean(twoStep.data?.needs)),
    member: Boolean(user) && (status.data?.verified ?? true),
    partner: Boolean(user) && (partners.data?.length ?? 0) > 0,
  };
  const known =
    !loading &&
    (!user ||
      (grants.isSuccess &&
        twoStep.isSuccess &&
        status.isSuccess &&
        partners.isSuccess));
  // biome-ignore lint/correctness/useExhaustiveDependencies: the three flags, not the object made each render
  useEffect(() => {
    if (known) {
      rememberWays(user ? ways : null);
    }
  }, [known, user, ways.diwan, ways.member, ways.partner]);
  return ways;
};

/** Whether the signed-in person opens the Diwan. */
export const useIsStaff = () => useWays().diwan;

/**
 * The account's own pages, in one row under the site's header (owner,
 * 2026-10-25): Today · My calendar · Society · Record · Settings. The
 * Callboard is the header's "Get involved" and the Diwan sits under the
 * header's Membership, so neither is repeated here. Profile and Requests
 * sit under Settings; perks are on the card.
 */
const useAccountLinks = (): AccountLink[] => {
  const status = useMemberStatus();
  const pathname = usePathname();
  // Everyone else's account (owner, Oct 31, 2026), also on the guests'
  // pages among Membership's: three pages; the record opens from Account.
  const notMember = status.isSuccess && !status.data?.verified;
  if (
    notMember ||
    pathname === "/account" ||
    pathname.startsWith("/account/")
  ) {
    return [
      { also: ["/account/record"], href: "/account", key: "accountHome" },
      { href: "/account/calendar", key: "calendar" },
      { href: "/account/settings", key: "settings" },
    ];
  }
  const member = Boolean(status.data?.is_member);
  const links: AccountLink[] = [
    { href: "/membership", key: "today" },
    ...(member
      ? ([
          { href: "/membership/calendar", key: "calendar" },
          { href: "/membership/society", key: "society" },
        ] as const)
      : []),
    { href: "/membership/record", key: "record" },
    {
      also: ["/membership/requests"],
      href: "/membership/settings",
      key: "settings",
    },
  ];
  return links;
};

/** The account's links and sign-out. */
const AccountNav = () => {
  const t = useTranslations("nexus.nav");
  const ta = useTranslations("auth");
  const pathname = usePathname();
  const router = useRouter();
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const links = useAccountLinks();

  const signOut = async () => {
    // A shared computer must not show the last member's notices.
    await disablePush(supabase).catch(() => undefined);
    await supabase.auth.signOut();
    rememberWays(null);
    queryClient.clear();
    router.replace("/");
  };

  const current = links.find((link) => isCurrent(pathname, link));
  const extras = (
    <button
      className="whitespace-nowrap py-3 text-start font-medium text-sm text-text-secondary hover:text-accent"
      onClick={signOut}
      type="button"
    >
      {ta("signOut")}
    </button>
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
          <span>{t(current?.key ?? links[0]?.key ?? "today")}</span>
          <Icon
            className="size-4 transition-transform group-open:rotate-180"
            name="chevron-down"
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
const ACCOUNT_PAGES = /^\/(membership|society|account)(\/|$)/;

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
