import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { localized } from "@repo/sal-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  AwardsRound,
  OtherYears,
  publishedRounds,
  RoundDates,
} from "@/components/qirtas/awards";
import { localizedMetadata } from "@/lib/metadata";

interface RoundProps {
  readonly params: Promise<{ locale: Locale; round: string }>;
}

export const generateStaticParams = () => [];

const find = async (slug: string) =>
  (await publishedRounds()).find((round) => round.slug === slug) ?? null;

export const generateMetadata = async ({
  params,
}: RoundProps): Promise<Metadata> => {
  const { locale, round: slug } = await params;
  const round = await find(slug);
  if (!round) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "web.awards" });
  return localizedMetadata(locale, `/qirtas/awards/${round.slug}`, {
    description: t("lede"),
    title: `${t("title")} · ${localized(round, "title", locale)}`,
  });
};

/**
 * One year of the Qirtas Awards (the design review C19, Nov 4, 2026): its
 * shortlists and winners, as `journal.award_results()` shows them.
 */
const RoundPage = async ({ params }: RoundProps) => {
  const { locale, round: slug } = await params;
  setRequestLocale(locale);
  const rounds = await publishedRounds();
  const round = rounds.find((r) => r.slug === slug);
  if (!round) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.awards" });
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10">
      <header className="grid gap-2">
        <h1 className="type-display">
          {t("roundTitle", { round: localized(round, "title", locale) })}
        </h1>
        <RoundDates locale={locale} round={round} />
        <p>
          <Link className="link" href="/qirtas/awards">
            {t("title")}
          </Link>
        </p>
      </header>
      <AwardsRound locale={locale} round={round} />
      <OtherYears current={round.slug} locale={locale} rounds={rounds} />
    </div>
  );
};

export default RoundPage;
