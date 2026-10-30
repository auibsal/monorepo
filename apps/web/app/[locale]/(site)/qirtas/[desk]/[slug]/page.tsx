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
  readonly params: Promise<{ desk: string; locale: Locale; slug: string }>;
}

export const generateStaticParams = () => [];

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
  const piece = await loadPiece(slug);
  if (!piece) {
    notFound();
  }
  if (piece.desk !== desk) {
    notFound();
  }
  return <PieceArticle locale={locale} piece={piece} />;
};

export default PiecePage;
