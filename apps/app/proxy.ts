import { internationalizationMiddleware } from "@repo/internationalization/proxy";
import type { NextRequest } from "next/server";

export const config = {
  // Every route except static assets, the service worker and the manifest.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sw.js|icons/|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|pdf|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};

// English pages live at "/", other languages under their prefix ("/ar/…").
// The proxy only picks the language; sign-in and permissions stay in the
// browser (UX) and in Supabase RLS and apps/api (security).
export default function proxy(request: NextRequest) {
  return internationalizationMiddleware(request);
}
