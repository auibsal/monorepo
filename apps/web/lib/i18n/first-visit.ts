/**
 * The first visit's language (decisions.md, the fourth prompt, 7h): a
 * visitor arriving for the first time on an English address whose browser
 * prefers Arabic is taken to the Arabic page; every later visit follows the
 * address alone (the cookie remembers that the first visit happened, so
 * switching language sticks).
 */
export const FIRST_VISIT_COOKIE = "sal_seen";

/** Whether Arabic ranks above English in an Accept-Language header. */
export const prefersArabic = (header: string | null): boolean => {
  if (!header) {
    return false;
  }
  let arabic = -1;
  let english = -1;
  for (const part of header.split(",")) {
    const [tag = "", ...params] = part.trim().split(";");
    const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
    const weight = q ? Number(q.slice(2)) : 1;
    if (!Number.isFinite(weight)) {
      continue;
    }
    const [lang] = tag.toLowerCase().split("-");
    if (lang === "ar") {
      arabic = Math.max(arabic, weight);
    } else if (lang === "en") {
      english = Math.max(english, weight);
    }
  }
  return arabic > 0 && arabic > english;
};

const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit/iu;
const ARABIC_PATH = /^\/ar(\/|$)/u;

/** Whether this request is a person's first page view that should go Arabic. */
export const firstVisitToArabic = (request: {
  cookies: { has: (name: string) => boolean };
  headers: Headers;
  method: string;
  nextUrl: { pathname: string };
}): boolean =>
  request.method === "GET" &&
  !request.cookies.has(FIRST_VISIT_COOKIE) &&
  !ARABIC_PATH.test(request.nextUrl.pathname) &&
  (request.headers.get("accept") ?? "").includes("text/html") &&
  !BOTS.test(request.headers.get("user-agent") ?? "") &&
  prefersArabic(request.headers.get("accept-language"));
