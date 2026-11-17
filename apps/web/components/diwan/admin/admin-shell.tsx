"use client";

import { cn } from "@repo/brand/lib/utils";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { MenuItem } from "@/components/side-menu";
import { Link, usePathname } from "@/lib/diwan/navigation";
import { useGrants } from "@/lib/diwan/queries";
import {
  type AdminModule,
  adminModules,
  adminSections,
  hasPermissionAnywhere,
  sectionOfPath,
} from "@/lib/rbac";
import { TwoStepPanel, useTwoStep } from "../auth/two-step";
import { SectionSpinner } from "../states";
import { AdminHeading } from "./kit";
import { allowedViews, viewOfPath } from "./section-views";

/** The admin modules the member's grants show (RLS still decides the rows). */
export const useVisibleModules = () => {
  const grants = useGrants();
  const visible = adminModules.filter((module) =>
    module.permissions.some((permission) =>
      hasPermissionAnywhere(grants.data, permission)
    )
  );
  return { grants, visible };
};

/**
 * The sections this officer opens, each linked to the first of its views
 * their roles include: a section never opens on a page they can't use.
 */
const useVisibleSections = () => {
  const { grants, visible } = useVisibleModules();
  const keys = new Set<string>(visible.map((m) => m.key));
  const sections = adminSections.flatMap((section) => {
    const [first] = allowedViews(section.key, keys, grants.data);
    return first ? [{ ...section, path: first.href }] : [];
  });
  return { grants, sections };
};

/**
 * The Diwan's side menu (decisions.md, The site: one navigation standard):
 * the seats the officer's roles reach, the Desk first, each opening on the
 * first of its views, and the open seat's views under it.
 */
export const useDiwanMenu = (): MenuItem[] => {
  const t = useTranslations("diwan.admin.sections");
  const tv = useTranslations("diwan.admin.sections.tabs");
  const { grants, visible } = useVisibleModules();
  const keys = new Set<string>(visible.map((m) => m.key));
  return adminSections.flatMap((section) => {
    const views = allowedViews(section.key, keys, grants.data);
    const [first] = views;
    return first
      ? [
          {
            href: first.href,
            items: views.map((view) => ({
              href: view.href,
              key: view.key,
              label: tv(view.key as never),
            })),
            key: section.key,
            label: t(section.key),
          },
        ]
      : [];
  });
};

export interface SectionTab {
  /** Waiting items, shown in the accent. */
  readonly count?: number;
  /** A path inside the Diwan: every view has its own address. */
  readonly href: string;
  readonly label: string;
}

/**
 * The tab for the page shown: the one whose path holds this page most
 * closely (so an event's page keeps "Calendar" lit and a program's page
 * "Programs").
 */
const tabHere = (tabs: readonly SectionTab[], pathname: string) => {
  let best = -1;
  let bestLength = -1;
  tabs.forEach((tab, index) => {
    const path = tab.href;
    const holds =
      pathname === path || (path !== "/" && pathname.startsWith(`${path}/`));
    if (holds && path.length > bestLength) {
      best = index;
      bestLength = path.length;
    }
  });
  return best === -1 ? 0 : best;
};

/**
 * A section's own views, under its title: links, so every view has its
 * own address and can be shared.
 */
export const SectionTabs = ({
  label,
  tabs,
}: {
  readonly label: string;
  readonly tabs: readonly SectionTab[];
}) => {
  const pathname = usePathname();
  if (tabs.length < 2) {
    return null;
  }
  const hereIndex = tabHere(tabs, pathname);
  return (
    <nav aria-label={label} className="border-line overflow-x-auto border-b">
      <ul className="flex gap-x-6">
        {tabs.map((tab, index) => {
          const here = index === hereIndex;
          return (
            <li className="shrink-0" key={tab.href}>
              <Link
                aria-current={here ? "page" : undefined}
                className={cn(
                  "hover:text-accent block border-b-[1.5px] py-3 text-sm font-medium whitespace-nowrap",
                  here
                    ? "border-accent text-text"
                    : "text-text-secondary border-transparent"
                )}
                href={tab.href}
              >
                {tab.label}
                {tab.count ? (
                  <span className="text-accent ms-1.5">{tab.count}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

/** The administration area: two-step sign-in first where a role needs it. */
export const AdminShell = ({ children }: { children: ReactNode }) => {
  const { grants } = useVisibleModules();
  const twoStep = useTwoStep();

  if (grants.isPending || twoStep.isPending) {
    return <SectionSpinner />;
  }
  // Council and Elections permissions wait for the second factor.
  if (twoStep.data?.needs && !twoStep.data.done) {
    return <TwoStepPanel />;
  }

  return children;
};

/**
 * Shows a module only to members whose grants include it. A convenience:
 * every row and write is still decided by Row Level Security.
 */
export const RequireModule = ({
  children,
  module,
}: {
  children: ReactNode;
  module: AdminModule;
}) => {
  const t = useTranslations("diwan.admin");
  const pathname = usePathname();
  const { grants, visible } = useVisibleModules();
  const { sections } = useVisibleSections();

  if (grants.isPending) {
    return <SectionSpinner />;
  }
  const keys = new Set<string>(visible.map((m) => m.key));
  // A section's own view may ask for more than its module (Editions,
  // Awards, Insights): the same rule as its tab.
  const view = viewOfPath(pathname);
  const viewOpens =
    !view ||
    allowedViews(sectionOfPath(pathname), keys, grants.data).some(
      (v) => v.href === view.href
    );
  if (!(keys.has(module) && viewOpens)) {
    const here = sections.find((s) => s.key === sectionOfPath(pathname));
    const elsewhere = here ?? sections[0];
    return (
      <div className="grid gap-6">
        <AdminHeading title={t("noAccessTitle")} />
        {elsewhere ? (
          <p>
            <Link className="link" href={elsewhere.path}>
              {t("noAccessGo")}
            </Link>
          </p>
        ) : null}
      </div>
    );
  }
  return children;
};
