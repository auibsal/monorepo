import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, RuledList, Section } from "@/components/section";
import { type LocaleParams, sectionMetadata } from "@/lib/page";
import { readPublished } from "@/lib/supabase";

export const generateMetadata = sectionMetadata("web.about", "/about");

/**
 * The About page, short (decisions.md, The site: About), in order: the one
 * sentence, the motto (al-Mutanabbi's whole verse with its translation,
 * and the story of the name Qirtas), what the Society does, the numbers
 * (each once it is more than zero), the independence statement, then one
 * line to its own pages. The Council, Press, Partners and Contact are in
 * the footer and aren't repeated here.
 */

/** The numbers counted by the site, in this order. */
const NUMBERS = ["members", "events", "pieces", "editions"] as const;

/** What the Society does (decisions §1), each opening its own part. */
const DOES = [
  ["qirtas", "/qirtas"],
  ["company", "/company"],
  ["nextStop", "/next-stop"],
  ["events", "/events"],
] as const;

/** About's own pages, one line (decisions.md, The site: About). */
const MORE = [
  ["howRun", "/about/how-its-run"],
  ["people", "/about/people"],
  ["sustainability", "/about/sustainability"],
  ["history", "/about/history"],
  ["library", "/library"],
  ["openData", "/about/open-data"],
  ["credits", "/about/credits"],
] as const;

const AboutPage = async ({ params }: LocaleParams) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.about" });
  const numbers = await readPublished(
    ["about"],
    async (c) => {
      const { data } = await c
        .schema("api")
        .rpc("society_numbers", undefined, { get: true });
      return data?.[0] ?? null;
    },
    null
  );
  // Each number shows once it is more than zero (decisions.md, The site: About).
  const counted = NUMBERS.filter((key) => (numbers?.[key] ?? 0) > 0);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-20 px-4 py-16 sm:py-24">
      <PageHeader lede={t("lede")} title={t("title")}>
        <Link
          className="link type-caption justify-self-start"
          href="/library/constitution"
        >
          {t("constitution")}
        </Link>
      </PageHeader>

      <Section id="motto" title={t("mottoTitle")}>
        <figure className="border-line pt-space-4 grid gap-3 border-t">
          <p className="text-4xl leading-tight font-light sm:text-5xl">
            {t("motto")}
          </p>
          {/* The whole verse in Arabic, on both editions: an original beside its translation. */}
          <blockquote
            className="reading text-2xl leading-relaxed"
            dir="rtl"
            lang="ar"
          >
            <span className="block">{t("verseFirst")}</span>
            <span className="block ps-8">{t("verseSecond")}</span>
          </blockquote>
          {locale === "ar" ? null : (
            <p className="type-body">{t("verseTranslation")}</p>
          )}
          <figcaption className="type-body text-text-secondary max-w-[60ch]">
            {t("mottoNote")}
          </figcaption>
        </figure>
        <p className="type-body max-w-[60ch]">{t("qirtasName")}</p>
      </Section>

      <Section id="does" title={t("doesTitle")}>
        <RuledList
          items={DOES.map(([key, href]) => ({
            body: t(`does.${key}.body`),
            key,
            title: (
              <Link className="hover:text-accent" href={href}>
                {t(`does.${key}.title`)}
              </Link>
            ),
          }))}
        />
      </Section>

      {counted.length > 0 ? (
        <Section id="numbers" title={t("numbersTitle")}>
          <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {counted.map((key) => (
              <div className="border-line grid gap-1 border-t pt-3" key={key}>
                <dt className="type-caption text-text-secondary">
                  {t(`numbers.${key}`)}
                </dt>
                <dd className="text-4xl font-light">
                  {formatNumber(numbers?.[key] ?? 0, locale)}
                </dd>
              </div>
            ))}
          </dl>
          <p className="type-caption">{t("numbersNote")}</p>
        </Section>
      ) : null}

      <Section id="independence" title={t("independenceTitle")}>
        <p className="type-body max-w-[60ch]">{t("independence")}</p>
      </Section>

      <nav aria-label={t("more.label")}>
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {MORE.map(([key, href]) => (
            <li key={key}>
              <Link className="link" href={href}>
                {t(`more.${key}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default AboutPage;
