import type { Locale } from "@repo/internationalization";
import { formatMonth, zonedYearMonth } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import { PieceCardView } from "@/components/qirtas/cards";
import { journal } from "@/lib/data";
import { readPublished } from "@/lib/supabase";
import { type Month, monthParam } from "@/lib/whats-on";

/** The months that have published pieces in this language, newest first. */
export const archiveMonths = async (locale: Locale) => {
  const dates = journal.inLanguage(
    await readPublished(["journal"], (c) => journal.publishedDates(c), []),
    locale
  );
  const months = new Map<string, number>();
  for (const row of dates) {
    if (!row.published_at) {
      continue;
    }
    const { monthIndex, year } = zonedYearMonth(row.published_at);
    const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
    months.set(key, (months.get(key) ?? 0) + 1);
  }
  return [...months.entries()].map(([key, count]) => ({ count, key }));
};

/** A month of the archive, and a section within it, as query strings. */
export const archivePath = (month: string, section?: string) => {
  const query = new URLSearchParams({ month });
  if (section) {
    query.set("section", section);
  }
  return `/qirtas/archive?${query.toString()}`;
};

/**
 * A month of Qirtas: /qirtas/archive?month=<yyyy-mm>, every section, or
 * with &section=<section>, one. Each section's
 * pieces under its name, newest first, with the other sections that month
 * as links.
 */
export const ArchiveMonth = async ({
  desk,
  locale,
  month,
}: {
  desk: journal.Desk | null;
  locale: Locale;
  month: Month;
}) => {
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const pieces = journal.inLanguage(
    await readPublished(
      ["journal"],
      (c) => journal.piecesBetween(c, month.from, month.to),
      []
    ),
    locale
  );
  const key = monthParam(month);
  const present = journal.desks.filter((d) => pieces.some((p) => p.desk === d));
  const shown = desk ? [desk] : present;
  const title = formatMonth(month.from, locale);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10">
      <header className="grid gap-3">
        <h1 className="type-display">
          {desk === null ? title : `${t(`desks.${desk}`)} · ${title}`}
        </h1>
        <p className="type-caption">
          <Link className="link" href="/qirtas/archive">
            {t("archive.all")}
          </Link>
        </p>
      </header>
      {present.length > 1 ? (
        <nav aria-label={t("archive.sections")}>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>
              <Link
                aria-current={desk ? undefined : "page"}
                className="link aria-[current=page]:font-medium aria-[current=page]:no-underline"
                href={archivePath(key)}
              >
                {t("archive.everySection")}
              </Link>
            </li>
            {present.map((d) => (
              <li key={d}>
                <Link
                  aria-current={desk === d ? "page" : undefined}
                  className="link aria-[current=page]:font-medium aria-[current=page]:no-underline"
                  href={archivePath(key, d)}
                >
                  {t(`desks.${d}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      {shown.every((d) => !pieces.some((p) => p.desk === d)) ? (
        <p className="type-body text-text-secondary">{t("noPieces")}</p>
      ) : null}
      {shown.map((d) => {
        const inDesk = pieces.filter((p) => p.desk === d);
        return inDesk.length === 0 ? null : (
          <section
            aria-labelledby={`archive-${d}`}
            className="grid gap-4"
            key={d}
          >
            <h2
              className="type-label border-text border-b pb-2"
              id={`archive-${d}`}
            >
              {t(`desks.${d}`)}
            </h2>
            <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {inDesk.map((piece) => (
                <li key={piece.id}>
                  <PieceCardView heading="h3" locale={locale} piece={piece} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
};
