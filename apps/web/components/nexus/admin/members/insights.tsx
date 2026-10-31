"use client";

import { useAuth } from "@repo/auth/provider";
import { formatNumber } from "@repo/internationalization/format";
import { hasPermission } from "@repo/rbac";
import { membership, unwrap } from "@repo/sal-data";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/nexus/navigation";
import { useGrants } from "@/lib/nexus/queries";
import { ErrorState, SectionSpinner } from "../../states";
import { AdminHeading } from "../kit";

const FACETS = [
  "affiliation",
  "study_level",
  "graduation_year",
  "interests",
  "skills",
  "languages",
  "heard_from",
  "gender",
] as const;
type Facet = (typeof FACETS)[number];

/** The message key for one answer, or the answer itself (a year). */
const labelKey: Record<Facet, string | null> = {
  affiliation: "affiliations",
  gender: "genders",
  graduation_year: null,
  heard_from: "heard",
  interests: "interests",
  languages: "languages",
  skills: "skills",
  study_level: "studyLevels",
};

/**
 * What members told the Society, counted: only members who agreed to be
 * counted, and no group smaller than five (the database hides those).
 */
export const MemberInsights = () => {
  const t = useTranslations("nexus.admin.members.insights");
  const td = useTranslations("nexus.details");
  const tk = useTranslations("nexus.admin.kit");
  const { supabase } = useAuth();
  const grants = useGrants();
  const allowed = hasPermission(grants.data, "members.manage");
  const insights = useQuery({
    enabled: allowed,
    queryFn: () => membership.memberInsights(supabase),
    queryKey: ["admin", "member-insights"],
  });
  // Members whose card is in their Google Wallet.
  const inWallet = useQuery({
    enabled: allowed,
    queryFn: async () => {
      const { count, error } = await supabase
        .schema("membership")
        .from("wallet_passes")
        .select("code", { count: "exact", head: true })
        .eq("state", "saved")
        .not("user_id", "is", null);
      unwrap({ data: null, error });
      return count ?? 0;
    },
    queryKey: ["admin", "member-insights", "wallet"],
  });

  if (grants.data && !allowed) {
    return (
      <AdminHeading title={t("title")}>{t("membersManageOnly")}</AdminHeading>
    );
  }
  if (insights.isPending) {
    return <SectionSpinner />;
  }
  if (insights.isError || !insights.data) {
    return <ErrorState onRetry={() => insights.refetch()} />;
  }
  const { data } = insights;
  const name = (facet: Facet, value: string) => {
    const key = labelKey[facet];
    return key ? td(`${key}.${value}` as "affiliations.student") : value;
  };

  return (
    <div className="grid gap-10">
      <AdminHeading
        actions={
          <Link className="text-sm underline underline-offset-4" href="/people">
            {tk("back")}
          </Link>
        }
        title={t("title")}
      >
        {t("lede")}
      </AdminHeading>
      <dl className="grid grid-cols-2 gap-6 border-line border-y py-6 sm:grid-cols-5">
        {(
          [
            ["members", data.members],
            ["answered", data.answered],
            ["counted", data.counted],
            ["volunteers", data.volunteers],
            ["inWallet", inWallet.data ?? 0],
          ] as const
        ).map(([key, value]) => (
          <div className="grid gap-1" key={key}>
            <dt className="type-label text-text-secondary">{t(key)}</dt>
            <dd className="font-light text-4xl tabular-nums">
              {formatNumber(value)}
            </dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-10 md:grid-cols-2">
        {FACETS.map((facet) => {
          const items = data.facets[facet] ?? [];
          const top = Math.max(1, ...items.map((i) => i.count ?? 0));
          return (
            <section className="grid content-start gap-3" key={facet}>
              <h2 className="type-heading">{t(`facets.${facet}`)}</h2>
              {items.length === 0 ? (
                <p className="type-body text-text-secondary">{t("none")}</p>
              ) : (
                <ul className="grid divide-y divide-line">
                  {items.map((item) => (
                    <li className="grid gap-1 py-2" key={item.value}>
                      <div className="flex items-baseline justify-between gap-4">
                        <span>{name(facet, item.value)}</span>
                        <span className="tabular-nums">
                          {item.count === null
                            ? t("fewerThanFive")
                            : formatNumber(item.count)}
                        </span>
                      </div>
                      <span
                        aria-hidden="true"
                        className="h-0.5 bg-text"
                        style={{ width: `${((item.count ?? 0) / top) * 100}%` }}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};
