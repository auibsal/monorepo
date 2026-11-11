import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, RuledList, Section } from "@/components/section";
import { type LocaleParams, sectionMetadata } from "@/lib/page";
import { readPublished } from "@/lib/supabase";

export const generateMetadata = sectionMetadata("web.about", "/about");

/**
 * The About page (decisions.md, The site), in order: the one sentence, the
 * motto (al-Mutanabbi's whole verse with its translation, and the story of
 * the name Qirtas), what the Society does, how it is run, a short history,
 * the Society by the numbers, the Council, the independence statement and
 * the documents. AUIB's offices are listed on the partners page only.
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
        .schema("content")
        .rpc("society_numbers", undefined, { get: true });
      return data?.[0] ?? null;
    },
    null
  );

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

      {numbers ? (
        <Section id="numbers" title={t("numbersTitle")}>
          <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {NUMBERS.map((key) => (
              <div className="border-line grid gap-1 border-t pt-3" key={key}>
                <dt className="type-caption text-text-secondary">
                  {t(`numbers.${key}`)}
                </dt>
                <dd className="text-4xl font-light">
                  {formatNumber(numbers[key], locale)}
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
    </div>
  );
};

export default AboutPage;
