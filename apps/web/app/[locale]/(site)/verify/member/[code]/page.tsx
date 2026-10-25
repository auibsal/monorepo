import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { localized, membership } from "@repo/sal-data";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/section";
import { localizedMetadata } from "@/lib/metadata";
import { readLive } from "@/lib/supabase";

interface CardParams {
  readonly params: Promise<{ code: string; locale: Locale }>;
  readonly searchParams: Promise<{ t?: string | string[] }>;
}

export const generateMetadata = async ({
  params,
}: CardParams): Promise<Metadata> => {
  const { code, locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.verifyCard" });
  return {
    ...localizedMetadata(locale, membership.cardPath(code), {
      description: t("lede"),
      title: t("title"),
    }),
    robots: { follow: false, index: false },
  };
};

/**
 * Where a membership card's QR leads: whose card it is, whether the
 * membership stands today, and whether this is the live card (the code in
 * the link changes every 30 seconds; a screenshot carries a stale one).
 * Read live, never cached, so a reset code or an ended membership shows at
 * once. Partners check perks here too.
 */
const MemberCardPage = async ({ params, searchParams }: CardParams) => {
  const { code, locale } = await params;
  const { t: digits } = await searchParams;
  const live =
    typeof digits === "string" && membership.LIVE_DIGITS.test(digits)
      ? digits
      : undefined;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.verifyCard" });
  const tt = await getTranslations({ locale, namespace: "nexus.home.tiers" });
  const card = membership.CARD_CODE.test(code)
    ? await readLive((c) => membership.verifyCard(c, code, live), null)
    : null;

  if (!card) {
    return (
      <div className="mx-auto grid w-full max-w-xl gap-6 px-4 py-16">
        <PageHeader lede={t("notFound")} title={t("title")} />
        <Link className="link" href="/join">
          {t("join")}
        </Link>
      </div>
    );
  }

  // The name may be in either script; everything else is in the page's.
  const rows: [string, string, "auto" | undefined][] = [
    [t("holder"), localized(card, "full_name", locale), "auto"],
    [t("number"), String(card.number).padStart(4, "0"), undefined],
  ];
  if (card.tier) {
    rows.push([t("tier"), tt(card.tier), undefined]);
  }
  if (card.member_since) {
    rows.push([
      t("since"),
      formatLongDate(card.member_since, locale, true),
      undefined,
    ]);
  }
  if (card.active) {
    rows.push([t("vote"), card.voting ? t("votes") : t("noVote"), undefined]);
  }

  return (
    <div className="mx-auto grid w-full max-w-xl gap-8 px-4 py-16">
      <PageHeader lede={t("lede")} title={t("title")} />
      <div className="grid gap-2" role="status">
        <p className="type-heading">{card.active ? t("valid") : t("lapsed")}</p>
        <p className="type-body">{card.live ? t("live") : t("notLive")}</p>
        {card.active && card.live ? (
          <p className="type-body text-text-secondary">{t("perks")}</p>
        ) : null}
      </div>
      <dl className="grid gap-3 border-line border-t pt-5">
        {rows.map(([label, value, dir]) => (
          <div className="grid gap-1 sm:grid-cols-[10rem_1fr]" key={label}>
            <dt className="type-label">{label}</dt>
            <dd className="type-body" dir={dir}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="type-caption">{t("note")}</p>
    </div>
  );
};

export default MemberCardPage;
