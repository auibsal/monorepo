"use client";

import { Link, usePathname } from "@repo/internationalization/navigation";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect } from "react";
import { useVisibleModules } from "@/components/diwan/admin/admin-shell";
import { useTwoStep } from "@/components/diwan/auth/two-step";
import { Breadcrumb, type MenuItem, SideMenu } from "@/components/side-menu";
import { useAuth } from "@/lib/auth/provider";
import { DeepPageProvider, useIsDeepPage } from "@/lib/deep-page";
import { useMyPartners } from "@/lib/diwan/partners";
import { useMemberStatus, useMyMembership } from "@/lib/diwan/queries";
import { rememberWays, type Ways } from "@/lib/staff";

interface AccountLink {
  readonly href: string;
  readonly key:
    | "today"
    | "events"
    | "work"
    | "roles"
    | "documents"
    | "settings";
}

/**
 * Where the signed-in person goes beyond the public site (decisions.md): Membership for members, Account for everyone else, the Diwan for
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
  }, [known, user, ways.diwan, ways.partner]);
  return ways;
};

/** Whether the signed-in person opens the Diwan. */
export const useIsStaff = () => useWays().diwan;

/**
 * The account's own pages, in its side menu (decisions.md,
 * The site: "Your account"): Today · Events · Work · Roles · Documents ·
 * Settings. Today holds the live card and an open election; Roles holds
 * applications too. Guests have Today, Events, Work, Documents and
 * Settings; a partner's people and anyone with no membership yet, Today and
 * Settings. What you sent sits under Settings.
 */
const useAccountLinks = (): AccountLink[] => {
  const kind = useMyMembership().data?.kind ?? null;
  const today: AccountLink = {
    href: "/account",
    key: "today",
  };
  const settings: AccountLink = {
    href: "/account/settings",
    key: "settings",
  };
  const events: AccountLink = { href: "/account/events", key: "events" };
  const work: AccountLink = { href: "/account/work", key: "work" };
  const documents: AccountLink = {
    href: "/account/documents",
    key: "documents",
  };
  if (kind === "member") {
    return [
      today,
      events,
      work,
      { href: "/account/roles", key: "roles" },
      documents,
      settings,
    ];
  }
  return kind === "guest"
    ? [today, events, work, documents, settings]
    : [today, settings];
};

/** The account's side menu: its links, What you sent under Settings. */
const useAccountMenu = (): MenuItem[] => {
  const t = useTranslations("diwan.nav");
  return useAccountLinks().map((link) => ({
    href: link.href,
    items:
      link.key === "settings"
        ? [
            { href: link.href, key: "settings", label: t("settings") },
            {
              href: "/account/requests",
              key: "requests",
              label: t("requests"),
            },
          ]
        : undefined,
    key: link.key,
    label: t(link.key),
  }));
};

/** Pages that show the account's side menu. */
const ACCOUNT_PAGES = /^\/account(\/|$)/u;

const AccountFrame = ({ children }: { children: ReactNode }) => {
  const t = useTranslations("diwan.nav");
  const pathname = usePathname();
  const items = useAccountMenu();
  const deep = useIsDeepPage();
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-10">
      {deep ? (
        <div className="hidden lg:block" />
      ) : (
        <SideMenu
          items={items}
          label={t("account")}
          link={Link}
          pathname={pathname}
          root="/account"
        />
      )}
      <div className="min-w-0">
        {deep ? (
          <Breadcrumb
            items={items}
            link={Link}
            pathname={pathname}
            root="/account"
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
 * The members' pages: Your account's side menu beside the page (decisions.md,
 * The site: one navigation standard), or the way back on a record's own
 * page; the other members' pages (sign-in, forms) stand alone.
 */
export const MemberShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const { user } = useAuth();
  if (user && ACCOUNT_PAGES.test(pathname)) {
    return (
      <DeepPageProvider>
        <AccountFrame>{children}</AccountFrame>
      </DeepPageProvider>
    );
  }
  return (
    <main
      className="mx-auto w-full max-w-6xl flex-1 px-4 pt-12 pb-20 sm:pt-16 sm:pb-24"
      id="main"
    >
      {children}
    </main>
  );
};
