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
  | "prize"
  | "qalam"
  | "certificates"
  | "nextStop"
  | "design"
  | "members"
  | "invitations"
  | "openings"
  | "service"
  | "partners"
  | "applications"
  | "agreements"
  | "tour"
  | "meetings"
  | "requests"
  | "elections"
  | "concerns"
  | "disclosures"
  | "library";

export const sectionViews: Record<AdminSection, readonly SectionView[]> = {
  company: [{ href: "/company", key: "company", module: "productions" }],
  council: [
    {
      href: "/council",
      key: "meetings",
      module: "governance",
      permission: ["governance.manage", "governance.minutes.write"],
    },
    {
      href: "/council/requests",
      key: "requests",
      module: "governance",
      permission: "governance.manage",
    },
    {
      href: "/council/elections",
      key: "elections",
      module: "governance",
      permission: "elections.manage",
    },
    {
      href: "/council/concerns",
      key: "concerns",
      module: "forms",
      permission: "concerns.handle",
    },
    {
      href: "/council/disclosures",
      key: "disclosures",
      module: "governance",
      permission: ["governance.manage", "partners.sign"],
    },
    { href: "/council/library", key: "library", module: "library" },
  ],
  desk: [{ href: "/", key: "desk", module: "*" }],
  events: [{ href: "/events", key: "events", module: "events" }],
  media: [
    { href: "/media", key: "nextStop", module: "media" },
    { href: "/media/design", key: "design", module: "*" },
  ],
  membership: [
    { href: "/membership", key: "members", module: "members" },
    { href: "/membership/openings", key: "openings", module: "hiring" },
    {
      href: "/membership/invitations",
      key: "invitations",
      module: "members",
    },
    { href: "/membership/service", key: "service", module: "recognition" },
    { href: "/membership/typewriter-tour", key: "tour", module: "tour" },
  ],
  partnerships: [
    { href: "/partnerships", key: "partners", module: "partners" },
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
      href: "/qirtas/prize",
      key: "prize",
      module: "journal",
      permission: "journal.prize",
    },
    {
      href: "/qirtas/qalam",
      key: "qalam",
      module: "qalam",
      permission: "qalam.manage",
    },
    {
      href: "/qirtas/certificates",
      key: "certificates",
      module: "recognition",
      permission: [
        "certificates.prepare",
        "certificates.sign",
        "certificates.countersign",
      ],
    },
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
