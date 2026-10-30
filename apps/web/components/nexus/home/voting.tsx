"use client";

import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { localized, membership } from "@repo/sal-data";
import { useLocale, useTranslations } from "next-intl";
import { useActivity, useMemberStatus } from "@/lib/nexus/queries";
import { EmptyLine } from "../states";
import { Section } from "./section";

// One mark per activity a Voting Member needs.
const STEPS = Array.from(
  { length: membership.VOTING_ACTIVITIES },
  (_, i) => i + 1
);

export const VotingEligibility = () => {
  const t = useTranslations("nexus.home.voting");
  const ta = useTranslations("nexus.next");
  const locale = useLocale() as "en" | "ar";
  const status = useMemberStatus();
  const activity = useActivity();
  const count = status.data?.activities ?? 0;

  return (
    <Section description={t("rule")} id="voting" title={t("title")}>
      <div className="grid gap-2">
        <p className="type-body">
          {t("progress", { count: formatNumber(Math.min(count, 99)) })}
        </p>
        <div aria-hidden="true" className="grid grid-cols-2 gap-1">
          {STEPS.map((step) => (
            <span
              className={step <= count ? "h-1 bg-text" : "h-1 bg-line"}
              key={step}
            />
          ))}
        </div>
      </div>
      {status.data?.founding_voter && status.data.founding_until ? (
        <p className="type-body text-text-secondary">
          {t("founding", {
            date: formatLongDate(status.data.founding_until, locale),
          })}
        </p>
      ) : null}
      <details>
        <summary className="link type-caption cursor-pointer">
          {t("history")}
        </summary>
        {activity.data?.length ? (
          <table className="type-body mt-2 w-full text-start">
            <tbody>
              {activity.data.map((record) => (
                <tr className="border-line border-b" key={record.id}>
                  <td className="py-2 pe-4">
                    {formatLongDate(record.occurred_at, locale, true)}
                  </td>
                  <td className="py-2">
                    {record.event
                      ? localized(record.event, "title", locale)
                      : (record.note ?? "")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyLine
            action={{ href: "/membership/calendar", label: ta("browseEvents") }}
          >
            {t("noHistory")}
          </EmptyLine>
        )}
      </details>
    </Section>
  );
};
