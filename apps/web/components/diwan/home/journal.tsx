"use client";

import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { useLocale, useTranslations } from "next-intl";
import { journal, localized } from "@/lib/data";
import { useOpenCalls } from "@/lib/diwan/queries";
import { EmptyLine } from "../states";
import { Section } from "./section";

const DAY = 86_400_000;

export const JournalSection = () => {
  const t = useTranslations("diwan.home.journal");
  const locale = useLocale() as "en" | "ar";
  // Edition calls only: the standing call is always open.
  const open = useOpenCalls();
  const calls = { data: open.data?.filter((call) => call.issue_id) };

  return (
    <Section id="journal" title={t("title")}>
      {calls.data?.length === 0 ? (
        <EmptyLine action={{ href: "/qirtas/submit", label: t("submit") }}>
          {t("none")}
        </EmptyLine>
      ) : null}
      {calls.data?.map((call) => {
        const days = Math.max(
          0,
          Math.ceil((new Date(call.closes_at).getTime() - Date.now()) / DAY)
        );
        const title = localized(call, "title", locale);
        return (
          <div className="grid gap-1" key={call.id}>
            {journal.hasDeadline(call) ? (
              <>
                <p className="type-body">
                  {t("openCall", {
                    call: title,
                    date: formatLongDate(call.closes_at, locale),
                  })}
                </p>
                <p className="type-caption">
                  {t("daysLeft", { days, daysText: formatNumber(days) })}
                </p>
              </>
            ) : (
              <p className="type-body">
                {t("openCallNoDate", { call: title })}
              </p>
            )}
            <Link
              className="link type-caption justify-self-start"
              href="/qirtas/submit"
            >
              {t("submit")}
            </Link>
          </div>
        );
      })}
    </Section>
  );
};
