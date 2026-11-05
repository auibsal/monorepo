import { Link } from "@repo/internationalization/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, Section } from "@/components/section";
import { TypewriterTourWall } from "@/components/typewriter-tour";
import { type LocaleParams, sectionMetadata } from "@/lib/page";

export const generateMetadata = sectionMetadata(
  "web.join.tour",
  "/join/typewriter-tour"
);

/**
 * The Typewriter Tour (owner, Nov 5, 2026): the Society's welcome to new
 * students, under Join. It belongs to membership, not to What's on's
 * series: the General Secretary owns it and picks the Tour Lead. The full
 * Tour runs once a year in spring, after Eid; in fall the typewriter is
 * the membership table at the club fair. Its Six Words wall and the
 * typewriter to try moved here from /events/typewriter-tour (no redirect).
 */
const TypewriterTourPage = async ({ params }: LocaleParams) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.join.tour" });
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-16 px-4 py-16 sm:py-24">
      <PageHeader lede={t("lede")} title={t("title")}>
        <p>
          <Link className="link" href="/join">
            {t("back")}
          </Link>
        </p>
      </PageHeader>
      <Section id="when" title={t("whenTitle")}>
        <p className="type-body max-w-[60ch]">{t("when")}</p>
      </Section>
      <Section id="six-words-go" title={t("wordsTitle")}>
        <p className="type-body max-w-[60ch]">{t("words")}</p>
      </Section>
      <TypewriterTourWall locale={locale} />
    </div>
  );
};

export default TypewriterTourPage;
