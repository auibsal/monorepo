import { Shelf } from "@repo/brand/components/sal/shelf";
import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { journal, localized } from "@repo/sal-data";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { loadEpisodes } from "@/components/next-stop";
import { PieceCardView } from "@/components/qirtas/cards";
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
 * Next Stop, the Society's video show, under the Director of Media (owner,
 * Nov 7, 2026: out of Qirtas, at /next-stop; episodes on YouTube):
 * its episodes on a shelf (the same as a plain list at
 * /next-stop/episodes), the team from the roles people hold, how to
 * send a reel, and its promise to the people it films.
 */
const NextStopPage = async ({ params }: NextStopProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const [episodes, team] = await Promise.all([
    loadEpisodes(locale),
    readPublished(["journal"], (c) => journal.nextStopTeam(c), []),
  ]);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-10">
      <header className="grid gap-2">
        <h1 className="type-display">{t("nextStop.title")}</h1>
        <p className="type-lede max-w-3xl">{t("nextStop.lede")}</p>
      </header>

      <section aria-labelledby="episodes" className="grid gap-4">
        <h2 className="type-heading" id="episodes">
          {t("nextStop.episodes")}
        </h2>
        {episodes.length === 0 ? (
          <p className="type-body text-text-secondary">{t("noPieces")}</p>
        ) : (
          <Shelf
            items={episodes.map((piece) => ({
              key: piece.id,
              node: <PieceCardView image locale={locale} piece={piece} />,
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
          <ul className="grid border-line border-b sm:grid-cols-2 sm:gap-x-10">
            {team.map((person) => (
              <li
                className="grid gap-1 border-line border-t py-3"
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

      <section aria-labelledby="send-reel" className="grid gap-3">
        <h2 className="type-heading" id="send-reel">
          {t("nextStop.sendTitle")}
        </h2>
        <p className="type-body max-w-[60ch]">{t("nextStop.sendBody")}</p>
        <p className="flex flex-wrap gap-x-6 gap-y-2">
          <Link className="link" href="/qirtas/write/reel">
            {t("nextStop.sendReel")}
          </Link>
          <Link className="link" href="/next-stop/care">
            {t("nextStop.care")}
          </Link>
        </p>
      </section>
    </div>
  );
};

export default NextStopPage;
