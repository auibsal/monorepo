"use client";

import { useAuth } from "@repo/auth/provider";
import type { Locale } from "@repo/internationalization";
import {
  formatClock,
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { hasPermissionAnywhere } from "@repo/rbac";
import { localized, unwrap } from "@repo/sal-data";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/nexus/navigation";
import { useGrants } from "@/lib/nexus/queries";
import { DiwanSection } from "../../page";
import { ErrorState, SectionSpinner } from "../../states";
import { AdminHeading, type Column, DataTable } from "../kit";
import { ProgramLinks } from "../programmes/admin";
import { adminEventColumns, useProgrammeOptions } from "./data";

type Kind = "upcoming" | "past" | "drafts";

const useEventRows = (tab: Kind) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () => {
      const now = new Date().toISOString();
      let query = supabase
        .schema("events")
        .from("events")
        .select(adminEventColumns);
      if (tab === "drafts") {
        query = query.eq("status", "draft").order("starts_at");
      } else if (tab === "upcoming") {
        query = query
          .neq("status", "draft")
          .gte("starts_at", now)
          .order("starts_at");
      } else {
        query = query
          .neq("status", "draft")
          .lt("starts_at", now)
          .order("starts_at", { ascending: false })
          .limit(100);
      }
      const rows = unwrap(await query) ?? [];
      const ids = rows.map((e) => e.id);
      const rsvps = ids.length
        ? (unwrap(
            await supabase
              .schema("events")
              .from("rsvps")
              .select("event_id")
              .eq("status", "confirmed")
              .in("event_id", ids)
          ) ?? [])
        : [];
      return rows.map((e) => ({
        ...e,
        confirmed: rsvps.filter((r) => r.event_id === e.id).length,
      }));
    },
    queryKey: ["admin", "events", tab],
  });
};

type Row = NonNullable<ReturnType<typeof useEventRows>["data"]>[number];

/**
 * What's on in the Diwan: what's coming, then drafts, then what's past,
 * one page (no tabs held in the page's state).
 */
export const EventsList = () => {
  const t = useTranslations("nexus.admin.events");
  const ts = useTranslations("nexus.admin.kit.statuses");
  const locale = useLocale() as Locale;
  const grants = useGrants();
  const programmes = useProgrammeOptions();
  const upcoming = useEventRows("upcoming");
  const drafts = useEventRows("drafts");
  const past = useEventRows("past");
  const manages = hasPermissionAnywhere(grants.data, "events.manage");

  const columns: Column<Row>[] = [
    {
      cell: (e) => (
        <Link
          className="font-medium underline underline-offset-4"
          href={`/events/${e.slug ?? e.id}`}
        >
          {localized(e, "title", locale)}
        </Link>
      ),
      header: t("columns.title"),
      key: "title",
    },
    {
      cell: (e) => (
        <span className="whitespace-nowrap">
          {formatLongDate(e.starts_at, locale)},{" "}
          {formatClock(e.starts_at, locale)}
        </span>
      ),
      header: t("columns.when"),
      key: "when",
    },
    {
      cell: (e) => programmes.label(e.programme_id) ?? "—",
      header: t("columns.programme"),
      key: "programme",
    },
    {
      cell: (e) => (e.members_only ? t("membersOnly") : t("public")),
      header: t("columns.access"),
      key: "access",
    },
    {
      cell: (e) =>
        e.capacity
          ? t("rsvpCount", {
              capacity: formatNumber(e.capacity),
              confirmed: formatNumber(e.confirmed),
            })
          : formatNumber(e.confirmed),
      className: "tabular-nums whitespace-nowrap",
      header: t("columns.rsvps"),
      key: "rsvps",
    },
    {
      cell: (e) => ts(e.status as "draft" | "published" | "cancelled"),
      header: t("columns.status"),
      key: "status",
    },
    {
      cell: (e) =>
        e.status === "published" ? (
          <Link
            className="text-sm underline underline-offset-4"
            href={`/events/${e.slug ?? e.id}/door`}
          >
            {t("checkIn")}
          </Link>
        ) : null,
      header: t("columns.door"),
      key: "check-in",
    },
  ];

  const table = (
    query: ReturnType<typeof useEventRows>,
    caption: string,
    empty: string
  ) => (
    <>
      {query.isPending ? <SectionSpinner /> : null}
      {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : null}
      {query.data ? (
        <DataTable
          caption={caption}
          columns={columns}
          empty={empty}
          rowKey={(e) => e.id}
          rows={query.data}
        />
      ) : null}
    </>
  );

  return (
    <div className="grid gap-10">
      <AdminHeading
        actions={
          manages ? (
            <Link
              className="inline-flex h-8 items-center bg-accent px-3 font-medium text-on-accent text-sm hover:bg-accent/90"
              href="/events/new"
            >
              {t("new")}
            </Link>
          ) : null
        }
        title={t("title")}
      >
        {t("lede")}
      </AdminHeading>
      <ProgramLinks />
      <div className="grid gap-4">
        {table(upcoming, t("tabs.upcoming"), t("noUpcoming"))}
        <p className="type-caption">{t("campusNote")}</p>
      </div>
      {drafts.data && drafts.data.length > 0 ? (
        <DiwanSection id="drafts" title={t("tabs.drafts")}>
          {table(drafts, t("tabs.drafts"), "")}
        </DiwanSection>
      ) : null}
      <DiwanSection id="past" title={t("tabs.past")}>
        {table(past, t("tabs.past"), t("noPast"))}
      </DiwanSection>
    </div>
  );
};
