"use client";

import { hasPermissionAnywhere, type Permission } from "@repo/rbac";
import { useTranslations } from "next-intl";
import { type SectionTab, SectionTabs, useVisibleModules } from "./admin-shell";

interface Tab {
  readonly href: string;
  readonly key: TabKey;
  /** The module that shows it; with `permission`, held as well. */
  readonly module: string;
  readonly permission?: Permission;
}

type TabKey =
  | "calendar"
  | "programs"
  | "door"
  | "members"
  | "verification"
  | "hiring"
  | "service"
  | "partners"
  | "insights"
  | "minutes"
  | "resolutions"
  | "requests"
  | "elections"
  | "concerns"
  | "library";

const useTabs = (tabs: readonly Tab[], labels: (key: TabKey) => string) => {
  const { grants, visible } = useVisibleModules();
  const modules = new Set<string>(visible.map((m) => m.key));
  return tabs
    .filter(
      (tab) =>
        modules.has(tab.module) &&
        (!tab.permission || hasPermissionAnywhere(grants.data, tab.permission))
    )
    .map((tab): SectionTab => ({ href: tab.href, label: labels(tab.key) }));
};

const EVENTS: readonly Tab[] = [
  { href: "/events", key: "calendar", module: "events" },
  { href: "/events/programs", key: "programs", module: "programs" },
  { href: "/events/door", key: "door", module: "events" },
];

/** What's on: the calendar, the six programs (Second Chapter among them), the door. */
export const EventsTabs = () => {
  const t = useTranslations("nexus.admin.sections.tabs");
  const tabs = useTabs(EVENTS, (key) => t(key));
  return <SectionTabs label={t("events")} tabs={tabs} />;
};

const PEOPLE: readonly Tab[] = [
  { href: "/people", key: "members", module: "members" },
  {
    href: "/people/verification",
    key: "verification",
    module: "members",
    permission: "members.verify",
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
];

/** People: members, verification, hiring, service, partners, insights. */
export const PeopleTabs = () => {
  const t = useTranslations("nexus.admin.sections.tabs");
  const tabs = useTabs(PEOPLE, (key) => t(key));
  return <SectionTabs label={t("people")} tabs={tabs} />;
};

const SOCIETY: readonly Tab[] = [
  {
    href: "/society",
    key: "minutes",
    module: "governance",
    permission: "governance.minutes.write",
  },
  { href: "/society/resolutions", key: "resolutions", module: "governance" },
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
];

/** Society: minutes, resolutions, requests, elections, concerns, the Library. */
export const SocietyTabs = () => {
  const t = useTranslations("nexus.admin.sections.tabs");
  const tabs = useTabs(SOCIETY, (key) => t(key));
  return <SectionTabs label={t("society")} tabs={tabs} />;
};
