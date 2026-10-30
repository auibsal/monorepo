import type { Locale } from "@repo/internationalization";
import { localizedPath } from "@repo/internationalization";
import { notFound, permanentRedirect } from "next/navigation";
import { pieceHref } from "@/components/waraq/cards";
import { loadPiece, PieceArticle } from "@/components/waraq/piece-page";

interface PieceProps {
  readonly params: Promise<{ locale: Locale; slug: string }>;
}

/**
 * The address pieces had before the overhaul (/qirtas/pieces/<slug>), kept
 * so links in old emails, posts and the bot still open: it sends the reader
 * on to the piece's section address. Games pieces are shown here.
 */
const OldPieceAddress = async ({ params }: PieceProps) => {
  const { locale, slug } = await params;
  const piece = await loadPiece(slug);
  if (!piece) {
    notFound();
  }
  if (piece.desk === "games") {
    return <PieceArticle locale={locale} piece={piece} />;
  }
  permanentRedirect(localizedPath(locale, pieceHref(piece)));
};

export default OldPieceAddress;
