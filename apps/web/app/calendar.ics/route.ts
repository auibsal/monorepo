import { project } from "@repo/config";
import { isLocale } from "@repo/internationalization/config";

// The Society's public calendar at an easy address, auibsal.org/calendar.ics:
// the feed itself is built by apps/api; this passes it on, refreshed with
// the events (cache tag "events") or every 15 minutes.
export const GET = async (request: Request) => {
  const asked = new URL(request.url).searchParams.get("lang");
  const lang = asked && isLocale(asked) ? asked : "en";
  const feed = await fetch(
    `${project.hosts.api}/calendar/sal.ics?lang=${lang}`,
    { next: { revalidate: 900, tags: ["events"] } }
  );
  if (!feed.ok) {
    return new Response(null, { status: 502 });
  }
  return new Response(await feed.text(), {
    headers: { "content-type": "text/calendar; charset=utf-8" },
  });
};
