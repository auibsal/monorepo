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

const SLUG = "privacy";

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { locale } = await params;
  return documentMetadata(locale, SLUG);
};

/** /privacy: the Library's "privacy" document at its own address (decisions §6). */
const PrivacyPage = async ({ params }: PageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DocumentArticle locale={locale} slug={SLUG} />;
};

export default PrivacyPage;
