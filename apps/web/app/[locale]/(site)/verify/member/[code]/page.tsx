import { Guilloche } from "@repo/brand/components/sal/guilloche";
import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/section";
import { localized, membership } from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";
import { readLive } from "@/lib/supabase";

// Its query string decides what it shows, so it renders per request.
export const instant = false;

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
 * Where a card's QR leads (decisions §11): for a live code (the code in the
 * link changes every 30 seconds), the card's fields: number, name, class or
 * Guest, the role held, the year since, and whether it stands today. An
 * old code (a screenshot, a printed link) shows only that it is not
 * current. Read live, never cached, so a reset code or an ended membership
 * shows at once.
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
  const tt = await getTranslations({ locale, namespace: "diwan.home.tiers" });
  const tk = await getTranslations({ locale, namespace: "diwan.home.kinds" });
  const valid = membership.CARD_CODE.test(code);
  const card = valid
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

  if (!(card.live && card.number !== null)) {
    return (
      <div className="mx-auto grid w-full max-w-xl gap-6 px-4 py-16">
        <PageHeader lede={t("lede")} title={t("title")} />
        <div className="grid gap-2" role="status">
          <p className="type-heading">{t("notLive")}</p>
          <p className="type-body">{t("notLiveHint")}</p>
        </div>
      </div>
    );
  }

  // The card's fields only (decisions §11): no email, no record.
  const rows: [string, string, "auto" | "ltr" | undefined][] = [
    [t("number"), String(card.number).padStart(5, "0"), "ltr"],
    [t("holder"), localized(card, "full_name", locale), "auto"],
  ];
  if (card.kind === "member" && card.tier) {
    rows.push([t("tier"), tt(card.tier), undefined]);
  } else if (card.kind === "guest" || card.kind === "partner") {
    rows.push([t("tier"), tk(card.kind), undefined]);
  }
  const role = locale === "ar" ? card.role_ar : card.role_en;
  if (role) {
    rows.push([t("role"), role, "auto"]);
  }
  if (card.since) {
    rows.push([t("since"), String(card.since), "ltr"]);
  }
  rows.push([
    t("status"),
    card.active ? t("statusActive") : t("statusInactive"),
    undefined,
  ]);

  return (
    <div className="mx-auto grid w-full max-w-xl gap-8 px-4 py-16">
      <PageHeader lede={t("lede")} title={t("title")} />
      <div className="grid gap-2" role="status">
        <p className="type-heading">{t("live")}</p>
        <p className="type-body">{card.active ? t("valid") : t("lapsed")}</p>
      </div>
      <dl className="border-line grid gap-3 border-t pt-5">
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
      <p className="type-caption">{t("note")}</p>
    </div>
  );
};

export default MemberCardPage;
