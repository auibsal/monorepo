import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, RuledList, Section } from "@/components/section";
import { type LocaleParams, sectionMetadata } from "@/lib/page";

export const generateMetadata = sectionMetadata("web.about", "/about");

const PILLARS = ["connecting", "fostering", "celebrating", "building"] as const;

/** The Society's own pages, in a row of six (decisions.md: threes). */
const HUB = [
  ["council", "/about/council"],
  ["library", "/library"],
  ["partners", "/partners"],
  ["contact", "/about/contact"],
  ["press", "/about/press"],
  ["verify", "/verify"],
] as const;
/**
 * How the Society began, a dated line each (the design review C6), from
 * what Qirtas reported at the time; each line opens the piece.
 */
const BEGAN = [
  ["handbook", "2026-09-28", "society-publishes-its-member-handbook"],
  ["documents", "2026-10-09", "society-publishes-its-founding-documents"],
  [
    "constitution",
    "2026-10-13",
    "society-ratifies-its-constitution-on-charter-day",
  ],
  ["qirtas", "2026-10-14", "qirtas-launches-as-one-paper"],
] as const;

const GLANCE = [
  "open",
  "power",
  "council",
  "elections",
  "editors",
  "money",
  "process",
  "last",
] as const;

const AboutPage = async ({ params }: LocaleParams) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.about" });

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

      <Section id="society" title={t("hubTitle")}>
        <RuledList
          columns={3}
          items={HUB.map(([key, href]) => ({
            body: t(`hub.${key}.body`),
            key,
            title: (
              <Link className="hover:text-accent" href={href}>
                {t(`hub.${key}.title`)}
              </Link>
            ),
          }))}
        />
      </Section>

      <Section id="began" title={t("beganTitle")}>
        <ol className="border-line grid border-b">
          {BEGAN.map(([key, day, slug]) => (
            <li
              className="border-line grid gap-1 border-t py-3 sm:grid-cols-[16rem_1fr] sm:gap-x-6"
              key={key}
            >
              <time className="type-caption text-text-secondary" dateTime={day}>
                {formatLongDate(`${day}T12:00:00+03:00`, locale, true)}
              </time>
              <Link className="link" href={`/qirtas/news/${slug}`}>
                {t(`began.${key}`)}
              </Link>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="preamble" title={t("preambleTitle")}>
        <p className="type-lede max-w-[60ch]">{t("preamble")}</p>
      </Section>

      <Section id="motto" title={t("mottoTitle")}>
        <figure className="border-line pt-space-4 grid gap-3 border-t">
          <p className="text-4xl leading-tight font-light sm:text-5xl">
            {t("motto")}
          </p>
          <figcaption className="type-body text-text-secondary max-w-[60ch]">
            {t("mottoNote")}
          </figcaption>
        </figure>
      </Section>

      <Section id="pillars" title={t("pillarsTitle")}>
        <RuledList
          items={PILLARS.map((key) => ({
            body: t(`pillars.${key}.body`),
            key,
            title: t(`pillars.${key}.title`),
          }))}
        />
      </Section>

      <Section id="glance" title={t("glanceTitle")}>
        <RuledList
          columns={3}
          items={GLANCE.map((key) => ({
            body: t(`glance.${key}.body`),
            key,
            title: t(`glance.${key}.title`),
          }))}
        />
      </Section>

      <div className="border-line pt-space-4 grid gap-4 border-t">
        <p className="type-body max-w-[60ch]">{t("nonPartisan")}</p>
      </div>
    </div>
  );
};

export default AboutPage;
