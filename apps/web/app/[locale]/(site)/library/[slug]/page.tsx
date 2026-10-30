import { DocumentHeader } from "@repo/design-system/components/sal/document-header";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { documents } from "@repo/sal-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

interface DocumentProps {
  readonly params: Promise<{ locale: Locale; slug: string }>;
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Rendered on first request, then cached until a document is edited.
export const generateStaticParams = () => [];

const load = (slug: string) =>
  SLUG.test(slug)
    ? readPublished(
        ["documents"],
        async (c) => {
          const doc = await documents.documentBySlug(c, slug);
          return doc?.audience === "public" ? doc : null;
        },
        null
      )
    : Promise.resolve(null);

export const generateMetadata = async ({
  params,
}: DocumentProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  const doc = await load(slug);
  if (!doc) {
    return {};
  }
  return localizedMetadata(locale, `/library/${doc.slug}`, {
    description:
      documents.documentSummary(doc, locale) ||
      documents.documentTitle(doc, locale),
    title: documents.documentTitle(doc, locale),
  });
};

const DocumentPage = async ({ params }: DocumentProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const doc = await load(slug);
  if (!doc) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.documents" });
  const body = documents.documentBody(doc, locale);
  const { contents, html } = documents.documentSections(body.html);

  return (
    <article className="mx-auto grid w-full max-w-4xl gap-10 px-4 py-16">
      <Link
        className="type-caption underline underline-offset-4"
        href="/library"
      >
        {t("all")}
      </Link>
      <DocumentHeader title={documents.documentTitle(doc, locale)}>
        {documents.documentSummary(doc, locale) ? (
          <p className="type-lede max-w-3xl">
            {documents.documentSummary(doc, locale)}
          </p>
        ) : null}
        {doc.dated ? (
          <p className="type-caption">
            {t("dated", { date: formatLongDate(doc.dated, locale) })}
          </p>
        ) : null}
      </DocumentHeader>

      {contents.length > 0 ? (
        <nav aria-labelledby="contents" className="grid gap-3">
          <h2 className="type-heading border-line border-b pb-2" id="contents">
            {t("contents")}
          </h2>
          <ol
            className="grid gap-1 ps-6"
            dir={body.english ? "ltr" : "rtl"}
            lang={body.english ? "en" : "ar"}
          >
            {contents.map((item) => (
              <li className="type-body list-decimal" key={item.id}>
                <a
                  className="underline-offset-4 hover:underline"
                  href={`#${item.id}`}
                >
                  {item.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      {body.english && locale === "ar" ? (
        <p className="type-body text-text-secondary">{t("englishOnly")}</p>
      ) : null}
      {html ? (
        <div
          className="document-text prose max-w-none"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized by documentSections
          dangerouslySetInnerHTML={{ __html: html }}
          dir={body.english ? "ltr" : "rtl"}
          lang={body.english ? "en" : "ar"}
        />
      ) : (
        <p className="type-body">{t("noText")}</p>
      )}
    </article>
  );
};

export default DocumentPage;
