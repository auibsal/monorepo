import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { journal } from "@repo/sal-data";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PieceCardView } from "@/components/waraq/cards";
import { Nameplate } from "@/components/waraq/nameplate";
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
  return localizedMetadata(locale, "/qirtas/next-stop", {
    description: t("nextStop.lede"),
    title: `${t("nextStop.title")} · ${t("title")}`,
  });
};

/**
 * Next Stop, Qirtas's video show (owner, Oct 29, 2026): its episodes from
 * the Video section, and its promise to the people it films.
 */
const NextStopPage = async ({ params }: NextStopProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const episodes = journal.inLanguage(
    await readPublished(
      ["journal"],
      (c) =>
        journal.deskPieces(c, "video", {
          categories: ["next_stop_episode"],
          limit: 48,
        }),
      []
    ),
    locale
  );

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10">
      <Nameplate current="video" locale={locale} small />
      <header className="grid gap-2">
        <h1 className="type-display">{t("nextStop.title")}</h1>
        <p className="type-lede max-w-3xl">{t("nextStop.lede")}</p>
      </header>
      {episodes.length === 0 ? (
        <p className="type-body text-text-secondary">{t("noPieces")}</p>
      ) : (
        <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {episodes.map((piece) => (
            <li key={piece.id}>
              <PieceCardView image locale={locale} piece={piece} />
            </li>
          ))}
        </ul>
      )}
      <p className="border-line border-t pt-space-4">
        <Link className="link" href="/qirtas/next-stop/care">
          {t("nextStop.care")}
        </Link>
      </p>
    </div>
  );
};

export default NextStopPage;
