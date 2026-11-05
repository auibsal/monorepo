import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShareLink } from "@/components/share";
import {
  AwardsRound,
  OtherYears,
  publishedRounds,
  RoundDates,
} from "@/components/waraq/awards";
import { localizedMetadata } from "@/lib/metadata";

interface AwardsProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: AwardsProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.awards" });
  const paper = await getTranslations({ locale, namespace: "web.journal" });
  return localizedMetadata(locale, "/qirtas/awards", {
    description: t("lede"),
    title: `${t("title")} · ${paper("title")}`,
  });
};

/**
 * The Qirtas Awards (owner, Oct 29, 2026; "Awards", Oct 31): the six
 * awards, what each is for and whom it is named for, and for the latest
 * round its dates, its shortlists from their day and its winners from
 * theirs; every other year at /qirtas/awards/<round> (the design review
 * C19, Nov 4, 2026).
 */
const AwardsPage = async ({ params }: AwardsProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.awards" });
  const rounds = await publishedRounds();
  const round = rounds[0] ?? null;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10">
      <header className="grid gap-2">
        <h1 className="type-display">{t("title")}</h1>
        <p className="type-lede max-w-3xl">{t("lede")}</p>
        {round ? <RoundDates locale={locale} round={round} /> : null}
        <p className="type-body max-w-3xl">{t("judging")}</p>
        <p className="type-body max-w-3xl">{t("rewards")}</p>
        <ShareLink title={t("title")} />
      </header>
      <AwardsRound locale={locale} round={round} />
      <OtherYears
        current={round?.slug ?? null}
        locale={locale}
        rounds={rounds}
      />
    </div>
  );
};

export default AwardsPage;
