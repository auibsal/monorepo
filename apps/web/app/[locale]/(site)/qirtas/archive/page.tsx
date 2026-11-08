import type { Locale } from "@repo/internationalization";
import { formatMonth } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { journal } from "@repo/sal-data";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ArchiveMonth,
  archiveMonths,
  archivePath,
} from "@/components/qirtas/archive";
import { localizedMetadata } from "@/lib/metadata";
import { roughlyNow } from "@/lib/this-year";
import { isMonthSegment, monthFrom } from "@/lib/whats-on";

// Its query string decides what it shows, so it renders per request.
export const instant = false;

interface ArchiveProps {
  readonly params: Promise<{ locale: Locale }>;
  readonly searchParams: Promise<{ month?: string; section?: string }>;
}

const isDesk = (value: unknown): value is journal.Desk =>
  (journal.desks as readonly unknown[]).includes(value);

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

/**
 * Qirtas's archive: every month with published pieces; a month, and a
 * section within it, are query strings (/qirtas/archive?month=2026-11&
 * section=news, decisions §6).
 */
const ArchivePage = async ({ params, searchParams }: ArchiveProps) => {
  const now = new Date(await roughlyNow());
  const { locale } = await params;
  const { month, section } = await searchParams;
  setRequestLocale(locale);
  if (month && isMonthSegment(month)) {
    return (
      <ArchiveMonth
        desk={isDesk(section) ? section : null}
        locale={locale}
        month={monthFrom(month, now)}
      />
    );
  }
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
        <ul className="border-line grid border-b">
          {months.map((m) => (
            <li className="border-line border-t" key={m.key}>
              <Link
                className="group flex items-baseline justify-between gap-6 py-4"
                href={archivePath(m.key)}
              >
                <span className="type-title group-hover:text-accent">
                  {formatMonth(monthFrom(m.key, now).from, locale)}
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
