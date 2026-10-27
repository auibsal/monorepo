import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { localized, membership } from "@repo/sal-data";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Guilloche } from "@/components/guilloche";
import { PageHeader } from "@/components/section";
import { localizedMetadata } from "@/lib/metadata";
import { passEnabled } from "@/lib/nexus/pass-enabled";
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
 * once. Partners check perks here too. Once the IDEA Pass is the card
 * (owner, 2026-10-27), SAL's own cards are retired and this says so.
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
  if (passEnabled) {
    return (
      <div className="mx-auto grid w-full max-w-xl gap-6 px-4 py-16">
        <PageHeader lede={t("retired")} title={t("title")} />
      </div>
    );
  }
  const tt = await getTranslations({ locale, namespace: "nexus.home.tiers" });
  const valid = membership.CARD_CODE.test(code);
  const [card, record] = valid
    ? await Promise.all([
        readLive((c) => membership.verifyCard(c, code, live), null),
        readLive((c) => membership.cardRecord(c, code), []),
      ])
    : [null, []];
  const tc = await getTranslations({ locale, namespace: "web.verify" });

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
      <figure className="grid justify-items-start gap-2">
        <Guilloche
          className="size-48"
          number={card.number}
          stroke="stroke-text"
        />
        <figcaption className="type-caption">{t("pattern")}</figcaption>
      </figure>
      {record.length > 0 ? (
        <section aria-labelledby="record" className="grid gap-3">
          <h2 className="type-heading" id="record">
            {t("record")}
          </h2>
          <ul className="grid divide-y divide-line border-line border-y">
            {record.map((item) => (
              <li className="grid gap-1 py-3" key={item.verification_code}>
                <Link
                  className="link font-medium"
                  href={`/verify/${item.verification_code}`}
                >
                  {tc(`kinds.${item.kind as "service"}`)}
                </Link>
                <p className="type-caption">
                  {[
                    localized(item, "role", locale),
                    item.issued_at
                      ? formatLongDate(item.issued_at, locale, true)
                      : "",
                    item.status === "revoked" ? tc("revokedShort") : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="type-caption">{t("note")}</p>
    </div>
  );
};

export default MemberCardPage;
