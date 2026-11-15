"use client";

import { OrganizationLogo } from "@repo/brand/components/sal/acknowledgment";
import { Button } from "@repo/brand/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { localized, unwrap } from "@/lib/data";
import { useRouter } from "@/lib/diwan/navigation";
import { acknowledged, type Organization } from "@/lib/institutions";
import { DiwanSection, RowList } from "../../page";
import { SectionSpinner } from "../../states";
import { ErrorLine } from "../kit";

const KEY = ["admin", "partners"];

/** Whether an entry is the partner's own (it applied, or has a Lead). */
export const usePartnerOwned = (partnerId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .rpc("partner_owned", { partner: partnerId })
      ) === true,
    queryKey: [...KEY, "owned", partnerId],
  });
};

/**
 * An entry's logo as the public sees it (decisions.md, The site): the
 * uploaded one or AUIB's standard set, at the one height; a missing logo
 * is marked.
 */
export const RegisterLogo = ({
  org,
}: {
  readonly org: Organization & { readonly name_en: string };
}) => {
  const t = useTranslations("diwan.admin.partners.register");
  const locale = useLocale();
  const entry = acknowledged(org, locale);
  return entry.logo ? (
    <OrganizationLogo
      alt={entry.showsName ? entry.name : ""}
      logo={entry.logo}
    />
  ) : (
    <span className="type-caption">{t("noLogo")}</span>
  );
};

/**
 * The partner's people (decisions.md, Partners): the applicant and the
 * team, from their accounts; never typed, never edited by the Society.
 */
export const PartnerPeople = ({
  partnerId,
}: {
  readonly partnerId: string;
}) => {
  const t = useTranslations("diwan.admin.partners.register");
  const locale = useLocale();
  const { supabase } = useAuth();
  const people = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .rpc("partner_people", { partner: partnerId })
      ) ?? [],
    queryKey: [...KEY, "people", partnerId],
  });
  if (people.isPending) {
    return <SectionSpinner />;
  }
  return (
    <DiwanSection description={t("peopleLede")} id="people" title={t("people")}>
      {(people.data ?? []).length === 0 ? (
        <p className="type-body">{t("noPeople")}</p>
      ) : (
        <RowList>
          {(people.data ?? []).map((person) => (
            <li
              className="flex flex-wrap items-baseline gap-x-4"
              key={person.user_id}
            >
              <span className="type-body">
                {(locale === "ar"
                  ? person.full_name_ar
                  : person.full_name_en) || person.full_name_en}
              </span>
              <span className="type-caption">
                {t(
                  `peopleRoles.${person.role as "applicant" | "partner_lead" | "partner_rep"}`
                )}
              </span>
              <bdi className="type-caption break-all">{person.email}</bdi>
            </li>
          ))}
        </RowList>
      )}
    </DiwanSection>
  );
};

/**
 * A change the partner made to its listing, waiting for the Director of
 * Partnerships (decisions.md, Partners): before and after, side by side.
 */
export const PendingListing = ({
  current,
  partnerId,
}: {
  readonly current: {
    readonly description_ar: string | null;
    readonly description_en: string | null;
    readonly url: string | null;
  };
  readonly partnerId: string;
}) => {
  const t = useTranslations("diwan.admin.partners.register.pendingListing");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const change = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("partner_listing_changes")
          .select("id, description_en, description_ar, url, proposed_at")
          .eq("partner_id", partnerId)
          .eq("status", "pending")
          .maybeSingle()
      ),
    queryKey: [...KEY, "listing-change", partnerId],
  });
  const decide = useMutation({
    mutationFn: async ({ approve, id }: { approve: boolean; id: string }) =>
      unwrap(
        await supabase
          .schema("governance")
          .rpc("decide_partner_listing", { approve, change: id })
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
  const pending = change.data;
  if (!pending) {
    return null;
  }
  const rows: [string, string, string][] = [
    [
      t("description"),
      localized(current, "description", locale) || "—",
      localized(pending, "description", locale) || "—",
    ],
    [t("url"), current.url ?? "—", pending.url ?? "—"],
  ];
  return (
    <DiwanSection
      description={t("lede", {
        date: formatLongDate(pending.proposed_at, locale, true),
      })}
      id="pending-listing"
      title={t("title")}
    >
      <div className="flex flex-wrap items-center gap-4">
        <Button
          disabled={decide.isPending}
          onClick={() => decide.mutate({ approve: true, id: pending.id })}
          size="sm"
          variant="outline"
        >
          {t("approve")}
        </Button>
        <button
          className="link"
          disabled={decide.isPending}
          onClick={() => decide.mutate({ approve: false, id: pending.id })}
          type="button"
        >
          {t("decline")}
        </button>
      </div>
      <table className="w-full text-start">
        <thead>
          <tr>
            <th className="type-label py-2 text-start" scope="col">
              <span className="sr-only">{t("field")}</span>
            </th>
            <th className="type-label py-2 text-start" scope="col">
              {t("before")}
            </th>
            <th className="type-label py-2 text-start" scope="col">
              {t("after")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([field, before, after]) => (
            <tr className="border-line border-t align-top" key={field}>
              <th className="type-label py-2 pe-4 text-start" scope="row">
                {field}
              </th>
              <td className="type-body py-2 pe-4 break-words whitespace-pre-line">
                {before}
              </td>
              <td className="type-body py-2 break-words whitespace-pre-line">
                {after}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ErrorLine error={decide.error} />
    </DiwanSection>
  );
};

/**
 * Linking (decisions.md, Partners): an organization applies and the
 * register seems to have it already. "Same organization as…" joins the
 * application to that entry, which keeps its history and events and
 * becomes the partner's; "New entry" keeps them apart.
 */
export const PartnerLinking = ({
  partnerId,
}: {
  readonly partnerId: string;
}) => {
  const t = useTranslations("diwan.admin.partners.register.linking");
  const locale = useLocale();
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const matches = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .rpc("partner_matches", { partner: partnerId })
      ) ?? [],
    queryKey: [...KEY, "matches", partnerId],
  });
  const link = useMutation({
    mutationFn: async (existing: string) =>
      unwrap(
        await supabase
          .schema("governance")
          .rpc("link_partner", { application: partnerId, existing })
      ),
    onSuccess: async (slug) => {
      await queryClient.invalidateQueries({ queryKey: KEY });
      router.push(`/partnerships/${slug}`);
    },
  });
  const keep = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .rpc("keep_partner_entry", { application: partnerId })
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
  if (!matches.data?.length) {
    return null;
  }
  return (
    <DiwanSection description={t("lede")} id="linking" title={t("title")}>
      <RowList>
        {matches.data.map((match) => (
          <li
            className="flex flex-wrap items-center justify-between gap-3"
            key={match.id}
          >
            <span className="grid">
              <span className="type-body">
                {localized(match, "name", locale)}
              </span>
              <span className="type-caption">
                {match.by_domain ? t("byDomain") : t("byName")}
              </span>
            </span>
            <Button
              disabled={link.isPending}
              onClick={() => link.mutate(match.id)}
              size="sm"
              variant="outline"
            >
              {t("same", { name: localized(match, "name", locale) })}
            </Button>
          </li>
        ))}
      </RowList>
      <button
        className="link justify-self-start"
        disabled={keep.isPending}
        onClick={() => keep.mutate()}
        type="button"
      >
        {t("newEntry")}
      </button>
      <ErrorLine error={link.error ?? keep.error} />
    </DiwanSection>
  );
};
