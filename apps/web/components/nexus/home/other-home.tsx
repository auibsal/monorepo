"use client";

import { useAuth } from "@repo/auth/provider";
import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { localized, unwrap } from "@repo/sal-data";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useGuestOf, useMyPartners } from "@/lib/nexus/partners";
import { useMyMembership } from "@/lib/nexus/queries";
import { DiwanSection, RowList } from "../page";
import { ErrorState, SectionSpinner } from "../states";

interface Application extends Record<string, unknown> {
  name_ar: string | null;
  name_en: string;
  partner_status: string;
}

/** The organization this person applied for, while it waits. */
const useWaitingApplication = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () => {
      const row = ((unwrap(
        await supabase.schema("governance").rpc("my_partner_application")
      ) ?? [])[0] ?? null) as Application | null;
      return row?.partner_status === "prospect" ? row : null;
    },
    queryKey: ["partner-application", "waiting", user?.id ?? ""],
  });
};

/** Whether the Society itself welcomed this person as its guest. */
const useSocietyGuest = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      (
        unwrap(
          await supabase
            .schema("membership")
            .from("guests")
            .select("ended_at")
            .eq("user_id", user?.id ?? "")
        ) ?? []
      ).some((g) => !g.ended_at || new Date(g.ended_at) > new Date()),
    queryKey: ["membership", "society-guest", user?.id ?? ""],
  });
};

/**
 * Today, for a guest or a partner's person (owner, Oct 31, 2026: one
 * Membership for everyone): whose they are, and what they can do. Members
 * have the full Today instead.
 */
export const OtherHome = () => {
  const t = useTranslations("nexus.accountHome");
  const locale = useLocale() as Locale;
  const mine = useMyMembership();
  const societyGuest = useSocietyGuest();
  const guestOf = useGuestOf();
  const teams = useMyPartners();
  const application = useWaitingApplication();

  const queries = [mine, societyGuest, guestOf, teams, application];
  if (queries.some((q) => q.isPending)) {
    return <SectionSpinner />;
  }
  if (queries.some((q) => q.isError)) {
    return (
      <ErrorState
        onRetry={() => Promise.all(queries.map((q) => q.refetch()))}
      />
    );
  }
  const kind = mine.data?.kind ?? null;
  const verified = (guestOf.data ?? []).filter((g) => g.status === "verified");
  const pending = (guestOf.data ?? []).filter((g) => g.status === "pending");
  const nothing =
    !(societyGuest.data || application.data) &&
    (guestOf.data ?? []).length === 0 &&
    (teams.data ?? []).length === 0;

  return (
    <div className="grid gap-x-16 gap-y-14 lg:grid-cols-2">
      <DiwanSection id="yours" title={t("partners")}>
        <RowList>
          {(teams.data ?? []).map((partner) => (
            <li className="grid gap-1" key={partner.id}>
              <Link className="link font-medium" href="/partners/dashboard">
                {t("team", { name: localized(partner, "name", locale) })}
              </Link>
              <p className="type-caption">{t("teamLine")}</p>
            </li>
          ))}
          {societyGuest.data ? (
            <li className="grid gap-1">
              <p className="font-medium">{t("societyGuest")}</p>
              <p className="type-caption">{t("societyGuestLine")}</p>
            </li>
          ) : null}
          {verified.map((guest) => (
            <li className="grid gap-1" key={`guest-${guest.name_en}`}>
              <p className="font-medium">
                {t("guest", { name: localized(guest, "name", locale) })}
              </p>
              <p className="type-caption">{t("guestLine")}</p>
            </li>
          ))}
          {pending.map((guest) => (
            <li className="grid gap-1" key={`pending-${guest.name_en}`}>
              <p className="font-medium">
                {t("pending", { name: localized(guest, "name", locale) })}
              </p>
              <p className="type-caption">{t("pendingLine")}</p>
            </li>
          ))}
          {application.data ? (
            <li className="grid gap-1">
              <Link className="link font-medium" href="/partners/join">
                {t("applied", {
                  name: localized(application.data, "name", locale),
                })}
              </Link>
              <p className="type-caption">{t("appliedLine")}</p>
            </li>
          ) : null}
          {nothing ? (
            <li className="grid gap-1">
              <p className="type-body">{t("nothing")}</p>
              <Link className="link justify-self-start" href="/partners">
                {t("aboutPartners")}
              </Link>
            </li>
          ) : null}
        </RowList>
      </DiwanSection>
      <DiwanSection id="do" title={t("do")}>
        <RowList>
          {kind === "guest" ? (
            <>
              <li className="grid gap-1">
                <Link className="link font-medium" href="/membership/calendar">
                  {t("book")}
                </Link>
                <p className="type-caption">{t("bookLine")}</p>
              </li>
              <li className="grid gap-1">
                <Link className="link font-medium" href="/qirtas/write">
                  {t("write")}
                </Link>
                <p className="type-caption">{t("writeLine")}</p>
              </li>
            </>
          ) : null}
          {kind ? (
            <li className="grid gap-1">
              <Link className="link font-medium" href="/membership/record">
                {t("record")}
              </Link>
              <p className="type-caption">{t("recordLine")}</p>
            </li>
          ) : null}
          {kind === "guest" ? null : (
            <li className="grid gap-1">
              <Link className="link font-medium" href="/get-involved">
                {t("involved")}
              </Link>
              <p className="type-caption">{t("involvedLine")}</p>
            </li>
          )}
        </RowList>
      </DiwanSection>
    </div>
  );
};
