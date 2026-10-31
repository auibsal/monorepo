import { Link } from "@repo/internationalization/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, RuledList, Section } from "@/components/section";
import { type LocaleParams, sectionMetadata } from "@/lib/page";

export const generateMetadata = sectionMetadata("web.about", "/about");

const PILLARS = ["connecting", "fostering", "celebrating", "building"] as const;

/** The Society's own pages, in a row of six (owner, Oct 30, 2026: threes). */
const HUB = [
  ["council", "/about/council"],
  ["library", "/library"],
  ["partners", "/partners"],
  ["contact", "/about/contact"],
  ["press", "/about/press"],
  ["verify", "/verify"],
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

      <Section id="preamble" title={t("preambleTitle")}>
        <p className="type-lede max-w-[60ch]">{t("preamble")}</p>
      </Section>

      <Section id="motto" title={t("mottoTitle")}>
        <figure className="grid gap-3 border-line border-t pt-space-4">
          <p className="font-light text-4xl leading-tight sm:text-5xl">
            {t("motto")}
          </p>
          <figcaption className="type-body max-w-[60ch] text-text-secondary">
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

      <div className="grid gap-4 border-line border-t pt-space-4">
        <p className="type-body max-w-[60ch]">{t("nonPartisan")}</p>
      </div>
    </div>
  );
};

export default AboutPage;
