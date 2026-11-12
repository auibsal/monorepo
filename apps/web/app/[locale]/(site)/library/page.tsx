import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { seatName } from "@/components/library/document-page";
import {
  type LibraryItem,
  LibraryList,
} from "@/components/library/library-list";
import { ManageLinks } from "@/components/manage-links";
import { PageHeader } from "@/components/section";
import { documents } from "@/lib/data";
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
  return localizedMetadata(locale, "/library", {
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

  const tk = await getTranslations({
    locale,
    namespace: "web.documents.header",
  });
  const items: LibraryItem[] = list.map((doc) => ({
    code: doc.code,
    href: documents.documentPath(doc.slug),
    keeper: doc.owner
      ? tk("keptBy", { seat: seatName(doc.owner, locale) })
      : null,
    reader: documents.readerOf(doc),
    status: t(`statuses.${doc.status as documents.DocumentStatus}`),
    summary: documents.documentSummary(doc, locale),
    title: documents.documentTitle(doc, locale),
  }));

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-16 px-4 py-16 sm:py-24">
      <PageHeader lede={t("lede")} title={t("title")}>
        {locale === "ar" ? (
          <p className="type-body text-text-secondary">{t("englishOnly")}</p>
        ) : null}
        <ManageLinks diwan="/council/library" />
      </PageHeader>
      <LibraryList
        empty={t("empty")}
        findLabel={t("find")}
        groups={documents.readers.map((key) => ({
          key,
          title: t(`readers.${key}`),
        }))}
        items={items}
        noMatch={t("noMatch")}
      />
    </div>
  );
};

export default DocumentsPage;
