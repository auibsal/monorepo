import { Icon, type IconName } from "@repo/brand/components/sal/icon";
import { project } from "@repo/config";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { env } from "@/env";
import { events } from "@/lib/data";
import { classesText } from "./event-classes";
import { PlacesLeft } from "./places-left";

const DAY = 86_400_000;

interface GoodToKnowEvent {
  access_detail_ar: string | null;
  access_detail_en: string | null;
  accommodation_by: string | null;
  allergens: string[];
  capacity: number | null;
  classes: string[];
  content_note_ar: string | null;
  content_note_en: string | null;
  entry: string;
  id: string;
  language: string | null;
  no_photos: boolean;
  off_campus: boolean;
  other_allergens_ar: string | null;
  other_allergens_en: string | null;
  seating: string | null;
  served_ar: string | null;
  served_en: string | null;
  serves_food: boolean;
  starts_at: string;
  step_free: boolean | null;
}

interface Row {
  icon: IconName;
  key: string;
  label: string;
  text: ReactNode;
}

type Pair = "access_detail" | "content_note" | "other_allergens" | "served";

/** A field in the page's own language only (one language per page). */
const own = (event: GoodToKnowEvent, field: Pair, locale: Locale) =>
  (locale === "ar" ? event[`${field}_ar`] : event[`${field}_en`]) ?? "";

const SEATING = ["seated", "standing", "mixed"] as const;
const isSeating = (value: string | null): value is (typeof SEATING)[number] =>
  (SEATING as readonly (string | null)[]).includes(value);

/** The day to ask for an accommodation by: set, or three days before. */
const accommodationDay = (event: GoodToKnowEvent) =>
  event.accommodation_by
    ? `${event.accommodation_by}T12:00:00+03:00`
    : new Date(new Date(event.starts_at).getTime() - 3 * DAY).toISOString();

/** Food and drink: what is served, then "Contains:" and its allergens. */
const foodText = async (event: GoodToKnowEvent, locale: Locale) => {
  const t = await getTranslations({
    locale,
    namespace: "web.events.goodToKnow",
  });
  const list = new Intl.ListFormat(locale === "ar" ? "ar" : "en-US", {
    type: "conjunction",
  });
  const named = event.allergens
    .filter(events.isAllergen)
    .map((a) => t(`allergens.${a}`));
  const other = own(event, "other_allergens", locale);
  const allergens = other ? [...named, other] : named;
  const served = own(event, "served", locale) || t("food.served");
  return allergens.length > 0
    ? `${served}. ${t("food.contains", { allergens: list.format(allergens) })}`
    : served;
};

/** Access: step-free or not, the seating, and the day to ask by. */
const accessText = async (event: GoodToKnowEvent, locale: Locale) => {
  const t = await getTranslations({
    locale,
    namespace: "web.events.goodToKnow.access",
  });
  const parts: string[] = [];
  if (event.step_free !== null) {
    parts.push(event.step_free ? t("stepFree") : t("notStepFree"));
  }
  if (isSeating(event.seating)) {
    parts.push(t(`seating.${event.seating}`));
  }
  const ask = t("accommodation", {
    date: formatLongDate(accommodationDay(event), locale),
  });
  const detail = own(event, "access_detail", locale);
  return (
    <>
      {parts.length > 0 ? `${parts.join(" · ")}. ` : null}
      {detail ? `${detail} ` : null}
      <a className="link" href={`mailto:${project.mailboxes.hello}`}>
        {ask}
      </a>
    </>
  );
};

/**
 * Who can come and how (decisions.md, Events: Access): "Everyone",
 * "Members only" or the classes ticked, or "Invited only"; then Open or
 * Booking required; and, on campus when Guests may come, the day their
 * booking closes.
 */
const whoCanCome = async (event: GoodToKnowEvent, locale: Locale) => {
  const t = await getTranslations({
    locale,
    namespace: "web.events.goodToKnow.who",
  });
  if (event.entry === "invite") {
    return t("invite");
  }
  const how = t(event.entry === "open" ? "how.open" : "how.rsvp");
  const guestsBy = events.guestsBookBy(event);
  return [
    await classesText(event.classes, locale, "only"),
    how,
    guestsBy && event.classes.includes("guest")
      ? t("guestsBy", { date: formatLongDate(guestsBy, locale) })
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
};

/** Places left, where the event has a capacity and the site its keys. */
const Places = ({
  capacity,
  eventId,
}: {
  readonly capacity: number | null;
  readonly eventId: string;
}) => {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return capacity === null || !url || !key ? null : (
    <PlacesLeft
      capacity={capacity}
      countUrl={`${url}/rest/v1/rpc/confirmed_count`}
      eventId={eventId}
      publishableKey={key}
    />
  );
};

/** The rows the event has filled, in the decision's order. */
const rowsFor = async (event: GoodToKnowEvent, locale: Locale) => {
  const t = await getTranslations({
    locale,
    namespace: "web.events.goodToKnow",
  });
  const rows: Row[] = [];
  const who = await whoCanCome(event, locale);
  rows.push({
    icon: "users",
    key: "who",
    label: t("who.label"),
    text: (
      <>
        {who}
        <Places capacity={event.capacity} eventId={event.id} />
      </>
    ),
  });
  if (
    event.language === "en" ||
    event.language === "ar" ||
    event.language === "both"
  ) {
    rows.push({
      icon: "globe",
      key: "language",
      label: t("language.label"),
      text: t(`language.${event.language}`),
    });
  }
  rows.push({
    icon: "hand-helping",
    key: "access",
    label: t("access.label"),
    text: await accessText(event, locale),
  });
  if (event.serves_food) {
    rows.push({
      icon: "coffee",
      key: "food",
      label: t("food.label"),
      text: await foodText(event, locale),
    });
  }
  const note = own(event, "content_note", locale);
  if (note) {
    rows.push({
      icon: "circle-alert",
      key: "note",
      label: t("contentNote"),
      text: note,
    });
  }
  if (!event.no_photos) {
    rows.push({
      icon: "image",
      key: "photos",
      label: t("photos.label"),
      text: t("photos.release"),
    });
  }
  return rows;
};

/**
 * "Good to know" (decisions.md, Events): under the date and place, before
 * the main button, one row per filled field, each with its icon and its
 * words. Places left show once fewer than 20 remain, read live.
 */
export const GoodToKnow = async ({
  event,
  locale,
}: {
  readonly event: GoodToKnowEvent;
  readonly locale: Locale;
}) => {
  const t = await getTranslations({
    locale,
    namespace: "web.events.goodToKnow",
  });
  const rows = await rowsFor(event, locale);
  return (
    <section aria-labelledby="good-to-know" className="grid gap-2">
      <h2 className="type-label" id="good-to-know">
        {t("title")}
      </h2>
      <dl className="divide-line border-line grid divide-y border-y">
        {rows.map((row) => (
          <div
            className="grid grid-cols-[1.25rem_1fr] gap-x-3 gap-y-0.5 py-2 sm:grid-cols-[1.25rem_10rem_1fr]"
            key={row.key}
          >
            <Icon className="mt-1" name={row.icon} />
            <dt className="type-caption font-medium">{row.label}</dt>
            <dd className="type-body col-start-2 sm:col-start-3">{row.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
