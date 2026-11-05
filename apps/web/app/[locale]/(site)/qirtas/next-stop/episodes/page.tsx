import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PieceCardView } from "@/components/waraq/cards";
import { loadEpisodes } from "@/components/waraq/next-stop";
import { localizedMetadata } from "@/lib/metadata";

interface EpisodesProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: EpisodesProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return localizedMetadata(locale, "/qirtas/next-stop/episodes", {
    description: t("nextStop.lede"),
    title: `${t("nextStop.episodes")} · ${t("nextStop.title")}`,
  });
};

/** Next Stop's episodes as a plain list, the shelf's twin (Motion and shelves). */
const EpisodesPage = async ({ params }: EpisodesProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const episodes = await loadEpisodes(locale);
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10">
      <header className="grid gap-2">
        <h1 className="type-display">{t("nextStop.episodes")}</h1>
        <p className="type-caption">
          <Link className="link" href="/qirtas/next-stop">
            {t("nextStop.title")}
          </Link>
        </p>
      </header>
      {episodes.length === 0 ? (
        <p className="type-body text-text-secondary">{t("noPieces")}</p>
      ) : (
        <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {episodes.map((piece) => (
            <li key={piece.id}>
              <PieceCardView heading="h2" image locale={locale} piece={piece} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default EpisodesPage;
