"use client";

import type { AdminSection } from "@repo/rbac";
import { useTranslations } from "next-intl";
import { SectionTabs, useVisibleModules } from "./admin-shell";
import { allowedViews } from "./section-views";

const Tabs = ({ section }: { readonly section: AdminSection }) => {
  const t = useTranslations("nexus.admin.sections.tabs");
  const { grants, visible } = useVisibleModules();
  const modules = new Set<string>(visible.map((m) => m.key));
  const tabs = allowedViews(section, modules, grants.data).map((view) => ({
    href: view.href,
    label: t(view.key as never),
  }));
  return <SectionTabs label={t(section as never)} tabs={tabs} />;
};

/**
 * Qirtas (owner, Oct 31, 2026): the newsroom, one page per section, where
 * staff write and publish and what members send is read blind; and
 * Editions, Awards and ads, each its own page.
 */
export const QirtasTabs = () => <Tabs section="qirtas" />;

/** People: members, verification, hiring, service, partners, insights. */
export const PeopleTabs = () => <Tabs section="people" />;

/** Society: meetings, requests, elections, concerns, the Library. */
export const SocietyTabs = () => <Tabs section="society" />;
