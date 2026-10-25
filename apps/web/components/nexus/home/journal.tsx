"use client";

import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { localized } from "@repo/sal-data";
import { useLocale, useTranslations } from "next-intl";
import { useMySubmissions, useOpenCalls } from "@/lib/nexus/queries";
import { RowList } from "../page";
import { EmptyLine } from "../states";
import { Section } from "./section";

const DAY = 86_400_000;

export const JournalSection = () => {
  const t = useTranslations("nexus.home.journal");
  const ta = useTranslations("nexus.next");
  const tw = useTranslations("nexus.journal");
  const locale = useLocale() as "en" | "ar";
  const calls = useOpenCalls();
  const submissions = useMySubmissions();

  return (
    <Section id="journal" title={t("title")}>
      {calls.data?.length === 0 ? (
        <EmptyLine action={{ href: "/qirtas/write", label: ta("readJournal") }}>
          {t("none")}
        </EmptyLine>
      ) : null}
      {calls.data?.map((call) => {
        const days = Math.max(
          0,
          Math.ceil((new Date(call.closes_at).getTime() - Date.now()) / DAY)
        );
        return (
          <div className="grid gap-1" key={call.id}>
            <p className="type-body">
              {t("openCall", {
                call: localized(call, "title", locale),
                date: formatLongDate(call.closes_at, locale),
              })}
            </p>
            <p className="type-caption">
              {t("daysLeft", { days, daysText: formatNumber(days) })}
            </p>
            <Link
              className="link type-caption justify-self-start"
              href={{ pathname: "/qirtas/write", query: { call: call.id } }}
            >
              {t("submit")}
            </Link>
          </div>
        );
      })}
      {submissions.data?.length ? (
        <>
          <h3 className="type-label mt-2">{t("mine")}</h3>
          <RowList>
            {submissions.data.map((submission) => (
              <li className="flex justify-between gap-4" key={submission.id}>
                <Link
                  className="link"
                  href={{
                    pathname: "/qirtas/submission",
                    query: { id: submission.id },
                  }}
                >
                  {submission.title}
                </Link>
                <span className="type-caption">
                  {tw(`status.${submission.status}`)}
                </span>
              </li>
            ))}
          </RowList>
        </>
      ) : null}
    </Section>
  );
};
