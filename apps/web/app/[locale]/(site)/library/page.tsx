import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { documents } from "@repo/sal-data";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ManageLinks } from "@/components/manage-links";
import { PageHeader, Section } from "@/components/section";
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
  const tp = await getTranslations({ locale, namespace: "web.privacy" });
  const list = await readPublished(
    ["documents"],
    (c) => documents.publicDocuments(c),
    []
  );

  const shelves = [
    {
      docs: list.filter((doc) => !documents.isWebsitePolicy(doc)),
      key: "society",
      privacy: false,
    },
    {
      docs: list.filter(documents.isWebsitePolicy),
      key: "policies",
      privacy: true,
    },
  ] as const;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-16 px-4 py-16 sm:py-24">
      <PageHeader lede={t("lede")} title={t("title")}>
        {locale === "ar" ? (
          <p className="type-body text-text-secondary">{t("englishOnly")}</p>
        ) : null}
        <ManageLinks diwan="/society/library" />
      </PageHeader>
      {shelves.map((shelf) => (
        <Section
          id={shelf.key}
          key={shelf.key}
          title={t(`shelves.${shelf.key}`)}
        >
          <ul className="grid gap-x-10 md:grid-cols-2">
            {shelf.privacy ? (
              <Entry
                href="/library/privacy"
                summary={tp("lede")}
                title={tp("title")}
              />
            ) : null}
            {shelf.docs.map((doc) => (
              <Entry
                href={`/library/${doc.slug}`}
                key={doc.code}
                summary={documents.documentSummary(doc, locale)}
                title={documents.documentTitle(doc, locale)}
              />
            ))}
          </ul>
          {shelf.docs.length === 0 && !shelf.privacy ? (
            <p className="type-body">{t("empty")}</p>
          ) : null}
        </Section>
      ))}
    </div>
  );
};

const Entry = ({
  href,
  summary,
  title,
}: {
  readonly href: string;
  readonly summary: string | null;
  readonly title: string;
}) => (
  <li className="grid content-start gap-2 border-line border-t py-space-4">
    <h3 className="type-heading">
      <Link className="hover:text-accent" href={href}>
        {title}
      </Link>
    </h3>
    {summary ? (
      <p className="type-body text-text-secondary">{summary}</p>
    ) : null}
  </li>
);

export default DocumentsPage;
