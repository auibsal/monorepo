import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { games, localized } from "@repo/sal-data";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GameNumber } from "@/components/games/daily";
import { Nameplate } from "@/components/waraq/nameplate";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

interface GamesProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: GamesProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.games" });
  const paper = await getTranslations({ locale, namespace: "web.journal" });
  return localizedMetadata(locale, "/qirtas/games", {
    description: t("lede"),
    title: `${t("title")} · ${paper("title")}`,
  });
};

const card =
  "border border-line grid content-start gap-2  border-t border-line p-6 hover:underline";

/** Waraq's games: two daily games and the editors' puzzles. */
const GamesPage = async ({ params }: GamesProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.games" });
  const lang: games.GameLang = locale === "ar" ? "ar" : "en";
  const puzzles = await readPublished(
    ["journal"],
    (c) => games.publishedPuzzles(c, lang),
    []
  );

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10">
      <Nameplate current="games" locale={locale} small />
      <header className="grid gap-2">
        <h1 className="type-display">{t("title")}</h1>
        <p className="type-lede max-w-3xl">{t("lede")}</p>
      </header>

      <section aria-labelledby="daily" className="grid gap-4">
        <h2 className="type-heading" id="daily">
          {t("daily")} · <GameNumber />
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          <li>
            <Link className={card} href="/qirtas/games/word">
              <span className="type-heading">{t("kinds.word_guess")}</span>
              <span className="type-body">{t("guessLede")}</span>
            </Link>
          </li>
          <li>
            <Link className={card} href="/qirtas/games/search">
              <span className="type-heading">{t("kinds.word_search")}</span>
              <span className="type-body">{t("searchLede")}</span>
            </Link>
          </li>
        </ul>
        <p className="type-caption">{t("today")}</p>
      </section>

      <section aria-labelledby="editors" className="grid gap-4">
        <h2 className="type-heading" id="editors">
          {t("fromEditors")}
        </h2>
        {puzzles.length === 0 ? (
          <p className="type-body text-text-secondary">{t("none")}</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {puzzles.map((p) => (
              <li key={p.id}>
                <Link className={card} href={`/qirtas/puzzles/${p.slug}`}>
                  <span className="type-caption">{t(`kinds.${p.kind}`)}</span>
                  <span className="type-heading">
                    {localized(p, "title", locale)}
                  </span>
                  {p.published_at ? (
                    <span className="type-caption">
                      {formatLongDate(p.published_at, locale)}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default GamesPage;
