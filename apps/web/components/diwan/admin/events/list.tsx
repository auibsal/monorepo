"use client";

import type { Locale } from "@repo/internationalization";
import {
  formatClock,
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { events, localized, unwrap } from "@/lib/data";
import { Link } from "@/lib/diwan/navigation";
import { DiwanSection } from "../../page";
import { EmptyLine, ErrorState, SectionSpinner } from "../../states";
import {
  AdminHeading,
  type Column,
  DataTable,
  NewLink,
  RecordList,
} from "../kit";
import { RecentlyDeleted } from "../recently-deleted";
import { adminEventColumns } from "./data";

type Kind = "upcoming" | "past" | "drafts";

const useEventRows = (tab: Kind) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () => {
      const now = new Date().toISOString();
      let query = supabase
        .schema("api")
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
              .schema("api")
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
 * Events in the Diwan: what's coming, then drafts, then what's past,
 * one page (no tabs held in the page's state).
 */
export const EventsList = () => {
  const t = useTranslations("diwan.admin.events");
  const ts = useTranslations("diwan.admin.kit.statuses");
  const tw = useTranslations("web.events.goodToKnow.who");
  const tk = useTranslations("diwan.admin.kit");
  const tp = useTranslations("diwan.admin.presets");
  const locale = useLocale() as Locale;
  const upcoming = useEventRows("upcoming");
  const drafts = useEventRows("drafts");
  const past = useEventRows("past");

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
      cell: (e) =>
        e.entry === "invite"
          ? tw("invite")
          : `${events.classesLabel(e.classes, {
              everyone: tw("everyone"),
              locale: locale === "ar" ? "ar" : "en",
              names: {
                associate: tw("classes.associate"),
                guest: tw("classes.guest"),
                honorary: tw("classes.honorary"),
                member: tw("classes.member"),
              },
              only: (name) => tw("only", { classes: name }),
            })} · ${tw(e.entry === "open" ? "how.open" : "how.rsvp")}`,
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
      cell: (e) => ts(e.status as "draft" | "published" | "canceled"),
      header: t("columns.status"),
      key: "status",
    },
    {
      cell: (e) =>
        e.status === "published" ? (
          <Link
            className="text-sm underline underline-offset-4"
            href={`/events/${e.slug ?? e.id}/check-in`}
          >
            {t("checkIn")}
          </Link>
        ) : null,
      header: t("columns.door"),
      key: "check-in",
    },
  ];

  const loading = upcoming.isPending || past.isPending;
  const failed = [upcoming, past, drafts].find((q) => q.isError);
  const groups: { kind: Kind; rows: readonly Row[] }[] = [
    { kind: "upcoming", rows: upcoming.data ?? [] },
    { kind: "drafts", rows: drafts.data ?? [] },
    { kind: "past", rows: past.data ?? [] },
  ];
  const all = groups.flatMap((g) =>
    g.rows.map((row) => ({ kind: g.kind, row }))
  );
  const table = (rows: readonly Row[], caption: string, empty: string) => (
    <DataTable
      caption={caption}
      columns={columns}
      empty={empty}
      rowKey={(e) => e.id}
      rows={[...rows]}
    />
  );

  // One list (decisions.md, The site): one find line over the coming,
  // draft and past events, kept in the query string.
  return (
    <div className="grid gap-10">
      <AdminHeading title={t("title")}>{t("lede")}</AdminHeading>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <NewLink href="/events/new">{t("new")}</NewLink>
        <Link className="link" href="/presets/event">
          {tp("open")}
        </Link>
      </div>
      {loading ? <SectionSpinner /> : null}
      {failed ? <ErrorState onRetry={() => failed.refetch()} /> : null}
      {loading || failed ? null : (
        <RecordList
          empty={
            <EmptyLine action={{ href: "/events", label: tk("showAll") }}>
              {tk("noMatches")}
            </EmptyLine>
          }
          items={all}
          matches={({ row }, q) =>
            [row.title_en, row.title_ar, row.slug].some((v) =>
              v?.toLowerCase().includes(q)
            )
          }
        >
          {(found) => {
            const of = (kind: Kind) =>
              found.filter((f) => f.kind === kind).map((f) => f.row);
            const draftRows = of("drafts");
            return (
              <div className="grid gap-10">
                <div className="grid gap-4">
                  {table(of("upcoming"), t("tabs.upcoming"), t("noUpcoming"))}
                  <p className="type-caption">{t("campusNote")}</p>
                </div>
                {draftRows.length > 0 ? (
                  <DiwanSection id="drafts" title={t("tabs.drafts")}>
                    {table(draftRows, t("tabs.drafts"), "")}
                  </DiwanSection>
                ) : null}
                <DiwanSection id="past" title={t("tabs.past")}>
                  {table(of("past"), t("tabs.past"), t("noPast"))}
                </DiwanSection>
              </div>
            );
          }}
        </RecordList>
      )}
      <RecentlyDeleted kind="event" />
    </div>
  );
};
