import { Shelf } from "@repo/brand/components/sal/shelf";
import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EpisodeCard, loadEpisodes } from "@/components/next-stop";
import { journal, localized } from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

interface NextStopProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: NextStopProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return localizedMetadata(locale, "/next-stop", {
    description: t("nextStop.lede"),
    title: t("nextStop.title"),
  });
};

/**
 * Next Stop, the Society's video show (decisions.md, What the Society does:
 * Next Stop): its one line, the latest episode first, every episode on a
 * shelf (the same as a plain list at /next-stop/episodes), the team from
 * the roles people hold, how to reach the show, and when it comes out.
 * Qirtas and Next Stop link to each other in one line.
 */
const NextStopPage = async ({ params }: NextStopProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const [episodes, team] = await Promise.all([
    loadEpisodes(),
    readPublished(["journal"], (c) => journal.nextStopTeam(c), []),
  ]);
  const [latest] = episodes;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-10">
      <header className="grid gap-2">
        <h1 className="type-display">{t("nextStop.title")}</h1>
        <p className="type-lede max-w-3xl">{t("nextStop.lede")}</p>
      </header>

      {latest ? (
        <section aria-labelledby="latest" className="grid max-w-3xl gap-4">
          <h2 className="type-heading" id="latest">
            {t("nextStop.latest")}
          </h2>
          <EpisodeCard episode={latest} locale={locale} />
        </section>
      ) : (
        <p className="type-body max-w-[60ch]">{t("nextStop.pilot")}</p>
      )}

      <section aria-labelledby="episodes" className="grid gap-4">
        <h2 className="type-heading" id="episodes">
          {t("nextStop.episodes")}
        </h2>
        {episodes.length === 0 ? (
          <p className="type-body text-text-secondary">{t("nextStop.none")}</p>
        ) : (
          <Shelf
            items={episodes.map((episode) => ({
              key: episode.id,
              node: <EpisodeCard episode={episode} locale={locale} />,
            }))}
            label={t("nextStop.episodes")}
            listLink={
              <Link className="link" href="/next-stop/episodes">
                {t("nextStop.asList")}
              </Link>
            }
            nextLabel={t("shelfNext")}
            previousLabel={t("shelfPrevious")}
          />
        )}
      </section>

      {team.length > 0 ? (
        <section aria-labelledby="crew" className="grid gap-4">
          <h2 className="type-heading" id="crew">
            {t("nextStop.team")}
          </h2>
          <ul className="border-line grid border-b sm:grid-cols-2 sm:gap-x-10">
            {team.map((person) => (
              <li
                className="border-line grid gap-1 border-t py-3"
                key={`${person.full_name_en}-${person.title_en}`}
              >
                <span className="type-subheading">
                  {localized(
                    {
                      full_name_ar: person.full_name_ar ?? "",
                      full_name_en: person.full_name_en ?? "",
                    },
                    "full_name",
                    locale
                  )}
                </span>
                <span className="type-caption text-text-secondary">
                  {localized(
                    {
                      title_ar: person.title_ar ?? "",
                      title_en: person.title_en ?? "",
                    },
                    "title",
                    locale
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid max-w-[60ch] gap-3">
        <p className="type-body">{t("nextStop.contact")}</p>
        {latest ? <p className="type-body">{t("nextStop.pilot")}</p> : null}
        <p className="flex flex-wrap gap-x-6 gap-y-2">
          <Link className="link" href="/next-stop/care">
            {t("nextStop.care")}
          </Link>
          <Link className="link" href="/qirtas/video">
            {t("nextStop.qirtas")}
          </Link>
        </p>
      </section>
    </div>
  );
};

export default NextStopPage;
