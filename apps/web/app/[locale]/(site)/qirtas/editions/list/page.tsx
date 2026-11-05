import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { localized } from "@repo/sal-data";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EditionComing, loadEditions } from "@/components/waraq/editions";
import { localizedMetadata } from "@/lib/metadata";

interface EditionListProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: EditionListProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return localizedMetadata(locale, "/qirtas/editions/list", {
    description: t("editionsLede"),
    title: `${t("editions")} · ${t("title")}`,
  });
};

/** The Editions as a plain list: the shelf's content, nothing to scroll. */
const EditionListPage = async ({ params }: EditionListProps) => {
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
      )}
    </div>
  );
};

export default EditionListPage;
