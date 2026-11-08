import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import {
  content,
  documents,
  events,
  journal,
  localized,
  toPlainText,
} from "@repo/sal-data";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SearchForm } from "@/components/search-form";
import { PageHeader } from "@/components/section";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

interface SearchProps {
  readonly params: Promise<{ locale: Locale }>;
  readonly searchParams: Promise<{ q?: string }>;
}

/** The order results are grouped in (decisions.md). */
const KINDS: readonly Kind[] = ["piece", "event", "production", "document"];

export const generateMetadata = async ({
  params,
}: SearchProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.search" });
  return {
    ...localizedMetadata(locale, "/search", {
      description: t("lede"),
      title: t("title"),
    }),
    robots: { follow: true, index: false },
  };
};

type Kind = "event" | "piece" | "production" | "document";

const hrefFor = (
  kind: Kind,
  slug: string,
  desks: ReadonlyMap<string, string | null>
) => {
  if (kind === "event") {
    return `/events/${slug}`;
  }
  if (kind === "piece") {
    return journal.piecePath({ desk: desks.get(slug), slug });
  }
  if (kind === "production") {
    return `/company/${slug}`;
  }
  return slug;
};

/** Titles, the cover subtitle and the text of the public documents. */
const searchDocuments = async (query: string) => {
  const needle = query.toLowerCase();
  const list = await readPublished(
    ["documents"],
    async (c) =>
      (
        await Promise.all(
          (
            await documents.publicDocuments(c)
          ).map((doc) => documents.documentBySlug(c, doc.slug))
        )
      ).filter((doc): doc is documents.SalDocument => Boolean(doc)),
    [] as documents.SalDocument[]
  );
  return list
    .filter((doc) =>
      [
        doc.code,
        doc.title_en,
        doc.title_ar ?? "",
        doc.summary_en ?? "",
        toPlainText(doc.body_en),
      ].some((text) => text.toLowerCase().includes(needle))
    )
    .map((doc) => ({
      id: doc.code,
      kind: "document" as const,
      occurred_at: null,
      slug: documents.documentPath(doc.slug),
      snippet: doc.summary_en ?? "",
      title_ar: doc.title_ar ?? doc.title_en,
      title_en: doc.title_en,
    }));
};

/**
 * Search, grouped by kind, at /search?q=<words> (decisions §6: filters
 * are query strings; old /search/<words> addresses redirect).
 */
export const SearchPage = async ({ params, searchParams }: SearchProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.search" });
  const query = ((await searchParams).q ?? "").trim().slice(0, 200);
  const long = query.length >= 2;
  const found = long
    ? await readPublished(
        ["events", "journal"],
        (c) => content.search(c, query),
        []
      )
    : [];
  // A piece's address carries its section; search returns the slug only.
  const desks = new Map(
    (found ?? []).some((r) => r.kind === "piece")
      ? (await readPublished(["journal"], journal.publishedPieceSlugs, [])).map(
          (piece) => [piece.slug, piece.desk] as const
        )
      : []
  );
  const results = [
    ...(long ? await searchDocuments(query) : []),
    ...(found ?? []).filter((r) => r.kind !== "document"),
  ];

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-10 px-4 py-16">
      <PageHeader lede={t("lede")} title={t("title")}>
        <search>
          <SearchForm
            label={t("label")}
            placeholder={t("placeholder")}
            query={query}
            submit={t("submit")}
          />
        </search>
      </PageHeader>
      {query && !long ? <p className="type-body">{t("short")}</p> : null}
      {query ? null : <SearchStart locale={locale} />}
      {long ? (
        <section aria-live="polite" className="grid gap-4">
          <h2 className="type-heading">
            {results.length ? t("results", { query }) : t("none", { query })}
          </h2>
          {KINDS.map((kind) => {
            const group = results.filter((r) => r.kind === kind);
            if (group.length === 0) {
              return null;
            }
            return (
              <div className="grid gap-3" key={kind}>
                <h3 className="type-subheading">{t(`groups.${kind}`)}</h3>
                <ul className="grid gap-4">
                  {group.map((r) => (
                    <li
                      className="border-line grid gap-1 border-b pb-4"
                      key={`${r.kind}-${r.id}`}
                    >
                      {r.occurred_at ? (
                        <p className="type-label">
                          {formatLongDate(r.occurred_at, locale)}
                        </p>
                      ) : null}
                      <Link
                        className="type-subheading underline-offset-4 hover:underline"
                        href={hrefFor(r.kind as Kind, r.slug, desks)}
                      >
                        {localized(r, "title", locale)}
                      </Link>
                      {r.snippet ? (
                        <p className="type-body text-text-secondary">
                          {r.snippet}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      ) : null}
    </div>
  );
};

/**
 * Before a search (design review C9): the newest from Qirtas and what is
 * coming up, so the page opens on something to read or attend.
 */
const SearchStart = async ({ locale }: { locale: Locale }) => {
  const t = await getTranslations({ locale, namespace: "web.search" });
  const [lists, upcoming] = await Promise.all([
    Promise.all(
      journal.desks.map((desk) =>
        readPublished(
          ["journal"],
          (c) => journal.deskPieces(c, desk, { limit: 6 }),
          []
        )
      )
    ),
    readPublished(["events"], (c) => events.publicEvents(c, { limit: 6 }), []),
  ]);
  const recent = journal
    .inLanguage(lists.flat(), locale)
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))
    .slice(0, 6);
  const coming = upcoming ?? [];
  if (recent.length + coming.length === 0) {
    return null;
  }
  return (
    <div className="grid gap-10 md:grid-cols-2">
      {recent.length > 0 ? (
        <section
          aria-labelledby="search-recent"
          className="grid content-start gap-3"
        >
          <h2 className="type-heading" id="search-recent">
            {t("recent")}
          </h2>
          <ul className="border-line grid border-b">
            {recent.map((p) => (
              <li className="border-line border-t" key={p.id}>
                <Link
                  className="hover:text-accent grid gap-1 py-3"
                  href={journal.piecePath(p)}
                >
                  {p.published_at ? (
                    <span className="type-caption">
                      {formatLongDate(p.published_at, locale)}
                    </span>
                  ) : null}
                  <span className="type-subheading">
                    {localized(p, "title", locale)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {coming.length > 0 ? (
        <section
          aria-labelledby="search-coming"
          className="grid content-start gap-3"
        >
          <h2 className="type-heading" id="search-coming">
            {t("coming")}
          </h2>
          <ul className="border-line grid border-b">
            {coming.map((e) => (
              <li className="border-line border-t" key={e.id}>
                <Link
                  className="hover:text-accent grid gap-1 py-3"
                  href={`/events/${e.slug}`}
                >
                  <span className="type-caption">
                    {formatLongDate(e.starts_at, locale)}
                  </span>
                  <span className="type-subheading">
                    {localized(e, "title", locale)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
};
