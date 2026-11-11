import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EpisodeCard, loadEpisodes } from "@/components/next-stop";
import { localizedMetadata } from "@/lib/metadata";

interface EpisodesProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: EpisodesProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return localizedMetadata(locale, "/next-stop/episodes", {
    description: t("nextStop.lede"),
    title: `${t("nextStop.episodes")} · ${t("nextStop.title")}`,
  });
};

/** Next Stop's episodes as a plain list, the shelf's twin (Motion and shelves). */
const EpisodesPage = async ({ params }: EpisodesProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const episodes = await loadEpisodes();
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10">
      <header className="grid gap-2">
        <h1 className="type-display">{t("nextStop.episodes")}</h1>
        <p className="type-caption">
          <Link className="link" href="/next-stop">
            {t("nextStop.title")}
          </Link>
        </p>
      </header>
      {episodes.length === 0 ? (
        <p className="type-body text-text-secondary">{t("nextStop.none")}</p>
      ) : (
        <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {episodes.map((episode) => (
            <li key={episode.id}>
              <EpisodeCard episode={episode} heading="h2" locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default EpisodesPage;
