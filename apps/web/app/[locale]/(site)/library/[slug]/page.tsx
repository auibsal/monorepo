import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  DocumentArticle,
  documentMetadata,
} from "@/components/library/document-page";
import { documents } from "@/lib/data";
import { PLACEHOLDER_SLUG } from "@/lib/placeholder";

interface DocumentProps {
  readonly params: Promise<{ locale: Locale; slug: string }>;
}

// Rendered on first request, then cached until a document is edited.
// Pages are made on their first visit; the placeholder (never a real
// slug) lets the build check the route (Cache Components).
export const generateStaticParams = () => [{ slug: PLACEHOLDER_SLUG }];
// Made on its first visit, then kept until published again.
export const instant = false;

export const generateMetadata = async ({
  params,
}: DocumentProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  return documentMetadata(locale, slug);
};

/**
 * A document in the Library. GOV-04 to GOV-06 have their own addresses
 * (/privacy, /terms, /accessibility); here they are not found, so each
 * lives at one address.
 */
const DocumentPage = async ({ params }: DocumentProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  if (documents.OWN_ADDRESSES[slug]) {
    notFound();
  }
  return <DocumentArticle locale={locale} slug={slug} />;
};

export default DocumentPage;
