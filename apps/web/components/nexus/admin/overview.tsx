"use client";

import { useAuth } from "@repo/auth/provider";
import { SalCard } from "@repo/design-system/components/sal/card";
import { Icon, type IconName } from "@repo/design-system/components/sal/icon";
import type { Locale } from "@repo/internationalization";
import {
  formatIqd,
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { hasPermissionAnywhere, type Permission } from "@repo/rbac";
import { localized, unwrap } from "@repo/sal-data";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/nexus/navigation";
import { useNotionHandbook, useTeamWorkspace } from "@/lib/nexus/notion";
import { useGrants } from "@/lib/nexus/queries";
import { DiwanSection } from "../page";
import { ErrorState, SectionSpinner } from "../states";
import { doorPath, useDoorEvents } from "./events/check-in";
import { AdminHeading } from "./kit";
import { RecentActivity } from "./system/activity";
import { EmailDelivery } from "./system/email";
import { NotionWorkspace } from "./system/notion";
import { TelegramBot } from "./system/telegram";

interface Overview {
  campaigns?: {
    campaign_id: string;
    counted_iqd: number;
    pending_iqd: number;
    title_ar: string;
    title_en: string;
  }[];
  intake_oldest_at?: string | null;
  members?: number;
  next_event?: {
    booked: number;
    capacity: number | null;
    starts_at: string;
    title_ar: string;
    title_en: string;
  } | null;
  open_submissions?: number;
  submissions_by_status?: Partial<Record<string, number>>;
  upcoming_rsvps?: number;
  verification_oldest_at?: string | null;
  verification_pending?: number;
  voting_members?: number;
}

/** One figure with the sentence that says what it means, and where to act. */
const Figure = ({
  action,
  detail,
  href,
  label,
  value,
}: {
  readonly action?: string;
  readonly detail: string;
  readonly href?: string;
  readonly label: string;
  readonly value: number;
}) => (
  <SalCard className="content-start gap-2 p-4 sm:gap-3 sm:p-space-4">
    <p className="type-label">{label}</p>
    <p className="font-light text-3xl text-text tabular-nums sm:text-4xl">
      {formatNumber(value)}
    </p>
    <p className="sm:type-body text-sm">{detail}</p>
    {action && href ? (
      <Link className="link type-caption justify-self-start" href={href}>
        {action}
      </Link>
    ) : null}
  </SalCard>
);

type T = ReturnType<typeof useTranslations<"nexus.admin.overview">>;
type FigureProps = Parameters<typeof Figure>[0];

const membersFigure = (o: Overview, t: T): FigureProps | null =>
  o.members === undefined
    ? null
    : {
        detail: t("membersDetail", {
          count: o.voting_members ?? 0,
          n: formatNumber(o.voting_members ?? 0),
        }),
        label: t("members"),
        value: o.members,
      };

const verificationFigure = (
  o: Overview,
  t: T,
  locale: Locale
): FigureProps | null => {
  if (o.verification_pending === undefined) {
    return null;
  }
  const waiting = o.verification_pending > 0 && o.verification_oldest_at;
  return {
    action: waiting ? t("reviewRequests") : undefined,
    detail: waiting
      ? t("verificationDetail", {
          date: formatLongDate(o.verification_oldest_at ?? "", locale),
        })
      : t("verificationNone"),
    href: "/people/verification",
    label: t("verificationPending"),
    value: o.verification_pending,
  };
};

const eventsFigure = (
  o: Overview,
  t: T,
  locale: Locale
): FigureProps | null => {
  if (o.upcoming_rsvps === undefined) {
    return null;
  }
  const next = o.next_event;
  let detail = t("noUpcoming");
  if (next) {
    const values = {
      booked: formatNumber(next.booked),
      date: formatLongDate(next.starts_at, locale),
      title: localized(next, "title", locale),
    };
    detail = next.capacity
      ? t("nextEventCapped", {
          ...values,
          capacity: formatNumber(next.capacity),
        })
      : t("nextEvent", values);
  }
  return {
    action: t("openEvents"),
    detail,
    href: "/events",
    label: t("upcomingRsvps"),
    value: o.upcoming_rsvps,
  };
};

const submissionsFigure = (
  o: Overview,
  t: T,
  locale: Locale
): FigureProps | null => {
  if (o.open_submissions === undefined) {
    return null;
  }
  const stages = o.submissions_by_status ?? {};
  const intake = (stages.received ?? 0) + (stages.intake_check ?? 0);
  const reading = (stages.in_review ?? 0) + (stages.third_read ?? 0);
  return {
    action: o.open_submissions ? t("openPipeline") : undefined,
    detail: o.open_submissions
      ? t("submissionsDetail", {
          intake: formatNumber(intake),
          oldest: o.intake_oldest_at
            ? formatLongDate(o.intake_oldest_at, locale)
            : "—",
          reading: formatNumber(reading),
          selection: formatNumber(stages.selection ?? 0),
        })
      : t("submissionsNone"),
    href: "/qirtas/review",
    label: t("openSubmissions"),
    value: o.open_submissions,
  };
};

/** Each figure with the sentence that gives it context (permission-gated). */
const buildFigures = (o: Overview, t: T, locale: Locale) =>
  [
    membersFigure(o, t),
    verificationFigure(o, t, locale),
    eventsFigure(o, t, locale),
    submissionsFigure(o, t, locale),
  ].filter((figure): figure is FigureProps => figure !== null);

// The Desk's quick actions (the overview, Oct 30, 2026): the first three
// the officer's grants allow, as text links beside the title.
const QUICK: readonly {
  readonly href: string;
  readonly icon: IconName;
  readonly key: "door" | "event" | "piece" | "verify" | "minutes";
  readonly permission: Permission;
}[] = [
  {
    href: "/events",
    icon: "scan-line",
    key: "door",
    permission: "events.checkin",
  },
  {
    href: "/events/new",
    icon: "plus",
    key: "event",
    permission: "events.manage",
  },
  {
    href: "/qirtas/pieces/new",
    icon: "pencil",
    key: "piece",
    permission: "journal.manage",
  },
  {
    href: "/people/verification",
    icon: "id-card",
    key: "verify",
    permission: "members.verify",
  },
  {
    href: "/society/minutes/new",
    icon: "file-text",
    key: "minutes",
    permission: "governance.minutes.write",
  },
];

const QuickActions = () => {
  const t = useTranslations("nexus.admin.overview.quick");
  const grants = useGrants();
  // The door is today's or the next event's own door; without one ahead,
  // the action stands aside for the next.
  const next = useDoorEvents().data?.[0];
  const actions = QUICK.filter(
    (action) =>
      hasPermissionAnywhere(grants.data, action.permission) &&
      (action.key !== "door" || next)
  ).slice(0, 3);
  return actions.map((action) => (
    <Link
      className="inline-flex items-center gap-1.5 font-medium text-sm hover:text-accent"
      href={action.key === "door" && next ? doorPath(next) : action.href}
      key={action.key}
    >
      <Icon name={action.icon} />
      {t(action.key)}
    </Link>
  ));
};

/** Where the team's own papers are: the Notion workspace and the handbook. */
const NotionLinks = () => {
  const tn = useTranslations("nexus.nav");
  const tc = useTranslations("common");
  const workspace = useTeamWorkspace();
  const handbook = useNotionHandbook();
  const links = [
    ...(workspace ? [{ href: workspace, key: "workspace" } as const] : []),
    ...(handbook.home
      ? [{ href: handbook.home, key: "handbook" } as const]
      : []),
    ...(handbook.templates
      ? [{ href: handbook.templates, key: "templates" } as const]
      : []),
  ];
  if (links.length === 0) {
    return null;
  }
  return (
    <p className="flex flex-wrap gap-x-6 gap-y-2">
      {links.map((link) => (
        <a
          className="inline-flex items-center gap-1.5 text-sm underline-offset-4 hover:underline"
          href={link.href}
          key={link.key}
          rel="noopener"
          target="_blank"
        >
          {tn(link.key)}
          <Icon
            className="size-3.5"
            label={tc("externalLink")}
            name="arrow-up-right"
          />
        </a>
      ))}
    </p>
  );
};

export const AdminOverview = () => {
  const t = useTranslations("nexus.admin.overview");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const grants = useGrants();
  const overview = useQuery({
    queryFn: async () =>
      (unwrap(await supabase.schema("core").rpc("admin_overview")) ??
        {}) as Overview,
    queryKey: ["admin", "overview"],
  });

  if (overview.isPending) {
    return <SectionSpinner />;
  }
  if (overview.isError) {
    return <ErrorState onRetry={() => overview.refetch()} />;
  }

  const o = overview.data;
  const figures = buildFigures(o, t, locale);
  const can = (permission: Permission) =>
    hasPermissionAnywhere(grants.data, permission);

  return (
    <div className="grid gap-14">
      <div className="grid gap-4">
        <AdminHeading actions={<QuickActions />} title={t("title")} />
        <NotionLinks />
      </div>
      {figures.length === 0 && !o.campaigns ? (
        <p className="type-body text-text-secondary">{t("nothing")}</p>
      ) : null}
      {figures.length > 0 ? (
        <div className="grid grid-cols-2 gap-space-3 sm:gap-space-4 xl:grid-cols-3">
          {figures.map((figure) => (
            <Figure key={figure.label} {...figure} />
          ))}
        </div>
      ) : null}
      {o.campaigns ? (
        <DiwanSection id="campaigns" title={t("campaigns")}>
          {o.campaigns.length === 0 ? (
            <p className="type-body text-text-secondary">{t("noCampaigns")}</p>
          ) : (
            <ul className="grid gap-space-4 sm:grid-cols-2">
              {o.campaigns.map((c) => (
                <li key={c.campaign_id}>
                  <SalCard>
                    <p className="font-medium">
                      {localized(c, "title", locale)}
                    </p>
                    <p className="font-light text-2xl text-text tabular-nums">
                      {t("counted", {
                        amount: formatIqd(c.counted_iqd, locale),
                      })}
                    </p>
                    {c.pending_iqd > 0 ? (
                      <p className="type-caption">
                        {t("pending", {
                          amount: formatIqd(c.pending_iqd, locale),
                        })}
                      </p>
                    ) : null}
                  </SalCard>
                </li>
              ))}
            </ul>
          )}
        </DiwanSection>
      ) : null}
      {can("audit.read") ? (
        <DiwanSection id="activity" title={t("activity")}>
          <RecentActivity />
          <Link
            className="link type-caption justify-self-start"
            href="/activity"
          >
            {t("allActivity")}
          </Link>
        </DiwanSection>
      ) : null}
      {can("settings.manage") ? (
        <DiwanSection id="connected" title={t("connected")}>
          <p className="type-body">{t("connectedLede")}</p>
          <NotionWorkspace />
          <TelegramBot />
          <EmailDelivery />
        </DiwanSection>
      ) : null}
    </div>
  );
};
