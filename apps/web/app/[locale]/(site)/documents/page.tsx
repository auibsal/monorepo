import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { documents } from "@repo/sal-data";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/section";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

interface DocumentsProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: DocumentsProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.documents" });
  return localizedMetadata(locale, "/documents", {
    description: t("lede"),
    title: t("title"),
  });
};

const DocumentsPage = async ({ params }: DocumentsProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.documents" });
  const list = await readPublished(
    ["documents"],
    (c) => documents.publicDocuments(c),
    []
  );

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-16 px-4 py-16 sm:py-24">
      <PageHeader lede={t("lede")} title={t("title")}>
        {locale === "ar" ? (
          <p className="type-body text-text-secondary">{t("englishOnly")}</p>
        ) : null}
      </PageHeader>
      {list.length === 0 ? <p className="type-body">{t("empty")}</p> : null}
      <ul className="grid gap-x-10 md:grid-cols-2">
        {list.map((doc) => (
          <li
            className="grid content-start gap-2 border-line border-t py-space-4"
            key={doc.code}
          >
            <h2 className="type-heading">
              <Link
                className="hover:text-accent"
                href={`/documents/${doc.slug}`}
              >
                {documents.documentTitle(doc, locale)}
              </Link>
            </h2>
            {documents.documentSummary(doc, locale) ? (
              <p className="type-body text-text-secondary">
                {documents.documentSummary(doc, locale)}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DocumentsPage;
