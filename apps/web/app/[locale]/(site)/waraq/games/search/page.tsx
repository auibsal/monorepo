import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DailySearch, GameNumber } from "@/components/games/daily";
import { Nameplate } from "@/components/waraq/nameplate";
import { localizedMetadata } from "@/lib/metadata";

interface SearchProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: SearchProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.games" });
  return localizedMetadata(locale, "/waraq/games/search", {
    description: t("searchLede"),
    title: `${t("kinds.word_search")} · ${t("title")}`,
  });
};

/** The daily word search, in the page's language. */
const SearchPage = async ({ params }: SearchProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.games" });
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10">
      <Nameplate current="games" locale={locale} small />
      <header className="grid gap-2">
        <p className="type-kicker">
          <Link className="hover:underline" href="/waraq/games">
            {t("title")}
          </Link>{" "}
          · <GameNumber />
        </p>
        <h1 className="type-display">{t("kinds.word_search")}</h1>
        <p className="type-lede">{t("searchLede")}</p>
      </header>
      <DailySearch lang={locale === "ar" ? "ar" : "en"} />
    </div>
  );
};

export default SearchPage;
