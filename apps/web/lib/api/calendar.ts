import "server-only";

import { project } from "@repo/config";
import type { AdminClient } from "@repo/database/admin";
import { siteUrl } from "@repo/internationalization";
import type { IcsEvent } from "./ics";

const eventColumns =
  "id, slug, title_en, title_ar, summary_en, summary_ar, venue_en, venue_ar, starts_at, ends_at, members_only, entry, status, updated_at";

interface EventRow {
  ends_at: string | null;
  entry: string;
  id: string;
  members_only: boolean;
  slug: string;
  starts_at: string;
  status: string;
  summary_ar: string | null;
  summary_en: string | null;
  title_ar: string;
  title_en: string;
  updated_at: string;
  venue_ar: string | null;
  venue_en: string | null;
}

const toIcs = (
  event: EventRow,
  locale: "en" | "ar",
  tag?: string
): IcsEvent => ({
  canceled: event.status === "canceled",
  description:
    locale === "ar"
      ? (event.summary_ar ?? event.summary_en)
      : (event.summary_en ?? event.summary_ar),
  end: event.ends_at,
  location:
    locale === "ar"
      ? (event.venue_ar ?? event.venue_en)
      : (event.venue_en ?? event.venue_ar),
  modified: event.updated_at,
  start: event.starts_at,
  tag,
  title: locale === "ar" ? event.title_ar : event.title_en,
  uid: `${event.id}@${project.domain}`,
  url: event.members_only
    ? siteUrl(locale, "/account/events")
    : siteUrl(locale, `/events/${event.slug}`),
});

const since = () => new Date(Date.now() - 90 * 86_400_000).toISOString();

/** Public SAL events (never members-only), for the public feed. */
export const publicEvents = async (admin: AdminClient, locale: "en" | "ar") => {
  const { data } = await admin
    .schema("events")
    .from("events")
    .select(eventColumns)
    .in("status", ["published", "canceled"])
    .eq("members_only", false)
    .gte("starts_at", since())
    .order("starts_at");
  return (data ?? []).map((event) => toIcs(event, locale));
};

/** One public event, for "Add to calendar". */
export const publicEvent = async (
  admin: AdminClient,
  slug: string,
  locale: "en" | "ar"
) => {
  const { data } = await admin
    .schema("events")
    .from("events")
    .select(eventColumns)
    .eq("slug", slug)
    .eq("status", "published")
    .eq("members_only", false)
    .maybeSingle();
  return data ? toIcs(data, locale) : null;
};

/**
 * A member's private feed: their RSVPs, all public SAL events, members-only
 * events (members only), invitation-only events they are invited to, and
 * the AUIB campus calendar. Found by the secret token in the URL; reset by
 * the member from the Diwan.
 */
export const memberFeed = async (admin: AdminClient, token: string) => {
  const { data: owner } = await admin
    .schema("membership")
    .from("calendar_tokens")
    .select("user_id")
    .eq("token", token)
    .maybeSingle();
  if (!owner) {
    return null;
  }

  const [
    { data: profile },
    { data: isMember },
    { data: rsvps },
    { data: invitations },
  ] = await Promise.all([
    admin
      .schema("core")
      .from("profiles")
      .select("locale")
      .eq("id", owner.user_id)
      .maybeSingle(),
    admin.schema("membership").rpc("is_member", { uid: owner.user_id }),
    admin
      .schema("events")
      .from("rsvps")
      .select("event_id")
      .eq("user_id", owner.user_id)
      .eq("status", "confirmed"),
    admin
      .schema("events")
      .from("invitations")
      .select("event_id")
      .eq("user_id", owner.user_id),
  ]);
  const invited = new Set((invitations ?? []).map((i) => i.event_id));
  const locale = profile?.locale === "ar" ? "ar" : "en";
  const going = new Set((rsvps ?? []).map((r) => r.event_id));

  let query = admin
    .schema("events")
    .from("events")
    .select(eventColumns)
    .in("status", ["published", "canceled"])
    .gte("starts_at", since())
    .order("starts_at");
  if (!isMember) {
    query = query.eq("members_only", false);
  }
  const [{ data: events }, { data: campus }] = await Promise.all([
    query,
    // AUIB's own dates, synced hourly from the University's public calendar.
    admin
      .schema("core")
      .from("external_events")
      .select("uid, title, location, url, starts_at, ends_at, all_day")
      .eq("source", "auib")
      .gte("starts_at", since())
      .order("starts_at"),
  ]);

  return {
    events: [
      ...(events ?? [])
        // Invitation-only events reach only the invited.
        .filter((event) => event.entry !== "invite" || invited.has(event.id))
        .map((event) =>
          toIcs(event, locale, going.has(event.id) ? "[RSVP]" : undefined)
        ),
      ...(campus ?? []).map(
        (event): IcsEvent => ({
          allDay: event.all_day,
          end: event.ends_at,
          location: event.location,
          start: event.starts_at,
          tag: "[AUIB]",
          title: event.title,
          uid: `auib-${event.uid}@${project.domain}`,
          url: event.url,
        })
      ),
    ],
    locale,
  };
};
