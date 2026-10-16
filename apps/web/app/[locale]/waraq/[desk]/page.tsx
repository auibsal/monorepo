import type { Locale } from "@repo/internationalization";
import { journal } from "@repo/sal-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { WaraqAd } from "@/components/waraq/ad";
import { PieceCardView } from "@/components/waraq/cards";
import { Nameplate } from "@/components/waraq/nameplate";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

interface DeskProps {
  readonly params: Promise<{ desk: string; locale: Locale }>;
}

const isDesk = (value: string): value is journal.Desk =>
  (journal.desks as readonly string[]).includes(value);

export const generateStaticParams = () =>
  journal.desks.map((desk) => ({ desk }));

export const generateMetadata = async ({
  params,
}: DeskProps): Promise<Metadata> => {
  const { desk, locale } = await params;
  if (!isDesk(desk)) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return localizedMetadata(locale, `/waraq/${desk}`, {
    description: t(`deskLedes.${desk}`),
    title: `${t(`desks.${desk}`)} · ${t("title")}`,
  });
};

/** A section of the paper: News, Letters, Gallery, Video or Voices. */
const DeskPage = async ({ params }: DeskProps) => {
  const { desk, locale } = await params;
  setRequestLocale(locale);
  if (!isDesk(desk)) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const pieces = await readPublished(
    ["journal"],
    (c) => journal.deskPieces(c, desk, { limit: 48 }),
    []
  );
  const pictures = desk === "gallery" || desk === "video";

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10">
      <Nameplate current={desk} locale={locale} small />
      <header className="grid gap-2">
        <h1 className="type-display">{t(`desks.${desk}`)}</h1>
        <p className="type-lede max-w-3xl">{t(`deskLedes.${desk}`)}</p>
      </header>
      {pieces.length === 0 ? (
        <p className="type-body text-text-secondary">{t("noPieces")}</p>
      ) : (
        <ul
          className={
            desk === "letters"
              ? "reading grid gap-10 rounded-card p-6 sm:grid-cols-2"
              : "grid gap-10 sm:grid-cols-2 lg:grid-cols-3"
          }
        >
          {pieces.map((piece) => (
            <li key={piece.id}>
              <PieceCardView
                image={pictures || desk === "news"}
                locale={locale}
                piece={piece}
              />
            </li>
          ))}
        </ul>
      )}
      <WaraqAd locale={locale} page={`/waraq/${desk}`} slot={0} />
    </div>
  );
};

export default DeskPage;
