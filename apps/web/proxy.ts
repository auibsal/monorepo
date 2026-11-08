import { internationalizationMiddleware } from "@repo/internationalization/proxy";
import {
  contentSecurityPolicy,
  createNonce,
  scriptHash,
  securityOptionsWith,
  telegramMiniApp,
  withNonce,
  withSecurityHeaders,
} from "@repo/security/proxy";
import { NextRequest } from "next/server";
import { themeScript } from "@/lib/theme";

export const config = {
  // Every page, in both languages: the public site, Membership and the Diwan. Not the
  // API routes, the design system (/diwan/media/design, Storybook's own page),
  // the service worker, the manifest, the feeds or static files.
  matcher: [
    "/((?!api/|_design|diwan/media/design|ar/diwan/media/design|_next/static|_next/image|favicon.ico|robots.txt|calendar.ics|sw.js|manifest.webmanifest|icons/|\\.well-known|sitemap.xml|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|pdf|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};

const securityOptions = securityOptionsWith();

// The daily word is also the Telegram bot's Main App: Telegram's web app
// shows Mini Apps in a frame, so that page (and only that page) may be framed
// by it.
const WORD_GAME = /^(\/[a-z]{2})?\/qirtas\/games\/word\/?$/u;
const miniAppOptions = telegramMiniApp(securityOptions);

// Your account and the Diwan (the (account) and diwan route groups, which
// render for each request): their scripts need a per-request nonce instead
// of 'unsafe-inline'. The public site is prerendered, so it keeps the
// static policy.
const PER_REQUEST =
  /^(\/[a-z]{2})?\/(account|auth|company\/auditions|continue|diwan|forgot-password|forms|get-involved|invite|partners\/(apply|dashboard)|qirtas\/(read|write)|sign-in|sign-up|welcome)(\/|$)/u;
const themeHash = scriptHash(themeScript);

// The proxy picks the language and sets the security headers. Sign-in and
// permissions stay in the browser (UX) and in Row Level Security and the
// API routes (security); the members' pages and the Diwan check them client-side.
export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (PER_REQUEST.test(path)) {
    const options = withNonce(securityOptions, createNonce(), [
      await themeHash,
    ]);
    // Next reads the nonce from the request's policy and puts it on the
    // scripts it renders.
    const headers = new Headers(request.headers);
    headers.set("Content-Security-Policy", contentSecurityPolicy(options));
    return withSecurityHeaders(
      internationalizationMiddleware(new NextRequest(request, { headers })),
      options
    );
  }
  return withSecurityHeaders(
    internationalizationMiddleware(request),
    WORD_GAME.test(path) ? miniAppOptions : securityOptions
  );
}
