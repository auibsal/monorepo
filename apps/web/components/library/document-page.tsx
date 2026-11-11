import { DocumentHeader } from "@repo/brand/components/sal/document-header";
import { type Locale, localizedPath } from "@repo/internationalization";
import { formatPlainDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { documents } from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/u;

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

/** A public document's page metadata, at its own address. */
export const documentMetadata = async (
  locale: Locale,
  slug: string
): Promise<Metadata> => {
  const doc = await load(slug);
  if (!doc) {
    return {};
  }
  return localizedMetadata(locale, documents.documentPath(doc.slug), {
    description:
      documents.documentSummary(doc, locale) ||
      documents.documentTitle(doc, locale),
    title: documents.documentTitle(doc, locale),
  });
};

/** The seats that keep documents, in Arabic (the glossary's forms). */
const SEATS_AR: Record<string, string> = {
  "Artistic Director": "المدير الفني",
  "Director of Events": "مدير الفعاليات",
  "Director of Media": "مدير الإعلام",
  "Director of Membership": "مدير العضوية",
  "Director of Partnerships": "مدير الشراكات",
  "Editor-in-Chief": "رئيس التحرير",
  // Notion's older owner value reads as the seat's current name.
  "General Secretary": "أمين السر",
  President: "الرئيس",
  Secretary: "أمين السر",
  "Vice President": "نائب الرئيس",
};

/** GOV-04 to GOV-06 took effect with the site (decisions §13). */
const SITE_POLICIES = new Set(["SAL-GOV-04", "SAL-GOV-05", "SAL-GOV-06"]);
const FOUNDING = new Set(["SAL-GOV-01", "SAL-GOV-02"]);
const SITE_LAUNCH = "2026-11-08";

type Doc = NonNullable<Awaited<ReturnType<typeof load>>>;

/**
 * The one line under a document's title (decisions §13, as university
 * policy libraries do): the code, the seat that keeps it, its status and
 * the link to the other edition. No "Dated" line.
 */
const DocumentLine = async ({ doc, locale }: { doc: Doc; locale: Locale }) => {
  const t = await getTranslations({
    locale,
    namespace: "web.documents.header",
  });
  const version = String(doc.version ?? 1);
  let status: string;
  if (doc.status === "adopted" && doc.adopted_on) {
    status = t("adopted", {
      date: formatPlainDate(doc.adopted_on, locale),
      version,
    });
  } else if (SITE_POLICIES.has(doc.code)) {
    status = t("effective", {
      date: formatPlainDate(SITE_LAUNCH, locale),
      version,
    });
  } else if (FOUNDING.has(doc.code)) {
    status = t("proposedFounding", { version });
  } else {
    status = t("proposedCouncil", { version });
  }
  const other = locale === "ar" ? "en" : "ar";
  const hasOther = other === "ar" ? Boolean(doc.body_ar) : Boolean(doc.body_en);
  const keeper = doc.owner
    ? t("keptBy", {
        seat:
          locale === "ar"
            ? (SEATS_AR[doc.owner] ?? doc.owner)
            : doc.owner.replace("General Secretary", "Secretary"),
      })
    : null;
  return (
    <p className="type-caption">
      {[doc.code, keeper, status].filter(Boolean).join(" · ")}
      {hasOther ? (
        <>
          {" · "}
          <a
            className="link"
            href={localizedPath(other, documents.documentPath(doc.slug))}
            lang={other}
          >
            {t(`other.${other}`)}
          </a>
        </>
      ) : null}
    </p>
  );
};

/**
 * A public document (/library/<slug>, or GOV-04 to GOV-06 at /privacy,
 * /terms and /accessibility): its text from Notion, with its contents and
 * links to the other documents.
 */
export const DocumentArticle = async ({
  locale,
  section,
  slug,
}: {
  locale: Locale;
  /** Only one section, under its own title (the Code of Conduct). */
  section?: { heading: RegExp; title: string };
  slug: string;
}) => {
  const doc = await load(slug);
  if (!doc) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.documents" });
  const body = documents.documentBody(doc, locale);
  const others = await readPublished(
    ["documents"],
    (c) => documents.publicDocuments(c),
    []
  );
  const refs = new Map(
    others.map((other) => [
      other.code,
      {
        href: localizedPath(locale, documents.documentPath(other.slug)),
        title: documents.documentTitle(other, body.english ? "en" : locale),
      },
    ])
  );
  const pages = new Map(
    others.flatMap((other) => {
      const id = documents.notionPageId(other.notion_url);
      const ref = refs.get(other.code);
      return id && ref ? [[id, ref] as const] : [];
    })
  );
  const sections = documents.documentSections(body.html, refs, pages);
  const html = section
    ? documents.documentSection(sections.html, section.heading)
    : sections.html;
  const contents = section ? [] : sections.contents;

  return (
    <article className="mx-auto grid w-full max-w-4xl gap-10 px-4 py-16">
      <Link
        className="type-caption underline underline-offset-4"
        href="/library"
      >
        {t("all")}
      </Link>
      <DocumentHeader
        title={section?.title ?? documents.documentTitle(doc, locale)}
      >
        {!section && documents.documentSummary(doc, locale) ? (
          <p className="type-lede max-w-3xl">
            {documents.documentSummary(doc, locale)}
          </p>
        ) : null}
        <DocumentLine doc={doc} locale={locale} />
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
