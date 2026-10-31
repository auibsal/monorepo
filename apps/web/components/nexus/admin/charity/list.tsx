"use client";

import { useAuth } from "@repo/auth/provider";
import type { Locale } from "@repo/internationalization";
import { formatIqd, formatLongDate } from "@repo/internationalization/format";
import { hasPermission } from "@repo/rbac";
import { charity, localized, unwrap } from "@repo/sal-data";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/nexus/navigation";
import { useGrants } from "@/lib/nexus/queries";
import { SectionSpinner } from "../../states";
import { AdminHeading, type Column, DataTable } from "../kit";

export const useCampaigns = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () => {
      const [campaigns, progress] = await Promise.all([
        supabase
          .schema("charity")
          .from("campaigns")
          .select(
            "id, slug, title_en, title_ar, status, starts_on, handed_over_on"
          )
          .order("created_at", { ascending: false }),
        charity.campaignProgress(supabase),
      ]);
      return (unwrap(campaigns) ?? []).map((c) => ({
        ...c,
        progress: progress.find((p) => p.campaign_id === c.id),
      }));
    },
    queryKey: ["admin", "campaigns"],
  });
};

export const CharityAdmin = () => {
  const t = useTranslations("nexus.admin.charity");
  const locale = useLocale() as Locale;
  const grants = useGrants();
  const campaigns = useCampaigns();
  const isGlobal = hasPermission(grants.data, "charity.manage");

  type Row = NonNullable<typeof campaigns.data>[number];
  const columns: Column<Row>[] = [
    {
      cell: (c) => (
        <Link
          className="font-medium underline underline-offset-4"
          href={`/events/programs/second-chapter/campaigns/${c.id}`}
        >
          {localized(c, "title", locale)}
        </Link>
      ),
      header: t("columns.campaign"),
      key: "title",
    },
    {
      cell: (c) => t(`statuses.${c.status as "draft" | "active" | "closed"}`),
      header: t("columns.status"),
      key: "status",
    },
    {
      cell: (c) => formatIqd(c.progress?.counted_iqd ?? 0, locale),
      className: "whitespace-nowrap tabular-nums",
      header: t("columns.counted"),
      key: "counted",
    },
    {
      cell: (c) => formatIqd(c.progress?.pending_iqd ?? 0, locale),
      className: "whitespace-nowrap tabular-nums",
      header: t("columns.pending"),
      key: "pending",
    },
    {
      cell: (c) =>
        c.handed_over_on
          ? formatLongDate(c.handed_over_on, locale)
          : t("notHandedOver"),
      header: t("columns.handover"),
      key: "handover",
    },
  ];

  return (
    <div className="grid gap-8">
      <AdminHeading
        actions={
          isGlobal ? (
            <Link
              className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-primary-foreground text-sm"
              href="/events/programs/second-chapter/campaigns/new"
            >
              {t("newCampaign")}
            </Link>
          ) : null
        }
        title={t("title")}
      >
        {t("lede")}
      </AdminHeading>
      <section className="grid gap-3">
        <h2 className="type-heading">{t("campaigns")}</h2>
        {campaigns.isPending ? <SectionSpinner /> : null}
        {campaigns.data ? (
          <DataTable
            columns={columns}
            rowKey={(c) => c.id}
            rows={campaigns.data}
          />
        ) : null}
      </section>
      <p className="type-body text-text-secondary">
        {t("partnersMoved")}{" "}
        <Link className="link" href="/people/partners">
          {t("partnersLink")}
        </Link>
      </p>
    </div>
  );
};
