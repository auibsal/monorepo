"use client";

import type { AdminSection } from "@repo/rbac";
import { useTranslations } from "next-intl";
import { SectionTabs, useVisibleModules } from "./admin-shell";
import { allowedViews } from "./section-views";

const Tabs = ({ section }: { readonly section: AdminSection }) => {
  const t = useTranslations("diwan.admin.sections.tabs");
  const { grants, visible } = useVisibleModules();
  const modules = new Set<string>(visible.map((m) => m.key));
  const tabs = allowedViews(section, modules, grants.data).map((view) => ({
    href: view.href,
    label: t(view.key as never),
  }));
  return <SectionTabs label={t(section as never)} tabs={tabs} />;
};

/** Qirtas: the newsroom, Editions, the Prize, Qalam and certificates. */
export const QirtasTabs = () => <Tabs section="qirtas" />;

/** Membership: the Register, openings, service and the Typewriter Tour. */
export const MembershipTabs = () => <Tabs section="membership" />;

/** Partnerships: partners, their applications and memoranda. */
export const PartnershipsTabs = () => <Tabs section="partnerships" />;

/** Media: Next Stop, the channels and the design system. */
export const MediaTabs = () => <Tabs section="media" />;

/** The Council: meetings, requests, elections, concerns, the Library. */
export const CouncilTabs = () => <Tabs section="council" />;
