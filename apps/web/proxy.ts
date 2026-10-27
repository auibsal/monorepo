import { internationalizationMiddleware } from "@repo/internationalization/proxy";
import { adsenseCspSources, ideaPassCspSources } from "@repo/security/csp";
import {
  allowPopups,
  noseconeOptionsWith,
  telegramMiniApp,
  withSecurityHeaders,
} from "@repo/security/proxy";
import type { NextRequest } from "next/server";

export const config = {
  // Every page, in both languages: the public site and the Nexus. Not the
  // API routes, the service worker, the manifest, the feeds or static files.
  matcher: [
    "/((?!api/|_next/static|_next/image|ingest|favicon.ico|robots.txt|ads.txt|calendar.ics|sw.js|manifest.webmanifest|icons/|\\.well-known|sitemap.xml|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|pdf|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};

// Waraq's AdSense ads need Google's ad hosts, once AdSense is set up; the
// members' pages frame the live IDEA Pass card once The IDEA allows it.
const securityOptions = noseconeOptionsWith(
  ...(process.env.NEXT_PUBLIC_ADSENSE_CLIENT ? [adsenseCspSources] : []),
  ...(process.env.NEXT_PUBLIC_PASS_EMBED === "true" ? [ideaPassCspSources] : [])
);

// The daily word is also the Telegram bot's Main App: Telegram's web app
// shows Mini Apps in a frame, so that page (and only that page) may be framed
// by it.
const WORD_GAME = /^(\/[a-z]{2})?\/qirtas\/games\/word\/?$/;
const miniAppOptions = telegramMiniApp(securityOptions);

// The members' pages that show the card (Today and the welcome screen)
// frame the live IDEA Pass card once The IDEA allows it; its sign-in window
// hands the result back to that frame, which needs the window's opener.
const CARD_PAGES = /^(\/[a-z]{2})?\/(membership|setup)\/?$/;
const cardOptions =
  process.env.NEXT_PUBLIC_PASS_EMBED === "true"
    ? allowPopups(securityOptions)
    : securityOptions;

const optionsFor = (pathname: string) => {
  if (WORD_GAME.test(pathname)) {
    return miniAppOptions;
  }
  return CARD_PAGES.test(pathname) ? cardOptions : securityOptions;
};

// The proxy picks the language and sets the security headers. Sign-in and
// permissions stay in the browser (UX) and in Row Level Security and the
// API routes (security); the Nexus pages check them client-side.
export default function proxy(request: NextRequest) {
  return withSecurityHeaders(
    internationalizationMiddleware(request),
    optionsFor(request.nextUrl.pathname)
  );
}
