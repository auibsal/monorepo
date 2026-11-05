import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { games, localized } from "@repo/sal-data";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GameNumber } from "@/components/games/daily";
import { WordGuess } from "@/components/games/word-guess";
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

/** The daily games after the word, each on its own page. */
const DAILY = [
  { kind: "word_search", lede: "searchLede", path: "search" },
  { kind: "crossword", lede: "crosswordLede", path: "crossword" },
  { kind: "anagram", lede: "anagramLede", path: "anagram" },
] as const;

// Rows under hairlines, not boxed cards (brand book: lists over cards).
const card =
  "grid content-start gap-2 border-line border-t py-space-4 hover:underline";

/**
 * Qirtas's Games section (owner, Nov 5, 2026): four daily games, made anew
 * every day in the page's language (the word first, then the word search,
 * the crossword and the anagrams), and any puzzle the editors write. Games
 * come from the editors only; members send none.
 */
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
      <header className="grid gap-2">
        <h1 className="type-display">{t("title")}</h1>
        <p className="type-lede max-w-3xl">{t("lede")}</p>
      </header>

      {/* Today's word first (design review A18, C21), with its streak and a
          result to share; its own page stays the plain route. */}
      <section aria-labelledby="today" className="grid gap-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="type-heading" id="today">
            {t("todaysPuzzle")} · <GameNumber />
          </h2>
          <Link className="link type-caption" href="/qirtas/games/word">
            {t("ownPage")}
          </Link>
        </div>
        <WordGuess lang={lang} />
      </section>

      <section aria-labelledby="daily" className="grid gap-4">
        <h2 className="type-heading" id="daily">
          {t("alsoDaily")}
        </h2>
        <ul className="grid gap-x-8 sm:grid-cols-3">
          {DAILY.map((game) => (
            <li key={game.kind}>
              <Link className={card} href={`/qirtas/games/${game.path}`}>
                <span className="type-heading">{t(`kinds.${game.kind}`)}</span>
                <span className="type-body">{t(game.lede)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="type-caption">{t("today")}</p>
      </section>

      {puzzles.length === 0 ? null : (
        <section aria-labelledby="editors" className="grid gap-4">
          <h2 className="type-heading" id="editors">
            {t("fromEditors")}
          </h2>
          <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {puzzles.map((p) => (
              <li key={p.id}>
                <Link className={card} href={`/qirtas/games/${p.slug}`}>
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
        </section>
      )}
    </div>
  );
};

export default GamesPage;
