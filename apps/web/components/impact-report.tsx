import type { Locale } from "@repo/internationalization";
import { apiPath } from "@repo/internationalization";
import {
  formatIqd,
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { charity, localized } from "@repo/sal-data";
import { getTranslations } from "next-intl/server";
import { PageHeader, Section } from "@/components/section";
import { readPublished } from "@/lib/supabase";

/** An event's campaign with its report, once a figure is published. */
export const loadReport = async (eventId: string) => {
  const campaign = await readPublished<Awaited<
    ReturnType<typeof charity.campaignForEvent>
  > | null>(["charity"], (c) => charity.campaignForEvent(c, eventId), null);
  if (!campaign) {
    return null;
  }
  const [impact, progress, receipts] = await Promise.all([
    readPublished(
      ["charity"],
      (c) => charity.impactMetrics(c, campaign.id),
      []
    ),
    readPublished(
      ["charity"],
      (c) => charity.campaignProgress(c, campaign.id),
      []
    ),
    readPublished(
      ["charity"],
      (c) => charity.publicReceipts(c, campaign.id),
      []
    ),
  ]);
  if (impact.length === 0) {
    return null;
  }
  return {
    campaign,
    counted: progress.find((p) => p.campaign_id === campaign.id),
    impact,
    receipts,
  };
};

/**
 * The book fair's impact report (design review A26), at its event's
 * address, /events/<event>/impact (owner, Nov 5, 2026: the campaign
 * belongs to an ordinary event): the published figures with their words,
 * the witnessed handover, the signed-off total and the public receipts.
 * Only what the campaign's record holds, signed off; nothing is typed here.
 */
export const ImpactReport = async ({
  eventSlug,
  locale,
  report,
}: {
  readonly eventSlug: string;
  readonly locale: Locale;
  readonly report: NonNullable<Awaited<ReturnType<typeof loadReport>>>;
}) => {
  const t = await getTranslations({ locale, namespace: "web.give" });
  const { campaign, counted, impact, receipts } = report;

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-16 px-4 py-16">
      <PageHeader
        lede={t("report.lede")}
        title={localized(campaign, "title", locale)}
      >
        <p className="type-caption">
          <Link className="link" href={`/events/${eventSlug}`}>
            {t("report.back")}
          </Link>
        </p>
      </PageHeader>

      <Section id="impact" title={t("report.title")}>
        <dl className="grid gap-x-10 sm:grid-cols-2">
          {impact.map((m) => (
            <div
              className="grid gap-2 border-line border-t py-space-4"
              key={m.id}
            >
              <dt className="type-caption">{localized(m, "label", locale)}</dt>
              <dd className="grid gap-2">
                <span className="type-display">
                  {formatNumber(Number(m.value), locale)}{" "}
                  <span className="type-heading">
                    {localized(m, "unit", locale)}
                  </span>
                </span>
                {localized(m, "report", locale) ? (
                  <span className="type-body">
                    {localized(m, "report", locale)}
                  </span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="handover" title={t("stages.handover")}>
        {campaign.handed_over_on && campaign.handed_over_iqd !== null ? (
          <p className="type-body">
            {t("handedOver", {
              amount: formatIqd(campaign.handed_over_iqd, locale),
              date: formatLongDate(campaign.handed_over_on, locale),
            })}
          </p>
        ) : (
          <p className="type-body text-text-secondary">{t("handoverAhead")}</p>
        )}
        {counted && counted.counted_iqd > 0 ? (
          <div className="grid gap-1">
            <p className="type-body font-medium">
              {t("counted", { amount: formatIqd(counted.counted_iqd, locale) })}
            </p>
            <p className="type-caption">{t("countedNote")}</p>
          </div>
        ) : null}
      </Section>

      {receipts.length > 0 ? (
        <Section id="receipts" title={t("receiptsTitle")}>
          <ul className="grid">
            {receipts.map((r) => (
              <li
                className="flex flex-wrap items-baseline justify-between gap-3 border-line border-t py-3"
                key={r.id}
              >
                <span>{localized(r, "description", locale)}</span>
                <a
                  className="link type-caption"
                  href={apiPath(`/files/receipt?id=${r.id}`)}
                  rel="noopener"
                  target="_blank"
                >
                  {t("openReceipt")}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
};
