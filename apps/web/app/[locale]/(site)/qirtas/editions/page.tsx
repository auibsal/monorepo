import { Shelf } from "@repo/brand/components/sal/shelf";
import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  EditionComing,
  EditionShelfItem,
  loadEditions,
} from "@/components/waraq/editions";
import { localizedMetadata } from "@/lib/metadata";

interface EditionsProps {
  readonly params: Promise<{ locale: Locale }>;
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
 * list at /qirtas/editions/list. Before the first is published: its call
 * and Launch Night.
 */
const EditionsPage = async ({ params }: EditionsProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const editions = await loadEditions();
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10">
      <header className="grid gap-2">
        <h1 className="type-display">{t("editions")}</h1>
        <p className="type-lede max-w-3xl">{t("editionsLede")}</p>
      </header>
      {editions.length === 0 ? (
        <EditionComing locale={locale} />
      ) : (
        <Shelf
          items={editions.map((edition) => ({
            key: edition.id,
            node: <EditionShelfItem edition={edition} locale={locale} />,
          }))}
          label={t("editions")}
          listLink={
            <Link className="link" href="/qirtas/editions/list">
              {t("editionsAsList")}
            </Link>
          }
          nextLabel={t("shelfNext")}
          previousLabel={t("shelfPrevious")}
        />
      )}
    </div>
  );
};

export default EditionsPage;
