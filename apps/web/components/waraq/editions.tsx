import { SectionHead } from "@repo/design-system/components/sal/section-head";
import type { Locale } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { journal, localized } from "@repo/sal-data";
import { getTranslations } from "next-intl/server";
import { mediaUrl } from "@/lib/media";
import { readPublished } from "@/lib/supabase";

export type Edition = NonNullable<
  Awaited<ReturnType<typeof journal.publishedIssues>>
>[number];

/** The published Editions, newest first. */
export const loadEditions = async () =>
  (
    await readPublished(
      ["journal"],
      async (c) => (await journal.publishedIssues(c)) ?? [],
      []
    )
  ).filter((e) => e.status === "published" && e.published_at);

/**
 * An Edition's cover (owner, Nov 4, 2026, D5): the scan or photo of the
 * printed Edition, or, without one, a plain typographic cover: the paper's
 * name and the number, inside a hairline (the title is printed under it). Never a drawn 3D book.
 */
export const EditionCover = async ({
  edition,
  locale,
}: {
  edition: Edition;
  locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const cover = mediaUrl(edition.cover_path);
  if (cover) {
    return (
      // biome-ignore lint/performance/noImgElement: a published image from the media bucket
      <img
        alt={t("coverAlt")}
        className="aspect-[3/4] w-full object-cover"
        height={800}
        loading="lazy"
        src={cover}
        width={600}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="grid aspect-[3/4] w-full content-between border border-line bg-surface p-space-4"
    >
      <span className="font-medium text-2xl tracking-tight">{t("title")}</span>
      <span className="type-title">
        {t("editionNumber", { number: String(edition.number) })}
      </span>
    </span>
  );
};

/** One Edition on the shelf: its cover, title and season, as one link. */
export const EditionShelfItem = async ({
  edition,
  locale,
}: {
  edition: Edition;
  locale: Locale;
}) => (
  <Link className="group grid gap-2" href={`/qirtas/editions/${edition.slug}`}>
    <EditionCover edition={edition} locale={locale} />
    <span className="type-heading group-hover:underline">
      {localized(edition, "title", locale)}
    </span>
    {localized(edition, "season", locale) ? (
      <span className="type-caption text-text-secondary">
        {localized(edition, "season", locale)}
      </span>
    ) : null}
  </Link>
);

/**
 * Before the first Edition is published (design review C11): the Edition's
 * open or coming calls and its Launch Night, from their records alone.
 */
export const EditionComing = async ({ locale }: { locale: Locale }) => {
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const [open, upcoming] = await Promise.all([
    readPublished(["journal"], (c) => journal.editionCalls(c), []),
    readPublished(["journal"], (c) => journal.upcomingCalls(c), []),
  ]);
  const calls = [
    ...(open ?? []),
    ...(upcoming ?? []).filter((call) => call.issue_id),
  ];
  const issueIds = [
    ...new Set(calls.map((call) => call.issue_id).filter(Boolean)),
  ] as string[];
  const launches = (
    await Promise.all(
      issueIds.map((id) =>
        readPublished(
          ["journal", "events"],
          (c) => journal.editionLaunch(c, id),
          null
        )
      )
    )
  ).filter((event) => event !== null);
  if (calls.length === 0 && launches.length === 0) {
    return <p className="type-body text-text-secondary">{t("noEditions")}</p>;
  }
  const now = Date.now();
  return (
    <div className="grid gap-12">
      {calls.length > 0 ? (
        <section aria-labelledby="edition-calls" className="grid gap-4">
          <SectionHead
            size="heading"
            title={t("calls")}
            titleId="edition-calls"
          />
          <p className="type-body max-w-[60ch]">{t("comingLede")}</p>
          <ul className="grid">
            {calls.map((call) => (
              <li
                className="grid gap-1 border-line border-t py-space-4"
                key={call.id}
              >
                <span className="type-subheading">
                  {localized(call, "title", locale)}
                </span>
                <span className="type-caption text-text-secondary">
                  {new Date(call.opens_at).getTime() <= now
                    ? t("closes", {
                        date: formatLongDate(call.closes_at, locale),
                      })
                    : t("opensCloses", {
                        closes: formatLongDate(call.closes_at, locale),
                        opens: formatLongDate(call.opens_at, locale),
                      })}
                </span>
              </li>
            ))}
          </ul>
          <Link className="link justify-self-start" href="/qirtas/write">
            {t("writeForEdition")}
          </Link>
        </section>
      ) : null}
      {launches.length > 0 ? (
        <section aria-labelledby="launch-night" className="grid gap-4">
          <SectionHead
            size="heading"
            title={t("launchTitle")}
            titleId="launch-night"
          />
          <ul className="grid">
            {launches.map((event) => (
              <li className="border-line border-t py-space-4" key={event.id}>
                <Link
                  className="group grid gap-1"
                  href={`/events/${event.slug}`}
                >
                  <span className="type-subheading group-hover:underline">
                    {localized(event, "title", locale)}
                  </span>
                  <span className="type-caption text-text-secondary">
                    {[
                      `${formatLongDate(event.starts_at, locale)}, ${formatClock(event.starts_at, locale)}`,
                      localized(event, "venue", locale),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
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
