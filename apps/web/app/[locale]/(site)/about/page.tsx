import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Support } from "@/components/institutions";
import { PageHeader, RuledList, Section } from "@/components/section";
import { type LocaleParams, sectionMetadata } from "@/lib/page";

export const generateMetadata = sectionMetadata("web.about", "/about");

/**
 * The About page (decisions §6): the one sentence, the motto, what the
 * Society does, how it is run, then its pages, and AUIB's offices under
 * "With the support of" (decisions §2).
 */

/** What the Society does (decisions §1), each opening its own part. */
const DOES = [
  ["qirtas", "/qirtas"],
  ["company", "/company"],
  ["nextStop", "/next-stop"],
  ["events", "/events"],
] as const;

/** How it is run (decisions §2–§3), in the order a newcomer asks. */
const RUN = [
  "open",
  "council",
  "elections",
  "editors",
  "money",
  "process",
  "rules",
] as const;

/**
 * Where the Society stands (decisions §0), a dated line each. The Society
 * is founded at the Founding Meeting; nothing here dates an adoption before
 * it.
 */
const BEGAN = [
  ["registered", null],
  ["tour", "2026-02-08"],
  ["fair", "2026-02-23"],
  ["fall", "2026-10-05"],
  ["founding", "2027-03-30"],
] as const;

/** The Society's own pages, in a row of three. */
const HUB = [
  ["council", "/about/council"],
  ["library", "/library"],
  ["partners", "/partners"],
  ["contact", "/about/contact"],
  ["press", "/about/press"],
  ["verify", "/verify"],
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

      <Section id="run" title={t("runTitle")}>
        <RuledList
          columns={3}
          items={RUN.map((key) => ({
            body: t(`run.${key}.body`),
            key,
            title: t(`run.${key}.title`),
          }))}
        />
        <p className="type-body pt-space-4 max-w-[60ch]">{t("nonPartisan")}</p>
      </Section>

      <Section id="began" title={t("beganTitle")}>
        <ol className="border-line grid border-b">
          {BEGAN.map(([key, day]) => (
            <li
              className="border-line grid gap-1 border-t py-3 sm:grid-cols-[16rem_1fr] sm:gap-x-6"
              key={key}
            >
              {day ? (
                <time
                  className="type-caption text-text-secondary"
                  dateTime={day}
                >
                  {formatLongDate(`${day}T12:00:00+03:00`, locale, true)}
                </time>
              ) : (
                <span className="type-caption text-text-secondary">
                  {t("spring2026")}
                </span>
              )}
              <span className="type-body">{t(`began.${key}`)}</span>
            </li>
          ))}
        </ol>
      </Section>

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

      <Support
        className="border-line pt-space-4 border-t"
        locale={locale}
        logos
      />
    </div>
  );
};

export default AboutPage;
