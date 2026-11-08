import { SectionHead } from "@repo/brand/components/sal/section-head";
import type { Locale } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { journal, localized } from "@repo/sal-data";
import { getTranslations } from "next-intl/server";
import { ViewTransition } from "react";
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
 * An Edition's cover (decisions.md, D5): the scan or photo of the
 * printed Edition, or, without one, a plain typographic cover: the paper's
 * name and the number, inside a hairline (the title is printed under it). Never a drawn 3D book.
 */
export const EditionCover = async ({
  edition,
  locale,
}: {
  edition: Edition;
  locale: Locale;
}) => (
  // The same cover on the shelf and on the Edition's page: where the
  // browser can, it moves from one to the other (design review A3; native
  // view transitions, nothing when unsupported or with reduced motion).
  <ViewTransition default="none" name={`edition-${edition.id}`} share="morph">
    <CoverArt edition={edition} locale={locale} />
  </ViewTransition>
);

const CoverArt = async ({
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
      className="border-line bg-surface p-space-4 grid aspect-[3/4] w-full content-between border"
    >
      <span className="text-2xl font-medium tracking-tight">{t("title")}</span>
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
 * Before the first Edition is published (design review C11): its launch
 * event, once it is on the calendar. There are no calls (decisions §5).
 */
export const EditionComing = async ({ locale }: { locale: Locale }) => {
  const t = await getTranslations({ locale, namespace: "web.journal" });
  // The Edition draws from published work (decisions §5): no calls; the
  // coming Edition's launch shows here once it is on the calendar.
  const issueIds = await readPublished(
    ["journal"],
    (c) => journal.comingEditionIds(c),
    []
  );
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
  if (launches.length === 0) {
    return <p className="type-body text-text-secondary">{t("noEditions")}</p>;
  }
  return (
    <div className="grid gap-12">
      {launches.length > 0 ? (
        <section aria-labelledby="launch-night" className="grid gap-4">
          <SectionHead
            size="heading"
            title={t("launchTitle")}
            titleId="launch-night"
          />
          <ul className="grid">
            {launches.map((event) => (
              <li className="border-line py-space-4 border-t" key={event.id}>
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
