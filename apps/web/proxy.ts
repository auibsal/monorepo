import { internationalizationMiddleware } from "@repo/internationalization/proxy";
import { adsenseCspSources } from "@repo/security/csp";
import { noseconeOptionsWith, withSecurityHeaders } from "@repo/security/proxy";
import type { NextRequest } from "next/server";

export const config = {
  // matcher tells Next.js which routes to run the middleware on. This runs the
  // middleware on all routes except for static assets
  matcher: [
    "/((?!api/|_next/static|_next/image|ingest|favicon.ico|robots.txt|ads.txt|sitemap.xml|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|pdf|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};

// Waraq's AdSense ads need Google's ad hosts, once AdSense is set up.
const securityOptions = noseconeOptionsWith(
  ...(process.env.NEXT_PUBLIC_ADSENSE_CLIENT ? [adsenseCspSources] : [])
);

// The marketing site has no signed-in area and serves published content
// only, so the proxy just picks the locale and sets the security headers.
// Arcjet guards the one public form, on apps/api.
export default function proxy(request: NextRequest) {
  return withSecurityHeaders(
    internationalizationMiddleware(request),
    securityOptions
  );
}
