import type { Locale } from "@repo/internationalization";
import { journal } from "@repo/sal-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  loadPiece,
  PieceArticle,
  pieceMetadata,
} from "@/components/qirtas/piece-page";
import { PLACEHOLDER_SLUG } from "@/lib/placeholder";

interface PieceProps {
  readonly params: Promise<{ desk: string; locale: Locale; slug: string }>;
}

// Pages are made on their first visit; the placeholder (never a real
// slug) lets the build check the route (Cache Components).
export const generateStaticParams = () =>
  journal.desks
    .filter((desk) => desk !== "games")
    .map((desk) => ({ desk, slug: PLACEHOLDER_SLUG }));
// Made on its first visit, then kept until published again.
export const instant = false;

export const generateMetadata = async ({
  params,
}: PieceProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  return pieceMetadata(locale, slug);
};

/**
 * A piece at its section's address (/qirtas/news/<slug>; the overhaul,
 * Oct 30, 2026). Under any other section it isn't found.
 */
const PiecePage = async ({ params }: PieceProps) => {
  const { desk, locale, slug } = await params;
  setRequestLocale(locale);
  const piece = await loadPiece(slug, locale);
  if (!piece) {
    notFound();
  }
  if (piece.desk !== desk) {
    notFound();
  }
  return <PieceArticle locale={locale} piece={piece} />;
};

export default PiecePage;
