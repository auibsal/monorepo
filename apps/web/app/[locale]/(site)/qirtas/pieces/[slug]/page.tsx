import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  loadPiece,
  PieceArticle,
  pieceMetadata,
} from "@/components/waraq/piece-page";

interface PieceProps {
  readonly params: Promise<{ locale: Locale; slug: string }>;
}

export const generateMetadata = async ({
  params,
}: PieceProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  return pieceMetadata(locale, slug);
};

/**
 * A Games piece: the section's own pages are the puzzles
 * (/qirtas/games/<puzzle>), so its pieces live here. Every other piece is
 * at its section's address.
 */
const GamesPiece = async ({ params }: PieceProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const piece = await loadPiece(slug);
  if (piece?.desk !== "games") {
    notFound();
  }
  return <PieceArticle locale={locale} piece={piece} />;
};

export default GamesPiece;
