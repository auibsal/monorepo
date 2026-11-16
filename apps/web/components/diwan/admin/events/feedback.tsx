"use client";

import { formatNumber } from "@repo/internationalization/format";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { events } from "@/lib/data";
import { DiwanSection } from "../../page";
import { SectionSpinner } from "../../states";

/**
 * "How was it?" for the event's team (decisions.md, Events): how many
 * answered, the average from 1 ("Not for me") to 5 ("Loved it"), each
 * choice's count and the comments, never who wrote them
 * (events.feedback_summary). The debrief links here.
 */
export const EventFeedbackAdmin = ({
  eventId,
}: {
  readonly eventId: string;
}) => {
  const t = useTranslations("diwan.admin.event.feedback");
  const tr = useTranslations("web.events.feedback.ratings");
  const { supabase } = useAuth();
  const summary = useQuery({
    queryFn: () => events.feedbackSummary(supabase, eventId),
    queryKey: ["admin", "event-feedback", eventId],
  });
  return (
    <DiwanSection id="how-was-it" title={t("title")}>
      {summary.isPending ? <SectionSpinner /> : null}
      {summary.data && summary.data.count > 0 ? (
        <div className="grid gap-4">
          <p className="type-body">
            {t("summary", {
              average: summary.data.average?.toFixed(1) ?? "",
              count: formatNumber(summary.data.count),
            })}
          </p>
          <ul className="type-caption grid gap-1">
            {events.RATINGS.map((r) => (
              <li key={r}>
                {tr(String(r) as "1")}:{" "}
                {formatNumber(summary.data?.ratings[String(r)] ?? 0)}
              </li>
            ))}
          </ul>
          {summary.data.comments.length > 0 ? (
            <ul className="divide-line border-line grid divide-y border-y">
              {summary.data.comments.map((c) => (
                <li
                  className="type-body py-2"
                  dir="auto"
                  key={`${c.rating}:${c.comment}`}
                >
                  {c.comment}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {summary.data && summary.data.count === 0 ? (
        <p className="type-body text-text-secondary">{t("none")}</p>
      ) : null}
    </DiwanSection>
  );
};
