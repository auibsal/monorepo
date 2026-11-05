import type { Locale } from "@repo/internationalization";
import { formatMonth } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { archiveMonths } from "@/components/qirtas/archive";
import { localizedMetadata } from "@/lib/metadata";
import { monthFrom } from "@/lib/whats-on";

interface ArchiveProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: ArchiveProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return localizedMetadata(locale, "/qirtas/archive", {
    description: t("archive.lede"),
    title: `${t("archive.title")} · ${t("title")}`,
  });
};

/** Qirtas's archive (design review A20): every month with published pieces. */
const ArchivePage = async ({ params }: ArchiveProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const months = await archiveMonths(locale);
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10">
      <header className="grid gap-2">
        <h1 className="type-display">{t("archive.title")}</h1>
        <p className="type-lede max-w-3xl">{t("archive.lede")}</p>
      </header>
      {months.length === 0 ? (
        <p className="type-body text-text-secondary">{t("noPieces")}</p>
      ) : (
        <ul className="grid border-line border-b">
          {months.map((m) => (
            <li className="border-line border-t" key={m.key}>
              <Link
                className="group flex items-baseline justify-between gap-6 py-4"
                href={`/qirtas/archive/${m.key}`}
              >
                <span className="type-title group-hover:text-accent">
                  {formatMonth(monthFrom(m.key).from, locale)}
                </span>
                <span className="type-caption text-text-secondary">
                  {t("archive.count", {
                    count: m.count,
                    n: String(m.count),
                  })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ArchivePage;
