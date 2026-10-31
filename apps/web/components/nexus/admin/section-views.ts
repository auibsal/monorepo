import {
  type AdminSection,
  hasPermissionAnywhere,
  type Permission,
} from "@repo/rbac";

/**
 * Every view of a Diwan section, with what opens it. The row links each
 * section to the first view the officer can open (so a section never
 * opens on a page their roles don't include), and the section's tabs
 * list only these.
 */
export interface SectionView {
  readonly href: string;
  readonly key: ViewKey;
  /** The module that shows it; with `permission`, held as well. */
  readonly module: string;
  /** Held as well, any one of them. */
  readonly permission?: Permission | readonly Permission[];
}

export type ViewKey =
  | "desk"
  | "events"
  | "company"
  | "newsroom"
  | "editions"
  | "awards"
  | "ads"
  | "members"
  | "verification"
  | "hiring"
  | "service"
  | "partners"
  | "insights"
  | "meetings"
  | "requests"
  | "elections"
  | "concerns"
  | "library";

export const sectionViews: Record<AdminSection, readonly SectionView[]> = {
  company: [{ href: "/company", key: "company", module: "productions" }],
  desk: [{ href: "/", key: "desk", module: "*" }],
  events: [{ href: "/events", key: "events", module: "events" }],
  people: [
    { href: "/people", key: "members", module: "members" },
    {
      href: "/people/verification",
      key: "verification",
      module: "partners",
    },
    { href: "/people/hiring", key: "hiring", module: "hiring" },
    { href: "/people/service", key: "service", module: "recognition" },
    { href: "/people/partners", key: "partners", module: "partners" },
    {
      href: "/people/insights",
      key: "insights",
      module: "members",
      permission: "members.manage",
    },
  ],
  qirtas: [
    { href: "/qirtas", key: "newsroom", module: "journal" },
    {
      href: "/qirtas/editions",
      key: "editions",
      module: "journal",
      permission: ["journal.manage", "journal.publish"],
    },
    {
      href: "/qirtas/awards",
      key: "awards",
      module: "journal",
      permission: "journal.prizes",
    },
    { href: "/qirtas/ads", key: "ads", module: "ads" },
  ],
  society: [
    {
      href: "/society",
      key: "meetings",
      module: "governance",
      permission: ["governance.manage", "governance.minutes.write"],
    },
    {
      href: "/society/requests",
      key: "requests",
      module: "governance",
      permission: "governance.manage",
    },
    {
      href: "/society/elections",
      key: "elections",
      module: "governance",
      permission: "elections.manage",
    },
    {
      href: "/society/concerns",
      key: "concerns",
      module: "forms",
      permission: "concerns.handle",
    },
    { href: "/society/library", key: "library", module: "library" },
  ],
};

type Grants = Parameters<typeof hasPermissionAnywhere>[0];

/** The views of a section this officer opens, in order, one per address. */
export const allowedViews = (
  section: AdminSection,
  modules: ReadonlySet<string>,
  grants: Grants
): SectionView[] => {
  const seen = new Set<string>();
  return sectionViews[section].filter((view) => {
    if (seen.has(view.href)) {
      return false;
    }
    const opens =
      (view.module === "*" ? modules.size > 0 : modules.has(view.module)) &&
      (!view.permission ||
        (Array.isArray(view.permission)
          ? view.permission
          : [view.permission]
        ).some((p) => hasPermissionAnywhere(grants, p)));
    if (opens) {
      seen.add(view.href);
    }
    return opens;
  });
};

const TRAILING_SLASH = /\/$/;

/** The view a Diwan path is, when it is one of a section's own views. */
export const viewOfPath = (pathname: string): SectionView | undefined => {
  const path =
    (pathname.split("?")[0] ?? pathname).replace(TRAILING_SLASH, "") || "/";
  for (const views of Object.values(sectionViews)) {
    const found = views.find((view) => view.href === path);
    if (found) {
      return found;
    }
  }
  return undefined;
};
