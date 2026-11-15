"use client";

import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Label } from "@repo/brand/components/ui/label";
import type { Locale } from "@repo/internationalization";
import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { membership } from "@/lib/data";
import { Link } from "@/lib/diwan/navigation";
import { useGrants } from "@/lib/diwan/queries";
import { useQueryState } from "@/lib/diwan/use-query-param";
import { hasPermission } from "@/lib/rbac";
import { EmptyLine, ErrorState, SectionSpinner } from "../../states";
import {
  AdminHeading,
  type Column,
  DataTable,
  RecordList,
  RowCount,
  SelectInput,
} from "../kit";

type Row = membership.DirectoryRow;

/** The Register (decisions.md: private, for the Executive Board and
 * the Director of Membership). */
export const useDirectory = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: () => membership.register(supabase),
    queryKey: ["admin", "directory"],
  });
};

export const memberName = (
  row: Pick<Row, "full_name_en" | "full_name_ar">,
  locale: string
) =>
  (locale === "ar" && row.full_name_ar) ||
  row.full_name_en ||
  row.full_name_ar ||
  "";

export const MembersDirectory = () => {
  const t = useTranslations("diwan.admin.members");
  const tt = useTranslations("diwan.home.tiers");
  const tk = useTranslations("diwan.admin.kit");
  const locale = useLocale() as Locale;
  const id = useId();
  const grants = useGrants();
  const directory = useDirectory();
  // The filters live in the query string beside the find line (decisions.md,
  // The site: "One list"), so a filtered Register can be shared and reloads.
  const [tierParam, setTierParam] = useQueryState("tier");
  const [votingParam, setVotingParam] = useQueryState("voting");
  const [tier, setTierState] = useState(
    (membership.tiers as readonly string[]).includes(tierParam)
      ? (tierParam as membership.Tier)
      : ""
  );
  const [votingOnly, setVotingState] = useState(votingParam === "1");
  const setTier = (value: "" | membership.Tier) => {
    setTierState(value);
    setTierParam(value);
  };
  const setVotingOnly = (value: boolean) => {
    setVotingState(value);
    setVotingParam(value ? "1" : "");
  };
  const rows = useMemo(
    () =>
      (directory.data ?? []).filter(
        (row) =>
          (!tier || row.tier === tier) && (!votingOnly || row.voting_member)
      ),
    [directory.data, tier, votingOnly]
  );

  if (directory.isPending) {
    return <SectionSpinner />;
  }
  if (directory.isError) {
    return <ErrorState onRetry={() => directory.refetch()} />;
  }

  const columns: Column<Row>[] = [
    {
      cell: (row) => (
        <Link
          className="font-medium underline underline-offset-4"
          href={`/membership/${row.user_id}`}
        >
          {memberName(row, locale) || t("unnamed")}
        </Link>
      ),
      header: t("columns.name"),
      key: "name",
    },
    {
      cell: (row) => (
        <span className="break-all" dir="ltr">
          {row.email}
        </span>
      ),
      header: t("columns.email"),
      key: "email",
    },
    {
      // Guests and partners' people hold no tier (one membership kind).
      cell: (row) => (row.tier ? tt(row.tier) : t("notAMember")),
      header: t("columns.tier"),
      key: "tier",
    },
    {
      cell: (row) =>
        row.member_since ? formatLongDate(row.member_since, locale, true) : "—",
      className: "whitespace-nowrap",
      header: t("columns.since"),
      key: "since",
    },
    {
      cell: (row) => formatNumber(row.activities),
      className: "text-end tabular-nums",
      header: t("columns.activities"),
      key: "activities",
    },
    {
      cell: (row) => (row.voting_member ? t("yes") : t("no")),
      header: t("columns.voting"),
      key: "voting",
    },
  ];

  return (
    <div className="grid gap-6">
      <AdminHeading
        actions={
          // No bulk export of the Register (decisions §10): counts only.
          hasPermission(grants.data, "members.manage") ? (
            <Link className="link" href="/membership/guests">
              {t("guests.link")}
            </Link>
          ) : null
        }
        title={t("title")}
      >
        {t("lede")}
      </AdminHeading>
      <RecordList
        empty={
          <EmptyLine action={{ href: "/membership", label: tk("showAll") }}>
            {tk("noMatches")}
          </EmptyLine>
        }
        filters={
          <>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-tier`}>{t("filters.tier")}</Label>
              <SelectInput
                className="w-44"
                id={`${id}-tier`}
                onChange={(e) =>
                  setTier(e.target.value as "" | membership.Tier)
                }
                value={tier}
              >
                <option value="">{tk("all")}</option>
                {membership.tiers.map((value) => (
                  <option key={value} value={value}>
                    {tt(value)}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Checkbox
                checked={votingOnly}
                id={`${id}-voting`}
                onCheckedChange={(v) => setVotingOnly(v === true)}
              />
              <Label htmlFor={`${id}-voting`}>{t("filters.voting")}</Label>
            </div>
          </>
        }
        items={rows}
        matches={(row, q) =>
          row.email.toLowerCase().includes(q) ||
          row.full_name_en.toLowerCase().includes(q) ||
          (row.full_name_ar ?? "").includes(q)
        }
      >
        {(found) => (
          <>
            <RowCount count={found.length} />
            <DataTable
              caption={t("title")}
              columns={columns}
              rowKey={(row) => row.user_id}
              rows={found}
            />
          </>
        )}
      </RecordList>
    </div>
  );
};
