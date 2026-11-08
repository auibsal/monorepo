import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  loadPiece,
  PieceArticle,
  pieceMetadata,
} from "@/components/qirtas/piece-page";
import { PLACEHOLDER_SLUG } from "@/lib/placeholder";

// Made on its first visit (its address names a record), then kept until
// it is published again.
export const instant = false;
// The placeholder (never a real address) gives the route a shell, so a
// missing record answers 404 before anything streams.
export const generateStaticParams = () => [{ slug: PLACEHOLDER_SLUG }];

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
  const piece = await loadPiece(slug, locale);
  if (piece?.desk !== "games") {
    notFound();
  }
  return <PieceArticle locale={locale} piece={piece} />;
};

export default GamesPiece;
