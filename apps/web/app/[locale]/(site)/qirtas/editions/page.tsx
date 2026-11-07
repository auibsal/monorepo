import { Shelf } from "@repo/brand/components/sal/shelf";
import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { localized } from "@repo/sal-data";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import {
  EditionComing,
  EditionShelfItem,
  loadEditions,
} from "@/components/qirtas/editions";
import { localizedMetadata } from "@/lib/metadata";

interface EditionsProps {
  readonly params: Promise<{ locale: Locale }>;
  readonly searchParams: Promise<{ view?: string }>;
}

export const generateMetadata = async ({
  params,
}: EditionsProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return localizedMetadata(locale, "/qirtas/editions", {
    description: t("editionsLede"),
    title: `${t("editions")} · ${t("title")}`,
  });
};

/**
 * The Editions on a shelf (owner, Nov 4, 2026; design review C11): each
 * printed Edition's cover, newest first, with the same Editions as a plain
 * list (a view, ?view=list, decisions §6). Before the first is published:
 * its call and its launch event.
 */
const EditionsPage = async ({ params, searchParams }: EditionsProps) => {
  const { locale } = await params;
  const asList = (await searchParams).view === "list";
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const editions = await loadEditions();
  let body: ReactNode = <EditionComing locale={locale} />;
  if (editions.length > 0 && asList) {
    body = (
      <div className="grid gap-4">
        <ul className="grid">
          {editions.map((edition) => (
            <li className="border-line border-t py-space-4" key={edition.id}>
              <Link
                className="group grid gap-1"
                href={`/qirtas/editions/${edition.slug}`}
              >
                <span className="type-heading group-hover:underline">
                  {localized(edition, "title", locale)}
                </span>
                <span className="type-caption text-text-secondary">
                  {[
                    t("editionNumber", { number: String(edition.number) }),
                    localized(edition, "season", locale),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link className="link justify-self-start" href="/qirtas/editions">
          {t("editionsOnShelf")}
        </Link>
      </div>
    );
  } else if (editions.length > 0) {
    body = (
      <Shelf
        items={editions.map((edition) => ({
          key: edition.id,
          node: <EditionShelfItem edition={edition} locale={locale} />,
        }))}
        label={t("editions")}
        listLink={
          <Link className="link" href="/qirtas/editions?view=list">
            {t("editionsAsList")}
          </Link>
        }
        nextLabel={t("shelfNext")}
        previousLabel={t("shelfPrevious")}
      />
    );
  }
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10">
      <header className="grid gap-2">
        <h1 className="type-display">{t("editions")}</h1>
        <p className="type-lede max-w-3xl">{t("editionsLede")}</p>
      </header>
      {body}
    </div>
  );
};

export default EditionsPage;
