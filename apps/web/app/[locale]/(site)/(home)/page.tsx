import { SectionHead } from "@repo/design-system/components/sal/section-head";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { localizedPath } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { events, journal, localized, programmes } from "@repo/sal-data";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { type DatedItem, DatedList, eventItems } from "@/components/event-list";
import { NewsletterSignup } from "@/components/newsletter/signup";
import { seriesPath } from "@/components/series";
import { PieceCardView } from "@/components/waraq/cards";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

/** Where a program's name leads: its own page (Qirtas: the paper). */
const programmeHref = (slug: string) =>
  slug === "waraq" ? "/qirtas" : seriesPath(slug);

interface HomeProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: HomeProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.home" });
  return localizedMetadata(locale, "/", {
    description: t("lede"),
    title: t("metaTitle"),
  });
};

/** The italic word of a headline, in the accent. */
const accent = (chunks: ReactNode) => (
  <span className="type-accent">{chunks}</span>
);

const Home = async ({ params }: HomeProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.home" });
  const tj = await getTranslations({ locale, namespace: "web.journal" });
  const join = localizedPath(locale, "/sign-up");

  const [nextEvents, calls, front, news, allProgrammes] = await Promise.all([
    readPublished(["events"], (c) => events.publicEvents(c, { limit: 6 }), []),
    readPublished(["journal"], (c) => journal.editionCalls(c), []),
    readPublished(["journal"], (c) => journal.frontPieces(c), []),
    readPublished(["journal"], (c) => journal.deskPieces(c, "news"), []),
    readPublished(["programmes"], (c) => programmes.programmes(c), []),
  ]);

  // The next three weeks (the overhaul, Oct 30, 2026): open calls (filed
  // under the day they close) and the events, in date order, six at most.
  const horizon = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString();
  const term: DatedItem[] = [
    ...(calls ?? []).map((call) => ({
      at: call.closes_at,
      href: "/qirtas",
      key: call.id,
      line: localized(call, "theme", locale),
      place: t("closes", { date: formatLongDate(call.closes_at, locale) }),
      title: localized(call, "title", locale),
    })),
    ...eventItems(nextEvents ?? [], locale),
  ]
    .filter((item) => !(item.at > horizon))
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(0, 6);

  const pieces = journal.inLanguage(
    ((front ?? []).length > 0 ? front : news) ?? [],
    locale
  );
  const [lead, ...rest] = pieces;

  // The six programs: Qirtas and Next Stop are unpublished, and the Company
  // is the theater company, not a program.
  const series = (allProgrammes ?? []).filter(programmes.isListedProgram);

  return (
    <>
      <section>
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 sm:py-24">
          <div className="grid gap-6">
            <h1 className="type-display-xl max-w-4xl">
              {t.rich("title", { accent })}
            </h1>
            <p className="type-lede max-w-[34ch]">{t("lede")}</p>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-2">
              <Button asChild>
                <a href={join}>{t("join")}</a>
              </Button>
              <Button asChild variant="link">
                <a href="#this-term">{t("whatsOn")}</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="this-term"
        className="mx-auto grid w-full max-w-6xl gap-space-5 px-4 py-16 [&_h2]:scroll-mt-28"
      >
        <SectionHead
          action={
            <Link className="link type-caption" href="/events">
              {t("allEvents")}
            </Link>
          }
          title={t("thisTerm")}
          titleId="this-term"
        />
        {term.length > 0 ? (
          <DatedList items={term} locale={locale} />
        ) : (
          <p className="type-body text-text-secondary">{t("noEvents")}</p>
        )}
      </section>

      {lead ? (
        <section aria-labelledby="paper" className="bg-surface-reading">
          <div className="mx-auto grid w-full max-w-6xl gap-space-5 px-4 py-16">
            <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2 border-text border-b pb-3">
              <h2 id="paper">
                <Link
                  className="font-medium text-4xl tracking-tight hover:text-accent sm:text-5xl"
                  href="/qirtas"
                >
                  {tj("title")}
                </Link>
              </h2>
              <p className="type-caption text-text-secondary">
                {tj("tagline")}
              </p>
            </header>
            <div className="grid gap-x-10 gap-y-8 md:grid-cols-[1.4fr_1fr_1fr]">
              <PieceCardView large locale={locale} piece={lead} />
              {rest.slice(0, 2).map((piece) => (
                <PieceCardView key={piece.id} locale={locale} piece={piece} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {series.length > 0 ? (
        <section
          aria-labelledby="programs"
          className="mx-auto grid w-full max-w-6xl gap-space-5 px-4 py-16"
        >
          <SectionHead
            action={
              <Link className="link type-caption" href="/events#series">
                {t("allPrograms")}
              </Link>
            }
            title={t("programs")}
            titleId="programs"
          />
          <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
            {series.map((p) => (
              <li className="border-line border-t py-space-4" key={p.id}>
                <Link className="group grid gap-2" href={programmeHref(p.slug)}>
                  <h3 className="type-heading group-hover:text-accent group-hover:underline">
                    {localized(p, "name", locale)}
                  </h3>
                  {localized(p, "summary", locale) ? (
                    <p className="type-caption max-w-[32ch] text-text-secondary">
                      {localized(p, "summary", locale)}
                    </p>
                  ) : null}
                  {localized(p, "rhythm", locale) ? (
                    <p className="type-caption">
                      {localized(p, "rhythm", locale)}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section
        aria-labelledby="sunday-paper"
        className="mx-auto grid w-full max-w-6xl gap-4 border-line border-t px-4 py-16 md:grid-cols-[1fr_1.4fr] md:items-start"
      >
        <div className="grid gap-2">
          <h2 className="type-heading" id="sunday-paper">
            {t("sundayPaper")}
          </h2>
          <p className="type-body">{t("sundayPaperLede")}</p>
        </div>
        <NewsletterSignup compact />
      </section>
    </>
  );
};

export default Home;
