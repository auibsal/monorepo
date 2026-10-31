"use client";

import { Icon } from "@repo/design-system/components/sal/icon";
import { cn } from "@repo/design-system/lib/utils";
import {
  type AdminModule,
  adminModules,
  adminSections,
  hasPermissionAnywhere,
  sectionOfPath,
} from "@repo/rbac";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Link, usePathname } from "@/lib/nexus/navigation";
import { useGrants } from "@/lib/nexus/queries";
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
export const useVisibleSections = () => {
  const { grants, visible } = useVisibleModules();
  const keys = new Set<string>(visible.map((m) => m.key));
  const sections = adminSections.flatMap((section) => {
    const [first] = allowedViews(section.key, keys, grants.data);
    return first ? [{ ...section, path: first.href }] : [];
  });
  return { grants, sections };
};

/**
 * The Diwan's row (the overhaul, Oct 30, 2026), like the members' own:
 * Desk · What's on · Qirtas · The Company · People · Society, only those
 * the officer's roles reach. On phones, one line naming the section opens
 * the list.
 */
export const DiwanNav = () => {
  const t = useTranslations("nexus.admin.sections");
  const pathname = usePathname();
  const { sections } = useVisibleSections();
  if (sections.length === 0) {
    return null;
  }
  const current = sectionOfPath(pathname);
  const link = (section: (typeof sections)[number], phone: boolean) => {
    const here = section.key === current;
    return (
      <li className={phone ? undefined : "shrink-0"} key={section.key}>
        <Link
          aria-current={here ? "page" : undefined}
          className={cn(
            phone
              ? "block py-3 text-sm hover:text-accent"
              : "block whitespace-nowrap border-b-[1.5px] py-3 font-medium text-sm hover:text-accent",
            phone && (here ? "font-medium text-accent" : "text-text"),
            !phone &&
              (here
                ? "border-accent text-text"
                : "border-transparent text-text-secondary")
          )}
          href={section.path}
        >
          {t(section.key)}
        </Link>
      </li>
    );
  };
  return (
    <nav aria-label={t("label")} className="border-line border-b print:hidden">
      <details
        className="group mx-auto w-full max-w-6xl px-4 md:hidden"
        key={pathname}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 font-medium text-sm [&::-webkit-details-marker]:hidden">
          <span>{t(current)}</span>
          <Icon
            className="size-4 transition-transform group-open:rotate-180"
            name="chevron-down"
          />
        </summary>
        <ul className="grid divide-y divide-line border-line border-t">
          {sections.map((section) => link(section, true))}
        </ul>
      </details>
      <div className="mx-auto hidden w-full max-w-6xl px-4 md:block">
        <ul className="flex min-w-0 gap-x-6 overflow-x-auto">
          {sections.map((section) => link(section, false))}
        </ul>
      </div>
    </nav>
  );
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
    <nav aria-label={label} className="overflow-x-auto border-line border-b">
      <ul className="flex gap-x-6">
        {tabs.map((tab, index) => {
          const here = index === hereIndex;
          return (
            <li className="shrink-0" key={tab.href}>
              <Link
                aria-current={here ? "page" : undefined}
                className={cn(
                  "block whitespace-nowrap border-b-[1.5px] py-3 font-medium text-sm hover:text-accent",
                  here
                    ? "border-accent text-text"
                    : "border-transparent text-text-secondary"
                )}
                href={tab.href}
              >
                {tab.label}
                {tab.count ? (
                  <span className="ms-1.5 text-accent">{tab.count}</span>
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
  const t = useTranslations("nexus.admin");
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
        <AdminHeading title={t("noAccessTitle")}>{t("noAccess")}</AdminHeading>
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
