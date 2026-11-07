import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import {
  DocumentArticle,
  documentMetadata,
} from "@/components/library/document-page";

interface PageProps {
  readonly params: Promise<{ locale: Locale }>;
}

const SLUG = "terms-of-use";

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { locale } = await params;
  return documentMetadata(locale, SLUG);
};

/** /terms: the Library's "terms-of-use" document at its own address (decisions §6). */
const TermsPage = async ({ params }: PageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DocumentArticle locale={locale} slug={SLUG} />;
};

export default TermsPage;
