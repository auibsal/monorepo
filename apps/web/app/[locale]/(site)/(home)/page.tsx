import { SectionHead } from "@repo/brand/components/sal/section-head";
import { Button } from "@repo/brand/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { localizedPath } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OpenPlaces } from "@/components/account/open-places";
import { type DatedItem, DatedList, eventItems } from "@/components/event-list";
import { EpisodeCard, loadEpisodes } from "@/components/next-stop";
import { PieceCardView } from "@/components/qirtas/cards";
import { FromTheSociety } from "@/components/qirtas/from-the-society";
import { events, journal, localized, programmes } from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

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

const Home = async ({ params }: HomeProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.home" });
  const tj = await getTranslations({ locale, namespace: "web.journal" });
  const join = localizedPath(locale, "/sign-up");

  const [nextEvents, calls, edition, front, news, episodes, places] =
    await Promise.all([
      readPublished(
        ["events"],
        (c) => events.publicEvents(c, { limit: 3 }),
        []
      ),
      readPublished(["journal"], (c) => journal.editionCalls(c), []),
      readPublished(["journal"], (c) => journal.currentEdition(c), null),
      readPublished(["journal"], (c) => journal.frontPieces(c), []),
      readPublished(["journal"], (c) => journal.deskPieces(c, "news"), []),
      loadEpisodes(),
      readPublished(["programmes"], (c) => programmes.openPlaces(c), []),
    ]);

  // Home, in decisions.md's order, each part only when it has something:
  // the motto and Join; the next three events; the current call or the
  // newest Edition; the latest from Qirtas; Next Stop's latest; open roles;
  // From the Society. Join is the one main action.
  const term: DatedItem[] = eventItems(nextEvents ?? [], locale).slice(0, 3);
  const [call] = calls ?? [];
  const pieces = journal.inLanguage(
    ((front ?? []).length > 0 ? front : news) ?? [],
    locale
  );
  const [lead, ...rest] = pieces;
  const [latestEpisode] = episodes;
  const roles = (places ?? []).slice(0, 3);

  return (
    <>
      <section>
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 sm:py-24">
          <div className="grid gap-6">
            <h1 className="type-display-xl max-w-4xl">{t("title")}</h1>
            <p className="type-lede max-w-[34ch]">{t("lede")}</p>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-2">
              <Button asChild>
                <a href={join}>{t("join")}</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {term.length > 0 ? (
        <section
          aria-labelledby="this-term"
          className="gap-space-5 mx-auto grid w-full max-w-6xl px-4 py-16 [&_h2]:scroll-mt-28"
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
          <DatedList items={term} locale={locale} />
        </section>
      ) : null}

      {call || edition ? (
        <section
          aria-labelledby="edition"
          className="gap-space-4 border-line mx-auto grid w-full max-w-6xl border-t px-4 py-16"
        >
          <h2 className="type-heading" id="edition">
            {call ? t("call") : t("edition")}
          </h2>
          {call ? (
            <div className="grid gap-2">
              <p className="type-subheading">
                <Link className="hover:text-accent" href="/qirtas/submit">
                  {localized(call, "title", locale)}
                </Link>
              </p>
              <p className="type-body max-w-[60ch]">
                {localized(call, "theme", locale)}
              </p>
              <p className="type-caption">
                {t("closes", { date: formatLongDate(call.closes_at, locale) })}
              </p>
            </div>
          ) : null}
          {!call && edition ? (
            <p className="type-subheading">
              <Link
                className="hover:text-accent"
                href={`/qirtas/editions/${edition.slug}`}
              >
                {localized(edition, "title", locale)}
              </Link>
            </p>
          ) : null}
        </section>
      ) : null}

      {lead ? (
        <section aria-labelledby="paper" className="bg-surface-reading">
          <div className="gap-space-5 mx-auto grid w-full max-w-6xl px-4 py-16">
            <header className="border-text flex flex-wrap items-end justify-between gap-x-8 gap-y-2 border-b pb-3">
              <h2 id="paper">
                <Link
                  className="hover:text-accent text-4xl font-medium tracking-tight sm:text-5xl"
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

      {latestEpisode ? (
        <section
          aria-labelledby="next-stop"
          className="gap-space-4 mx-auto grid w-full max-w-6xl px-4 py-16"
        >
          <SectionHead
            action={
              <Link className="link type-caption" href="/next-stop">
                {t("nextStopAll")}
              </Link>
            }
            title={t("nextStop")}
            titleId="next-stop"
          />
          <div className="max-w-3xl">
            <EpisodeCard episode={latestEpisode} locale={locale} />
          </div>
        </section>
      ) : null}

      {roles.length > 0 ? (
        <section
          aria-labelledby="open-roles"
          className="gap-space-4 border-line mx-auto grid w-full max-w-6xl border-t px-4 py-16"
        >
          <SectionHead
            action={
              <Link className="link type-caption" href="/get-involved">
                {t("openRolesAll")}
              </Link>
            }
            title={t("openRoles")}
            titleId="open-roles"
          />
          <OpenPlaces locale={locale} places={roles} />
        </section>
      ) : null}

      <div className="border-line mx-auto grid w-full max-w-6xl border-t px-4 py-16 empty:hidden">
        <FromTheSociety locale={locale} />
      </div>
    </>
  );
};

export default Home;
