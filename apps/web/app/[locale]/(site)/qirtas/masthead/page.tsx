import type { Locale } from "@repo/internationalization";
import { journal, localized } from "@repo/sal-data";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

interface MastheadProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: MastheadProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return localizedMetadata(locale, "/qirtas/masthead", {
    description: t("masthead.lede"),
    title: `${t("masthead.title")} · ${t("title")}`,
  });
};

/**
 * Qirtas's masthead (decisions.md): who makes the paper, from the
 * roles they hold (`journal.masthead()`), never typed. One row per seat,
 * the Editor-in-Chief first; a person in two seats is on two rows.
 */
const MastheadPage = async ({ params }: MastheadProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const people = await readPublished(
    ["journal"],
    (c) => journal.masthead(c),
    []
  );
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-10">
      <header className="grid gap-2">
        <h1 className="type-display">{t("masthead.title")}</h1>
        <p className="type-lede">{t("masthead.lede")}</p>
      </header>
      {people.length === 0 ? (
        <p className="type-body text-text-secondary">{t("masthead.empty")}</p>
      ) : (
        <dl className="grid">
          {people.map((p) => (
            <div
              className="grid gap-1 border-line border-t py-4 sm:grid-cols-[1fr_1.4fr] sm:gap-6"
              key={`${p.role}-${p.full_name_en}`}
            >
              <dt className="type-caption font-medium uppercase tracking-wider">
                {localized(p, "title", locale)}
              </dt>
              <dd className="type-heading">
                {localized(p, "full_name", locale)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
};

export default MastheadPage;
