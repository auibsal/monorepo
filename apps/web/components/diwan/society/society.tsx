"use client";

import { localizedPath } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { type governance, localized, unwrap } from "@/lib/data";
import { RowList } from "../page";
import { EmptyLine, ErrorState, SectionSpinner } from "../states";
import { SocietySection } from "./section";

type Lang = "en" | "ar";

const Minutes = () => {
  const t = useTranslations("diwan.society.minutes");
  const tb = useTranslations("diwan.admin.governance.bodies");
  const ta = useTranslations("diwan.next");
  const locale = useLocale() as Lang;
  const { supabase } = useAuth();
  const minutes = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("minutes")
          .select(
            "id, body, meeting_on, adopted_on, title_en, title_ar, text_en, text_ar"
          )
          .eq("status", "approved")
          .order("meeting_on", { ascending: false })
          .limit(30)
      ) ?? [],
    queryKey: ["adopted-minutes"],
  });

  return (
    <SocietySection id="minutes" lede={t("lede")} title={t("title")}>
      {minutes.isPending ? <SectionSpinner /> : null}
      {minutes.isError ? (
        <ErrorState onRetry={() => minutes.refetch()} />
      ) : null}
      {minutes.data?.length === 0 ? (
        <EmptyLine
          action={{
            href: `${localizedPath(locale, "/library")}`,
            label: ta("readDocuments"),
          }}
        >
          {t("empty")}
        </EmptyLine>
      ) : null}
      <RowList>
        {minutes.data?.map((entry) => (
          <li key={entry.id}>
            <details>
              <summary className="cursor-pointer">
                <span className="type-subheading">
                  {localized(entry, "title", locale)}
                </span>{" "}
                <span className="type-caption">
                  {tb(entry.body as governance.MeetingBody)} ·{" "}
                  {formatLongDate(entry.meeting_on, locale)}
                </span>
              </summary>
              <div className="type-body mt-3 whitespace-pre-line">
                {localized(entry, "text", locale)}
              </div>
              {entry.adopted_on ? (
                <p className="type-caption mt-2">
                  {t("adoptedOn", {
                    date: formatLongDate(entry.adopted_on, locale),
                  })}
                </p>
              ) : null}
            </details>
          </li>
        ))}
      </RowList>
    </SocietySection>
  );
};

/**
 * Adopted resolutions, beside the minutes (decisions.md, Governance): open
 * to members by number, title and date; those about partners and documents
 * are public too, on the Council's page.
 */
const Resolutions = () => {
  const t = useTranslations("diwan.society.resolutions");
  const locale = useLocale() as Lang;
  const { supabase } = useAuth();
  const resolutions = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("resolutions")
          .select("id, code, title_en, title_ar, adopted_on")
          .eq("status", "adopted")
          .order("adopted_on", { ascending: false })
          .limit(100)
      ) ?? [],
    queryKey: ["adopted-resolutions"],
  });

  return (
    <SocietySection id="resolutions" lede={t("lede")} title={t("title")}>
      {resolutions.isPending ? <SectionSpinner /> : null}
      {resolutions.isError ? (
        <ErrorState onRetry={() => resolutions.refetch()} />
      ) : null}
      {resolutions.data?.length === 0 ? (
        <p className="type-body text-text-secondary">{t("empty")}</p>
      ) : null}
      <RowList>
        {resolutions.data?.map((r) => (
          <li className="flex flex-wrap items-baseline gap-x-4" key={r.id}>
            <span className="type-code">{r.code}</span>
            <span className="type-subheading">
              {localized(r, "title", locale)}
            </span>
            {r.adopted_on ? (
              <span className="type-caption">
                {formatLongDate(r.adopted_on, locale)}
              </span>
            ) : null}
          </li>
        ))}
      </RowList>
    </SocietySection>
  );
};

/**
 * The Society's minutes and resolutions, for members (decisions.md,
 * Governance), in Your account → Documents.
 */
export const SocietyRecords = () => (
  <>
    <Minutes />
    <Resolutions />
  </>
);
