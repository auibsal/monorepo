import type { Locale } from "@repo/internationalization";
import { apiPath } from "@repo/internationalization";
import {
  formatIqd,
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { charity, localized } from "@repo/sal-data";
import { getTranslations } from "next-intl/server";
import { Section } from "@/components/section";
import { readPublished } from "@/lib/supabase";

const WAYS = ["books", "volunteer", "warm"] as const;

/**
 * Second Chapter's collection, on the program's own page (the overhaul,
 * Oct 30, 2026: the Give page folded into it, since the collection is the
 * only giving the Society does): the ways to give, the dates, what was
 * counted and handed over, and the receipts.
 */
export const SecondChapterGive = async ({ locale }: { locale: Locale }) => {
  const t = await getTranslations({ locale, namespace: "web.give" });
  const [campaigns, progress] = await Promise.all([
    readPublished(["charity"], (c) => charity.activeCampaigns(c), []),
    readPublished(["charity"], (c) => charity.campaignProgress(c), []),
  ]);
  const campaign = campaigns?.[0];
  const collected = campaign
    ? progress.find((p) => p.campaign_id === campaign.id)
    : undefined;
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
      </Section>

      <Section id="dates" title={t("datesTitle")}>
        <p className="type-body max-w-[60ch]">{t("dates")}</p>
      </Section>

      <Section id="collection" title={t("collectionTitle")}>
        {campaign && collected ? (
          <div className="grid gap-3">
            <h3 className="type-subheading">
              {localized(campaign, "title", locale)}
            </h3>
            <p className="type-body font-medium">
              {t("counted", {
                amount: formatIqd(collected.counted_iqd, locale),
              })}
              {collected.pending_iqd > 0
                ? ` · ${t("pending", { amount: formatIqd(collected.pending_iqd, locale) })}`
                : ""}
            </p>
            <p className="type-body">
              {campaign.handed_over_on && campaign.handed_over_iqd !== null
                ? t("handedOver", {
                    amount: formatIqd(campaign.handed_over_iqd, locale),
                    date: formatLongDate(campaign.handed_over_on, locale),
                  })
                : t("handoverAhead")}
            </p>
            <p className="type-caption">{t("countedNote")}</p>
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
