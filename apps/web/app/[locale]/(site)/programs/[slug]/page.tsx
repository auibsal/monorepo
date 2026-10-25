import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { events, localized, programmes } from "@repo/sal-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { type DatedItem, DatedList } from "@/components/event-list";
import { PageHeader, Section } from "@/components/section";
import { rowHref, wayOf } from "@/components/whats-on";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

interface SeriesProps {
  readonly params: Promise<{ locale: Locale; slug: string }>;
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const AHEAD_DAYS = 180;

// Rendered on first request, then cached until a program or event changes.
export const generateStaticParams = () => [];

const load = async (slug: string) => {
  if (!SLUG.test(slug)) {
    return null;
  }
  const all: Awaited<ReturnType<typeof programmes.programmes>> =
    await readPublished(["programmes"], (c) => programmes.programmes(c), []);
  return (all ?? []).find((p) => p.slug === slug && p.is_active) ?? null;
};

export const generateMetadata = async ({
  params,
}: SeriesProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  const series = await load(slug);
  if (!series) {
    return {};
  }
  return localizedMetadata(locale, `/programs/${series.slug}`, {
    description: localized(series, "summary", locale),
    title: localized(series, "name", locale),
  });
};

/** A program as a series: what it is, and its coming dates. */
const SeriesPage = async ({ params }: SeriesProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const series = await load(slug);
  if (!series) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.events" });
  // To the hour, so the read is cached between requests.
  const now = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000);
  const rows = await readPublished(
    ["events"],
    (c) =>
      events.calendar(
        c,
        now,
        new Date(now.getTime() + AHEAD_DAYS * 86_400_000)
      ),
    []
  );
  const items: DatedItem[] = rows
    .filter((row) => row.programme_id === series.id)
    .map((row) => ({
      at: row.starts_at,
      href: rowHref(row),
      key: row.id,
      line: t(`ways.${wayOf(row)}`),
      place: row.teaser ? null : localized(row, "venue", locale),
      title: localized(row, "title", locale),
    }));

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-20 px-4 py-16 sm:py-24">
      <PageHeader
        lede={localized(series, "summary", locale)}
        title={localized(series, "name", locale)}
      />
      <Section
        action={
          <Link
            className="link type-caption"
            href={{ pathname: "/events", query: { series: series.slug } }}
          >
            {t("inCalendar")}
          </Link>
        }
        id="dates"
        title={t("dates")}
      >
        {items.length === 0 ? (
          <p className="type-body text-text-secondary">{t("noDates")}</p>
        ) : (
          <DatedList items={items} locale={locale} />
        )}
      </Section>
    </div>
  );
};

export default SeriesPage;
