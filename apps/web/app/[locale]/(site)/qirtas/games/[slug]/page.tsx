import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { games, localized } from "@repo/sal-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AnswersGame } from "@/components/games/answers";
import { ChoicesGame } from "@/components/games/choices";
import { CrosswordGame } from "@/components/games/crossword";
import { LadderGame } from "@/components/games/ladder";
import { WordSearchGame } from "@/components/games/word-search";
import { Nameplate } from "@/components/waraq/nameplate";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

interface PuzzleProps {
  readonly params: Promise<{ locale: Locale; slug: string }>;
}

const read = (slug: string) =>
  readPublished(["journal"], (c) => games.puzzleBySlug(c, slug), null);

export const generateMetadata = async ({
  params,
}: PuzzleProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  const puzzle = await read(slug);
  if (!puzzle) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "web.games" });
  return localizedMetadata(locale, `/qirtas/games/${slug}`, {
    description: t(`kinds.${puzzle.kind}`),
    title: `${localized(puzzle, "title", locale)} · ${t("title")}`,
  });
};

type Puzzle = NonNullable<Awaited<ReturnType<typeof read>>>;

/** The player for each kind of puzzle. */
const PuzzleGame = ({ puzzle }: { readonly puzzle: Puzzle }) => {
  const common = { lang: puzzle.language, storageKey: puzzle.id };
  switch (puzzle.kind) {
    case "crossword":
      return <CrosswordGame crossword={puzzle.data} {...common} />;
    case "word_search":
      return <WordSearchGame search={puzzle.data} {...common} />;
    case "quiz":
    case "name_the_book":
      return <ChoicesGame kind={puzzle.kind} quiz={puzzle.data} {...common} />;
    case "riddle":
      return <AnswersGame kind="riddle" puzzle={puzzle.data} {...common} />;
    case "anagram":
      return <AnswersGame kind="anagram" puzzle={puzzle.data} {...common} />;
    case "word_ladder":
      return <LadderGame ladder={puzzle.data} {...common} />;
    default:
      return null;
  }
};

/**
 * A puzzle written by Qirtas's editors: a crossword, a word search, a quiz,
 * a word ladder, riddles, anagrams or name the book (A17).
 */
const PuzzlePage = async ({ params }: PuzzleProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const puzzle = await read(slug);
  if (!puzzle) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.games" });
  const note = localized(puzzle, "note", locale);
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10">
      <Nameplate current="games" locale={locale} small />
      <header className="grid gap-2">
        <h1 className="type-display">{localized(puzzle, "title", locale)}</h1>
        <p className="type-caption">
          <Link className="hover:underline" href="/qirtas/games">
            {t("title")}
          </Link>{" "}
          · {t(`kinds.${puzzle.kind}`)}
        </p>
        {note ? <p className="type-lede max-w-3xl">{note}</p> : null}
        {puzzle.published_at ? (
          <p className="type-caption">
            {formatLongDate(puzzle.published_at, locale)}
          </p>
        ) : null}
        {puzzle.made_with_ai ? (
          <p className="type-caption">{t("aiMade")}</p>
        ) : null}
      </header>
      <PuzzleGame puzzle={puzzle} />
    </div>
  );
};

export default PuzzlePage;
