/**
 * The addresses that moved after they were shared (decisions.md, The site:
 * "Lasting addresses"): each answers with a permanent redirect (308) to
 * its new home, with why it stays. An address never shared (a page behind
 * sign-in that no email, Hudhud message, poster or post ever linked) is
 * not kept here: it simply changed. English has no prefix; Arabic is
 * under /ar.
 */
const PUBLIC = "a public page, indexed and linked before it moved";
const EMAIL = "linked from the Society's emails";
const BOT = "linked from Hudhud's messages";

export const MOVED: readonly (readonly [
  from: string,
  to: string,
  reason: string,
])[] = [
  // Editions is the one door (decisions.md, Qirtas): every old address of
  // Submit to Qirtas opens its open calls; /haven is Haven's own page.
  ["/qirtas/write", "/qirtas/editions/open", PUBLIC],
  ["/qirtas/write/:path*", "/qirtas/editions/open", PUBLIC],
  ["/qirtas/submit", "/qirtas/editions/open", PUBLIC],
  ["/qirtas/submit/:path*", "/qirtas/editions/open", PUBLIC],
  ["/haven", "/qirtas/editions/haven", PUBLIC],
  ["/membership", "/account", EMAIL],
  ["/membership/:path*", "/account/:path*", EMAIL],
  ["/library/privacy", "/privacy", PUBLIC],
  ["/library/terms-of-use", "/terms", PUBLIC],
  ["/library/accessibility", "/accessibility", PUBLIC],
  ["/library/security", "/security", PUBLIC],
  ["/partners/join", "/partners/apply", PUBLIC],
  // Your account's tabs match their pages (decisions.md, The site).
  ["/account/society", "/account", EMAIL],
  ["/account/society/stand/:position", "/account/elections/:position", EMAIL],
  ["/account/calendar", "/account/events", EMAIL],
  ["/account/settings/notices", "/account/settings/notifications", EMAIL],
  ["/diwan/events/:ref/door", "/diwan/events/:ref/check-in", BOT],
  // Certificate and letter emails linked to Record; the tab is Documents.
  [
    "/account/record/:ref([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})",
    "/account/documents/certificates/:ref",
    EMAIL,
  ],
  ["/account/record", "/account/documents", EMAIL],
  ["/account/record/:path*", "/account/documents/:path*", EMAIL],
  // Filters are query strings (decisions.md, The site).
  ["/events/:month(\\d{4}-\\d{2})", "/events?month=:month", PUBLIC],
  ["/events/:month(\\d{4}-\\d{2})/society", "/events?month=:month", PUBLIC],
  [
    "/company/:month(\\d{4}-\\d{2})",
    "/events?host=company&month=:month",
    PUBLIC,
  ],
  [
    "/qirtas/archive/:month(\\d{4}-\\d{2})",
    "/qirtas/archive?month=:month",
    PUBLIC,
  ],
  [
    "/qirtas/archive/:month(\\d{4}-\\d{2})/:section",
    "/qirtas/archive?month=:month&section=:section",
    PUBLIC,
  ],
  ["/search/:q", "/search?q=:q", PUBLIC],
  ["/qirtas/editions/list", "/qirtas/editions?view=list", PUBLIC],
  // Qirtas's themed collections are Editions (decisions.md, Qirtas).
  ["/qirtas/issues", "/qirtas/editions", PUBLIC],
  ["/qirtas/issues/:slug", "/qirtas/editions/:slug", PUBLIC],
  // An event's address is its title, with no date (the owner, Nov 22,
  // 2026; migration 20261122000100): every dated address that was public.
  // The first moved before that, with the writing workshop to Tue Dec 8.
  ["/events/writing-workshop-2026-11-17", "/events/writing-workshop", PUBLIC],
  [
    "/events/iraqi-short-films-screening-2026-11-22",
    "/events/iraqi-short-films-screening",
    PUBLIC,
  ],
  [
    "/events/reading-with-a-guest-2026-12-01",
    "/events/reading-with-a-guest",
    PUBLIC,
  ],
  ["/events/writing-workshop-2026-12-08", "/events/writing-workshop", PUBLIC],
  [
    "/events/reading-with-a-guest-2027-02-16",
    "/events/reading-with-a-guest-2",
    PUBLIC,
  ],
  ["/events/book-discussion-2027-02-23", "/events/book-discussion", PUBLIC],
  ["/events/writing-workshop-2027-03-02", "/events/writing-workshop-2", PUBLIC],
  ["/events/listening-session-2027-03-16", "/events/listening-session", PUBLIC],
  ["/events/book-discussion-2027-03-23", "/events/book-discussion-2", PUBLIC],
  ["/events/founding-meeting-2027-03-30", "/events/founding-meeting", PUBLIC],
  [
    "/events/reading-with-a-guest-2027-04-06",
    "/events/reading-with-a-guest-3",
    PUBLIC,
  ],
  ["/events/book-discussion-2027-04-27", "/events/book-discussion-3", PUBLIC],
  ["/events/writing-workshop-2027-05-04", "/events/writing-workshop-4", PUBLIC],
  [
    "/events/listening-session-2027-05-11",
    "/events/listening-session-2",
    PUBLIC,
  ],
  // Your account in six tabs: the card and an open election are on Today,
  // applications under Roles (decisions.md, The site).
  ["/account/elections", "/account", EMAIL],
  ["/account/applications", "/account/roles", EMAIL],
  // Nothing about members is public but bylines and role holders.
  ["/qirtas/authors/:slug", "/qirtas", PUBLIC],
  ["/contact", "/about/contact", PUBLIC],
];
