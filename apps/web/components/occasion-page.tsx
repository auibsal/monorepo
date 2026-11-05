import type { Locale } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { events, localized } from "@repo/sal-data";
import { getTranslations } from "next-intl/server";
import { Section } from "@/components/section";
import type { Series } from "@/components/series";
import { readPublished } from "@/lib/supabase";

/**
 * The Society's occasions, each a page under its program (the design
 * review A34, A36; owner, Nov 5, 2026): Book Circle's Friday on
 * al-Mutanabbi Street, shown only once Student Life's approval is on
 * record, and Open Pages' worst-poem contest.
 */

export const loadOccasion = (occasion: events.Occasion) =>
  readPublished(["events"], (c) => events.occasionEvents(c, occasion), {
    coming: [],
    past: [],
  });

type Row = Awaited<ReturnType<typeof events.occasionEvents>>["coming"][number];

/** A trip shows only with an approval (the database publishes none without). */
const shown = (occasion: events.Occasion, rows: readonly Row[]) =>
  occasion === "book_street_trip"
    ? rows.filter((e) => e.student_life_approved_on)
    : rows;

/** Whether the occasion has a page to show: the trip only once approved. */
export const occasionVisible = async (occasion: events.Occasion) => {
  if (occasion === "worst_poem_contest") {
    return true;
  }
  const { coming, past } = await loadOccasion(occasion);
  return shown(occasion, [...coming, ...past]).length > 0;
};

const When = ({ event, locale }: { event: Row; locale: Locale }) => (
  <>
    {formatLongDate(event.starts_at, locale)},{" "}
    {formatClock(event.starts_at, locale)}
    {event.ends_at ? `–${formatClock(event.ends_at, locale)}` : ""}
  </>
);

export const OccasionPage = async ({
  locale,
  occasion,
  series,
}: {
  readonly locale: Locale;
  readonly occasion: events.Occasion;
  readonly series: Series;
}) => {
  const t = await getTranslations({
    locale,
    namespace: `web.programs.occasions.${occasion}`,
  });
  const tc = await getTranslations({
    locale,
    namespace: "web.programs.occasions",
  });
  const loaded = await loadOccasion(occasion);
  const coming = shown(occasion, loaded.coming);
  const past = shown(occasion, loaded.past);
  const rules = t.raw("rules") as string[];
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-12 px-4 py-16 sm:py-24">
      <header className="grid gap-4">
        <h1 className="type-display text-balance">{t("title")}</h1>
        <p className="type-lede max-w-prose">{t("lede")}</p>
        <p>
          <Link className="link" href={`/events/${series.slug}`}>
            {localized(series, "name", locale)}
          </Link>
        </p>
      </header>
      <Section id="next" title={tc("next")}>
        {coming.length > 0 ? (
          <ul className="grid border-line border-b">
            {coming.map((event) => (
              <li
                className="grid gap-1 border-line border-t py-4"
                key={event.id}
              >
                <Link
                  className="link type-heading font-light"
                  href={`/events/${event.slug}`}
                >
                  {localized(event, "title", locale)}
                </Link>
                <span className="type-body">
                  <When event={event} locale={locale} />
                </span>
                {localized(event, "venue", locale) ? (
                  <span className="type-caption text-text-secondary">
                    {localized(event, "venue", locale)}
                  </span>
                ) : null}
                {event.student_life_approved_on ? (
                  <span className="type-caption text-text-secondary">
                    {tc("approved", {
                      date: formatLongDate(
                        event.student_life_approved_on,
                        locale
                      ),
                    })}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="type-body text-text-secondary">{t("none")}</p>
        )}
      </Section>
      <Section id="how" title={tc("how")}>
        <ul className="grid max-w-prose gap-3">
          {rules.map((rule) => (
            <li className="type-body border-line border-t pt-3" key={rule}>
              {rule}
            </li>
          ))}
        </ul>
      </Section>
      {past.length > 0 ? (
        <Section id="past" title={tc("past")}>
          <ul className="grid border-line border-b">
            {past.map((event) => (
              <li
                className="grid gap-1 border-line border-t py-3 sm:grid-cols-[12rem_1fr] sm:gap-x-6"
                key={event.id}
              >
                <span className="type-caption text-text-secondary">
                  {formatLongDate(event.starts_at, locale)}
                </span>
                <Link className="link" href={`/events/${event.slug}`}>
                  {localized(event, "title", locale)}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
};

/** On the program's page: one line to the occasion's page, when it shows. */
export const OccasionLine = async ({
  locale,
  occasion,
}: {
  readonly locale: Locale;
  readonly occasion: events.Occasion;
}) => {
  if (!(await occasionVisible(occasion))) {
    return null;
  }
  const t = await getTranslations({
    locale,
    namespace: `web.programs.occasions.${occasion}`,
  });
  return (
    <p className="type-body">
      <Link className="link" href={events.occasionPath(occasion)}>
        {t("title")}
      </Link>{" "}
      <span className="text-text-secondary">{t("short")}</span>
    </p>
  );
};
