import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { journal, localized } from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

interface CorrectionsProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: CorrectionsProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return localizedMetadata(locale, "/qirtas/corrections", {
    description: t("correctionsLog.lede"),
    title: `${t("correctionsLog.title")} · ${t("title")}`,
  });
};

/**
 * The public corrections log (decisions.md, Qirtas): every correction made
 * in place on a published piece, dated, newest first, each with its piece.
 */
const CorrectionsPage = async ({ params }: CorrectionsProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const corrections = await readPublished(
    ["journal"],
    (c) => journal.correctionsLog(c),
    []
  );
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-10">
      <header className="grid gap-2">
        <h1 className="type-display">{t("correctionsLog.title")}</h1>
        <p className="type-lede">{t("correctionsLog.lede")}</p>
      </header>
      {corrections.length === 0 ? (
        <p className="type-body text-text-secondary">
          {t("correctionsLog.empty")}
        </p>
      ) : (
        <ul className="border-line grid border-b">
          {corrections.map((c) => (
            <li className="border-line grid gap-1 border-t py-4" key={c.id}>
              <Link
                className="type-subheading hover:text-accent"
                dir="auto"
                href={journal.piecePath(c.piece)}
                lang={c.piece.language === "ar" ? "ar" : "en"}
              >
                {localized(c.piece, "title", locale)}
              </Link>
              <p className="type-body">
                {localized(
                  {
                    note_ar: c.note_ar ?? c.note_en ?? "",
                    note_en: c.note_en ?? c.note_ar ?? "",
                  },
                  "note",
                  locale
                )}
              </p>
              <p className="type-caption text-text-secondary">
                {formatLongDate(c.created_at, locale, true)}
              </p>
            </li>
          ))}
        </ul>
      )}
      <Link className="link type-caption" href="/library/editorial-standards">
        {t("correctionsPolicy")}
      </Link>
    </div>
  );
};

export default CorrectionsPage;
