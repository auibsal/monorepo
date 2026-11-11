import type { Locale } from "@repo/internationalization";
import { siteUrl } from "@repo/internationalization";
import { events, journal, localized } from "@/lib/data";
import { readPublished } from "@/lib/supabase";

const ESCAPES: Record<string, string> = {
  "'": "&apos;",
  '"': "&quot;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};
const SPECIAL = /["&'<>]/gu;

/** Text made safe for XML. */
const xml = (text: string) => text.replace(SPECIAL, (c) => ESCAPES[c] ?? c);

const LIMIT = 30;
const FEED = /\/feed\.xml$/u;

/** The newest published pieces of one section, or of all six, in this language. */
const latest = async (locale: Locale, desk: journal.Desk | null) => {
  const desks = desk ? [desk] : [...journal.desks];
  const lists = await Promise.all(
    desks.map((d) =>
      readPublished(
        ["journal"],
        (c) => journal.deskPieces(c, d, { limit: LIMIT }),
        []
      )
    )
  );
  return journal
    .inLanguage(lists.flat(), locale)
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))
    .slice(0, LIMIT);
};

/**
 * An RSS 2.0 feed of Qirtas (design review A6): the newest thirty pieces,
 * of the whole paper or one section, in the page's language. Titles, decks
 * and bylines only; the text stays on the site.
 */
export const qirtasFeed = async ({
  description,
  desk,
  locale,
  path,
  title,
}: {
  description: string;
  desk: journal.Desk | null;
  locale: Locale;
  path: string;
  title: string;
}) => {
  const pieces = await latest(locale, desk);
  const items = pieces
    .map((piece) => {
      const link = siteUrl(locale, journal.piecePath(piece));
      const deck = localized(piece, "deck", locale);
      const author = piece.contributor
        ? localized(piece.contributor, "name", locale)
        : "";
      return [
        "<item>",
        `<title>${xml(localized(piece, "title", locale))}</title>`,
        `<link>${xml(link)}</link>`,
        `<guid isPermaLink="true">${xml(link)}</guid>`,
        piece.published_at
          ? `<pubDate>${new Date(piece.published_at).toUTCString()}</pubDate>`
          : "",
        deck ? `<description>${xml(deck)}</description>` : "",
        author ? `<dc:creator>${xml(author)}</dc:creator>` : "",
        "</item>",
      ].join("");
    })
    .join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>${xml(title)}</title>
<link>${xml(siteUrl(locale, path.replace(FEED, "")))}</link>
<atom:link href="${xml(siteUrl(locale, path))}" rel="self" type="application/rss+xml"/>
<description>${xml(description)}</description>
<language>${locale}</language>
${items}
</channel>
</rss>
`;
  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=900, s-maxage=900",
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
};

/**
 * Events as an RSS 2.0 feed (decisions.md, Standards): the coming public
 * events, soonest first, in the page's language; an event with no title in
 * that language is left out. Members-only events never appear.
 */
export const eventsFeed = async ({
  description,
  locale,
  title,
}: {
  description: string;
  locale: Locale;
  title: string;
}) => {
  const path = "/events/feed.xml";
  const upcoming = await readPublished(
    ["events"],
    async (c) => (await events.publicEvents(c, { limit: LIMIT })) ?? [],
    []
  );
  const items = upcoming
    .filter((event) => (locale === "ar" ? event.title_ar : event.title_en))
    .map((event) => {
      const link = siteUrl(locale, `/events/${event.slug}`);
      const summary = localized(event, "summary", locale);
      return [
        "<item>",
        `<title>${xml(localized(event, "title", locale))}</title>`,
        `<link>${xml(link)}</link>`,
        `<guid isPermaLink="true">${xml(link)}</guid>`,
        `<pubDate>${new Date(event.starts_at).toUTCString()}</pubDate>`,
        summary ? `<description>${xml(summary)}</description>` : "",
        "</item>",
      ].join("");
    })
    .join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${xml(title)}</title>
<link>${xml(siteUrl(locale, "/events"))}</link>
<atom:link href="${xml(siteUrl(locale, path))}" rel="self" type="application/rss+xml"/>
<description>${xml(description)}</description>
<language>${locale}</language>
${items}
</channel>
</rss>
`;
  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=900, s-maxage=900",
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
};
