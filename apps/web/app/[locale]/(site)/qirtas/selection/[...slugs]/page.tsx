import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PieceCardView } from "@/components/qirtas/cards";
import { ShareLink } from "@/components/share";
import { journal } from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";
import { PLACEHOLDER_SLUG } from "@/lib/placeholder";
import { readPublished } from "@/lib/supabase";

// Made on its first visit (its address names a record), then kept until
// it is published again.
export const instant = false;
// The placeholder (never a real address) gives the route a shell, so a
// missing record answers 404 before anything streams.
export const generateStaticParams = () => [{ slugs: [PLACEHOLDER_SLUG] }];

interface SelectionProps {
  readonly params: Promise<{ locale: Locale; slugs: string[] }>;
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/u;

/** The pieces the address names, published and public, in its order. */
const loadSelection = async (locale: Locale, slugs: readonly string[]) => {
  if (
    slugs.length === 0 ||
    slugs.length > journal.SELECTION_MAX ||
    !slugs.every((s) => SLUG.test(s))
  ) {
    return [];
  }
  return journal.inLanguage(
    await readPublished(
      ["journal"],
      (c) => journal.gallerySelection(c, slugs),
      []
    ),
    locale
  );
};

export const generateMetadata = async ({
  params,
}: SelectionProps): Promise<Metadata> => {
  const { locale, slugs } = await params;
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return {
    ...localizedMetadata(locale, `/qirtas/selection/${slugs.join("/")}`, {
      description: t("selection.lede"),
      title: t("selection.title"),
    }),
    // Any reader can make one: worth sharing, not worth indexing.
    robots: { follow: true, index: false },
  };
};

/**
 * A selection from the Gallery (design review A10): a reader's choice of
 * pieces, shared by its address. Nothing is stored and nobody signs in;
 * the address is the selection.
 */
const SelectionPage = async ({ params }: SelectionProps) => {
  const { locale, slugs } = await params;
  setRequestLocale(locale);
  const pieces = await loadSelection(locale, slugs);
  if (pieces.length === 0) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10">
      <header className="grid gap-2">
        <h1 className="type-display">{t("selection.title")}</h1>
        <p className="type-lede max-w-3xl">{t("selection.lede")}</p>
        <p className="type-caption flex flex-wrap gap-x-5">
          <ShareLink title={t("selection.title")} />
          <Link className="link" href="/qirtas/gallery">
            {t("selection.makeYours")}
          </Link>
        </p>
      </header>
      <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
        {pieces.map((piece) => (
          <li key={piece.id}>
            <PieceCardView heading="h2" image locale={locale} piece={piece} />
          </li>
        ))}
      </ol>
    </div>
  );
};

export default SelectionPage;
