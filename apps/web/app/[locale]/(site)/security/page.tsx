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

/** SAL-GOV-07, the Vulnerability Disclosure Policy, in the Library. */
const SLUG = "security";

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { locale } = await params;
  return documentMetadata(locale, SLUG);
};

/**
 * /security (decisions.md, The site): the Vulnerability Disclosure Policy
 * (SAL-GOV-07) at its own address, the page security.txt points to. Its
 * effective date ("the day it is published") is the document's own line.
 */
const SecurityPage = async ({ params }: PageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DocumentArticle locale={locale} slug={SLUG} />;
};

export default SecurityPage;
