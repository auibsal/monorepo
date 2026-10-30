"use client";

import { Icon } from "@repo/design-system/components/sal/icon";
import { cn } from "@repo/design-system/lib/utils";
import {
  type AdminModule,
  adminModules,
  hasPermissionAnywhere,
} from "@repo/rbac";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";
import { Link, usePathname, useRouter } from "@/lib/nexus/navigation";
import { useNotionHandbook, useTeamWorkspace } from "@/lib/nexus/notion";
import { useGrants } from "@/lib/nexus/queries";
import { TwoStepPanel, useTwoStep } from "../auth/two-step";
import { SectionSpinner } from "../states";

const hrefFor = (module: AdminModule) =>
  module === "overview" ? "/" : `/${module}`;

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

// The sections in five groups, so the list reads as a map rather than a
// wall of links. Modules not listed here fall into the last group.
type Group = "work" | "people" | "publishing" | "society" | "system";

const groups: { key: Group; modules: AdminModule[] }[] = [
  {
    key: "work",
    modules: ["events", "programs", "productions", "journal"],
  },
  {
    key: "people",
    modules: ["members", "hiring", "recognition", "partners"],
  },
  { key: "publishing", modules: ["content", "ads", "charity"] },
  { key: "society", modules: ["governance", "library", "forms"] },
  { key: "system", modules: ["activity", "settings"] },
];

const ungrouped = adminModules
  .map((m) => m.key)
  .filter(
    (key) => key !== "overview" && !groups.some((g) => g.modules.includes(key))
  );

// What every officer has besides the modules (owner, Oct 30, 2026: these
// left the Diwan's header, which is now the site's own).
const ownPages = [{ href: "/declarations", key: "declarations" }] as const;

const isActive = (module: AdminModule, pathname: string) =>
  module === "overview"
    ? pathname === "/"
    : pathname.startsWith(hrefFor(module));

/**
 * Section navigation for the administration area: a sidebar on wide
 * screens; on phones and tablets a single "Section" button that opens the
 * same grouped list, so it never wraps into a block of links.
 */
const AdminNav = () => {
  const t = useTranslations("nexus.admin");
  const pathname = usePathname();
  const { visible } = useVisibleModules();
  // Open for one page only: moving to another section closes the list.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const tn = useTranslations("nexus.nav");
  const tc = useTranslations("common");
  const workspace = useTeamWorkspace();
  const handbook = useNotionHandbook();
  const keys = new Set(visible.map((m) => m.key));
  const own = ownPages.find((page) => pathname.startsWith(page.href));
  const current = own ? null : visible.find((m) => isActive(m.key, pathname));
  const notion = [
    ...(workspace ? [{ href: workspace, key: "workspace" } as const] : []),
    ...(handbook.home
      ? [{ href: handbook.home, key: "handbook" } as const]
      : []),
  ];

  const link = (module: AdminModule) => {
    const active = isActive(module, pathname);
    return (
      <li key={module}>
        <Link
          aria-current={active ? "page" : undefined}
          className={cn(
            "block py-2 text-sm underline-offset-4 hover:underline lg:py-1",
            active && "font-medium text-text"
          )}
          href={hrefFor(module)}
        >
          {t(`nav.${module}`)}
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label={t("nav.label")}>
      <p className="type-label mb-2 hidden lg:block">{t("title")}</p>
      <button
        aria-controls="admin-sections"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 border border-line bg-surface px-4 py-3 text-start lg:hidden"
        onClick={() => setOpenOn(open ? null : pathname)}
        type="button"
      >
        <span className="grid">
          <span className="type-label">{t("title")}</span>
          <span className="font-medium">
            {own ? tn(own.key) : t(`nav.${current?.key ?? "overview"}`)}
          </span>
        </span>
        <Icon
          className={cn(
            "size-5 shrink-0 transition-transform",
            open && "rotate-180"
          )}
          name="chevron-down"
        />
      </button>
      <div
        className={cn(
          "mt-2 grid gap-4 lg:mt-0 lg:grid",
          open ? "grid" : "hidden"
        )}
        id="admin-sections"
      >
        {keys.has("overview") ? <ul>{link("overview")}</ul> : null}
        {groups.map((group, index) => {
          const items = [
            ...group.modules,
            ...(index === groups.length - 1 ? ungrouped : []),
          ].filter((m) => keys.has(m));
          if (items.length === 0) {
            return null;
          }
          return (
            <div className="grid gap-1" key={group.key}>
              <p className="type-caption">{t(`nav.groups.${group.key}`)}</p>
              <ul className="grid grid-cols-2 gap-x-4 sm:grid-cols-3 lg:grid-cols-1">
                {items.map(link)}
              </ul>
            </div>
          );
        })}
        <div className="grid gap-1">
          <p className="type-caption">{t("nav.groups.yours")}</p>
          <ul className="grid grid-cols-2 gap-x-4 sm:grid-cols-3 lg:grid-cols-1">
            {ownPages.map((page) => {
              const active = own?.href === page.href;
              return (
                <li key={page.href}>
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block py-2 text-sm underline-offset-4 hover:underline lg:py-1",
                      active && "font-medium text-text"
                    )}
                    href={page.href}
                  >
                    {tn(page.key)}
                  </Link>
                </li>
              );
            })}
            {notion.map((page) => (
              <li key={page.key}>
                <a
                  className="inline-flex items-center gap-1.5 py-2 text-sm underline-offset-4 hover:underline lg:py-1"
                  href={page.href}
                  rel="noopener"
                  target="_blank"
                >
                  {tn(page.key)}
                  <Icon
                    className="size-3.5"
                    label={tc("externalLink")}
                    name="arrow-up-right"
                  />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
};

/** The administration area: grouped section navigation and the section. */
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

  return (
    <div className="grid gap-6 lg:grid-cols-[14rem_1fr] lg:gap-8">
      <AdminNav />
      <div className="min-w-0">{children}</div>
    </div>
  );
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
  const { grants, visible } = useVisibleModules();

  if (grants.isPending) {
    return <SectionSpinner />;
  }
  if (!visible.some((m) => m.key === module)) {
    // The Overview is only for some roles: open the first section this
    // member can use instead of a dead end.
    const [first] = visible;
    if (module === "overview" && first) {
      return <OpenFirst href={hrefFor(first.key)} />;
    }
    return <p className="type-body text-text-secondary">{t("noAccess")}</p>;
  }
  return children;
};

const OpenFirst = ({ href }: { href: string }) => {
  const router = useRouter();
  useEffect(() => {
    router.replace(href);
  }, [href, router]);
  return <SectionSpinner />;
};
