import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GameNumber } from "@/components/games/daily";
import { WordGuess } from "@/components/games/word-guess";
import { Nameplate } from "@/components/waraq/nameplate";
import { localizedMetadata } from "@/lib/metadata";

interface WordProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: WordProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.games" });
  return localizedMetadata(locale, "/qirtas/games/word", {
    description: t("guessLede"),
    title: `${t("kinds.word_guess")} · ${t("title")}`,
  });
};

/** The daily word guess, in the page's language. */
const WordPage = async ({ params }: WordProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.games" });
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10">
      <Nameplate current="games" locale={locale} small />
      <header className="grid gap-2 text-center">
        <p className="type-kicker">
          <Link className="hover:underline" href="/qirtas/games">
            {t("title")}
          </Link>{" "}
          · <GameNumber />
        </p>
        <h1 className="type-display">{t("kinds.word_guess")}</h1>
        <p className="type-lede">{t("guessLede")}</p>
      </header>
      <WordGuess lang={locale === "ar" ? "ar" : "en"} />
    </div>
  );
};

export default WordPage;
