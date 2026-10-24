"use client";

import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { localized } from "@repo/sal-data";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/nexus/navigation";
import { useMySubmissions, useOpenCalls } from "@/lib/nexus/queries";
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
        <EmptyLine action={{ href: "/qirtas", label: ta("readJournal") }}>
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
              className="text-sm underline underline-offset-4"
              href={{ pathname: "/qirtas/submit", query: { call: call.id } }}
            >
              {t("submit")}
            </Link>
          </div>
        );
      })}
      {submissions.data?.length ? (
        <>
          <h3 className="type-caption type-kicker">{t("mine")}</h3>
          <ul className="grid gap-2">
            {submissions.data.map((submission) => (
              <li
                className="flex justify-between gap-4 border-line border-b pb-2"
                key={submission.id}
              >
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
          </ul>
        </>
      ) : null}
    </Section>
  );
};
