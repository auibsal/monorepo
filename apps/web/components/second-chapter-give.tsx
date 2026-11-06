import type { Locale } from "@repo/internationalization";
import { apiPath } from "@repo/internationalization";
import {
  formatIqd,
  formatLongDate,
  formatNumber,
  toZonedDateValue,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { charity, localized } from "@repo/sal-data";
import { getTranslations } from "next-intl/server";
import { CatalogLink } from "@/components/second-chapter-catalog";
import { Section } from "@/components/section";
import { readPublished } from "@/lib/supabase";

const WAYS = ["books", "volunteer", "warm"] as const;

/**
 * The book fair's collection, on its event's page (the overhaul, Oct 30,
 * 2026: the Give page folded into it, since the collection is the only
 * giving the Society does; owner, Nov 5, 2026: the campaign belongs to an
 * ordinary event): the ways to give, the dates, what was counted and
 * handed over, and the receipts. The dates are the campaign's stages,
 * read from its record, and only signed-off figures show.
 */
export const SecondChapterGive = async ({
  campaign,
  eventSlug,
  locale,
}: {
  campaign: Campaign;
  eventSlug: string;
  locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.give" });
  const progress = await readPublished(
    ["charity"],
    (c) => charity.campaignProgress(c, campaign.id),
    []
  );
  const collected = progress.find((p) => p.campaign_id === campaign.id);
  const [receipts, impact] = campaign
    ? await Promise.all([
        readPublished(
          ["charity"],
          (c) => charity.publicReceipts(c, campaign.id),
          []
        ),
        readPublished(
          ["charity"],
          (c) => charity.impactMetrics(c, campaign.id),
          []
        ),
      ])
    : [[], []];
  const points = charity.dropOffPoints(campaign?.drop_off_points);

  return (
    <div className="grid gap-20">
      <Section id="ways" title={t("waysTitle")}>
        <ul className="grid gap-4 sm:grid-cols-3">
          {WAYS.map((way) => (
            <li className="border-line border-t py-space-4" key={way}>
              <h3 className="type-subheading">{t(`ways.${way}`)}</h3>
            </li>
          ))}
        </ul>
        <p className="type-body">{t("waysNote")}</p>
        <CatalogLink
          campaign={campaign}
          eventSlug={eventSlug}
          locale={locale}
        />
      </Section>

      {points.length > 0 ? (
        <Section id="drop-off" title={t("dropOffTitle")}>
          <ul className="grid gap-x-10 sm:grid-cols-2">
            {points.map((p) => (
              <li
                className="grid gap-1 border-line border-t py-space-4"
                key={`${p.place_en}-${p.place_ar}`}
              >
                <span className="type-subheading">
                  {locale === "ar" ? p.place_ar : p.place_en}
                </span>
                {(locale === "ar" ? p.hours_ar : p.hours_en) ? (
                  <span className="type-caption text-text-secondary">
                    {locale === "ar" ? p.hours_ar : p.hours_en}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section id="collection" title={t("collectionTitle")}>
        {campaign ? (
          <div className="grid gap-6">
            <h3 className="type-subheading">
              {localized(campaign, "title", locale)}
            </h3>
            <StageList
              campaign={campaign}
              impactPublished={impact.length > 0}
              locale={locale}
            />
            {collected && collected.counted_iqd > 0 ? (
              <div className="grid gap-1">
                <p className="type-body font-medium">
                  {t("counted", {
                    amount: formatIqd(collected.counted_iqd, locale),
                  })}
                </p>
                <p className="type-caption">{t("countedNote")}</p>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="type-body text-text-secondary">{t("noCampaign")}</p>
        )}
      </Section>

      <Section id="transparency" title={t("transparencyTitle")}>
        <p className="type-lede">{t("transparencyLede")}</p>
        <blockquote className="grid gap-1 border-accent border-s-2 ps-4">
          <p className="type-body">{t("policy")}</p>
          <footer className="type-caption">{t("policySource")}</footer>
        </blockquote>
        {impact.length > 0 ? (
          <div className="grid gap-3">
            <h3 className="type-subheading">{t("impactTitle")}</h3>
            <dl className="grid gap-4 sm:grid-cols-3">
              {impact.map((m) => (
                <div className="border-line border-t py-space-4" key={m.id}>
                  <dt className="type-caption">
                    {localized(m, "label", locale)}
                  </dt>
                  <dd className="type-heading">
                    {formatNumber(Number(m.value), locale)}{" "}
                    {localized(m, "unit", locale)}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="type-body">
              <Link className="link" href={`/events/${eventSlug}/impact`}>
                {t("report.open")}
              </Link>
            </p>
          </div>
        ) : null}
        <div className="grid gap-3">
          <h3 className="type-subheading">{t("receiptsTitle")}</h3>
          {receipts.length === 0 ? (
            <p className="type-body text-text-secondary">{t("noReceipts")}</p>
          ) : (
            <ul className="grid gap-2">
              {receipts.map((r) => (
                <li
                  className="flex flex-wrap items-baseline justify-between gap-3 border-line border-b pb-2"
                  key={r.id}
                >
                  <span>{localized(r, "description", locale)}</span>
                  <span className="flex items-baseline gap-3">
                    {r.amount_iqd ? (
                      <span className="type-caption">
                        {formatIqd(r.amount_iqd, locale)}
                      </span>
                    ) : null}
                    <a
                      className="text-sm underline underline-offset-4"
                      href={apiPath(`/files/receipt?id=${r.id}`)}
                      rel="noopener"
                      target="_blank"
                    >
                      {t("openReceipt")}
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>
    </div>
  );
};

type Campaign = NonNullable<
  Awaited<ReturnType<typeof charity.campaignForEvent>>
>;

/**
 * The collection's five stages as a plain list, the current one marked by
 * an ink hairline and `aria-current` (owner, Nov 4, 2026).
 */
const StageList = async ({
  campaign,
  impactPublished,
  locale,
}: {
  campaign: Campaign;
  impactPublished: boolean;
  locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.give" });
  const stages = charity.campaignStages(
    campaign,
    toZonedDateValue(new Date()),
    impactPublished
  );
  const current = stages.find((s) => s.state === "now");
  const when = (stage: charity.Stage) => {
    if (!stage.from) {
      return null;
    }
    if (stage.to && stage.to !== stage.from) {
      return t("range", {
        from: formatLongDate(stage.from, locale),
        to: formatLongDate(stage.to, locale),
      });
    }
    return formatLongDate(stage.from, locale);
  };
  const handover =
    campaign.handed_over_on && campaign.handed_over_iqd !== null
      ? t("handedOver", {
          amount: formatIqd(campaign.handed_over_iqd, locale),
          date: formatLongDate(campaign.handed_over_on, locale),
        })
      : t("handoverAhead");
  return (
    <ol className="grid gap-x-8 sm:grid-cols-5">
      {stages.map((stage) => {
        const isCurrent = stage === current;
        // A recorded handover says its own day.
        const date =
          stage.key === "handover" && campaign.handed_over_on
            ? null
            : when(stage);
        return (
          <li
            aria-current={isCurrent ? "step" : undefined}
            className={
              isCurrent
                ? "grid content-start gap-1 border-text border-t py-space-4"
                : "grid content-start gap-1 border-line border-t py-space-4"
            }
            key={stage.key}
          >
            <span className="type-label text-text-secondary">
              {t(`states.${stage.state}`)}
            </span>
            <span className="type-subheading">{t(`stages.${stage.key}`)}</span>
            {stage.key === "handover" ? (
              <span className="type-caption">{handover}</span>
            ) : null}
            {date ? (
              <span className="type-caption text-text-secondary">{date}</span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
};
