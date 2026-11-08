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
 * The Typewriter Tour (decisions.md): the Society's
 * welcome to new students, under Join, run by the Director of Membership
 * and the Tour Lead, once a year in the spring club fair week. No paper
 * is kept: writers join by QR code, their typed page is photographed into
 * their account, and they choose who sees it (private by default). The
 * wall shows the pages their writers put on this page.
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
      <Section id="how" title={t("howTitle")}>
        <p className="type-body max-w-[60ch]">{t("how")}</p>
      </Section>
      <Section id="six-words-go" title={t("wordsTitle")}>
        <p className="type-body max-w-[60ch]">{t("words")}</p>
      </Section>
      <TypewriterTourWall locale={locale} />
    </div>
  );
};

export default TypewriterTourPage;
