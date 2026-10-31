"use client";

import { hasPermissionAnywhere, type Permission } from "@repo/rbac";
import { useTranslations } from "next-intl";
import { type SectionTab, SectionTabs, useVisibleModules } from "./admin-shell";

interface Tab {
  readonly href: string;
  readonly key: TabKey;
  /** The module that shows it; with `permission`, held as well. */
  readonly module: string;
  /** Held as well, any one of them. */
  readonly permission?: Permission | readonly Permission[];
}

type TabKey =
  | "newsroom"
  | "review"
  | "editions"
  | "awards"
  | "ads"
  | "calendar"
  | "programs"
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
        (!tab.permission ||
          (Array.isArray(tab.permission)
            ? tab.permission
            : [tab.permission]
          ).some((p) => hasPermissionAnywhere(grants.data, p)))
    )
    .map((tab): SectionTab => ({ href: tab.href, label: labels(tab.key) }));
};

const EVENTS: readonly Tab[] = [
  { href: "/events", key: "calendar", module: "events" },
  { href: "/events/programs", key: "programs", module: "programs" },
];

/** What's on: the calendar and the six programs (Second Chapter among them); each event has its own door. */
export const EventsTabs = () => {
  const t = useTranslations("nexus.admin.sections.tabs");
  const tabs = useTabs(EVENTS, (key) => t(key));
  return <SectionTabs label={t("events")} tabs={tabs} />;
};

const QIRTAS: readonly Tab[] = [
  { href: "/qirtas", key: "newsroom", module: "journal" },
  {
    href: "/qirtas/review",
    key: "review",
    module: "journal",
    permission: [
      "journal.manage",
      "journal.review",
      "journal.identity.view",
      "journal.decide",
      "journal.advise",
    ],
  },
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
];

/**
 * Qirtas (owner, Oct 31, 2026): the newsroom, where staff write and
 * publish; the blind review of what members send; and the three features
 * with pages of their own (Editions, Awards, ads).
 */
export const QirtasTabs = () => {
  const t = useTranslations("nexus.admin.sections.tabs");
  const tabs = useTabs(QIRTAS, (key) => t(key));
  return <SectionTabs label={t("qirtas")} tabs={tabs} />;
};

const PEOPLE: readonly Tab[] = [
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
