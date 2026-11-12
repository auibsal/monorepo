import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DocumentArticle } from "@/components/library/document-page";
import { localizedMetadata } from "@/lib/metadata";

interface PageProps {
  readonly params: Promise<{ locale: Locale }>;
}

/** Article II of the Policy Manual (SAL-GOV-03), in either edition. */
const HEADING = /Code of Conduct|مدونة السلوك/u;

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.policies" });
  return localizedMetadata(locale, "/code-of-conduct", {
    description: t("conductLede"),
    title: t("conduct"),
  });
};

/**
 * /code-of-conduct (decisions.md, The site): the Code of Conduct, Article
 * II of the Policy Manual, at a short address with its status line.
 */
const CodeOfConductPage = async ({ params }: PageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.policies" });
  return (
    <DocumentArticle
      locale={locale}
      section={{ heading: HEADING, title: t("conduct") }}
      slug="policy-manual"
    />
  );
};

export default CodeOfConductPage;
