import { internationalizationMiddleware } from "@repo/internationalization/proxy";
import { adsenseCspSources } from "@repo/security/csp";
import {
  securityOptionsWith,
  telegramMiniApp,
  withSecurityHeaders,
} from "@repo/security/proxy";
import type { NextRequest } from "next/server";

export const config = {
  // Every page, in both languages: the public site, Membership and the Diwan. Not the
  // API routes, the service worker, the manifest, the feeds or static files.
  matcher: [
    "/((?!api/|_next/static|_next/image|ingest|favicon.ico|robots.txt|ads.txt|calendar.ics|sw.js|manifest.webmanifest|icons/|\\.well-known|sitemap.xml|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|pdf|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};

// Qirtas's AdSense ads need Google's ad hosts, once AdSense is set up.
const securityOptions = securityOptionsWith(
  ...(process.env.NEXT_PUBLIC_ADSENSE_CLIENT ? [adsenseCspSources] : [])
);

// The daily word is also the Telegram bot's Main App: Telegram's web app
// shows Mini Apps in a frame, so that page (and only that page) may be framed
// by it.
const WORD_GAME = /^(\/[a-z]{2})?\/qirtas\/games\/word\/?$/;
const miniAppOptions = telegramMiniApp(securityOptions);

// The proxy picks the language and sets the security headers. Sign-in and
// permissions stay in the browser (UX) and in Row Level Security and the
// API routes (security); the members' pages and the Diwan check them client-side.
export default function proxy(request: NextRequest) {
  return withSecurityHeaders(
    internationalizationMiddleware(request),
    WORD_GAME.test(request.nextUrl.pathname) ? miniAppOptions : securityOptions
  );
}
