import { project } from "@repo/config";
import { routing } from "@repo/internationalization/routing";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { AppProviders } from "@/components/diwan/providers";

// Rendered for each request, so Next can put the request's CSP nonce on
// its scripts (apps/web/proxy.ts): the layout waits for the request, and
// may block rather than ship a static shell.
export const instant = false;

interface DiwanLayoutProperties {
  readonly children: ReactNode;
  readonly params: Promise<{
    locale: string;
  }>;
}

export const metadata: Metadata = {
  // Installable, so phones can show notifications (iPhone needs it).
  appleWebApp: { capable: true, title: "Diwan" },
  icons: { apple: "/icons/sal-avatar-180.png" },
  manifest: "/manifest.webmanifest",
  // The Diwan is for officers: keep it out of search engines.
  robots: { follow: false, index: false },
  title: {
    default: `The Diwan · ${project.shortName}`,
    template: "%s · The Diwan",
  },
};

/**
 * The Diwan, the officers' administration at /diwan on
 * the one site, under the site's own header; a workspace, so no footer
 * (the overhaul, Oct 30, 2026). Members' pages are on
 * the site itself (/account and the rest; decisions.md). Client-
 * rendered: every read and write goes to Supabase with the officer's token
 * (Row Level Security decides) or to the API routes under /api with it.
 */
const DiwanLayout = async ({ children, params }: DiwanLayoutProperties) => {
  await connection();
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const { auth, common, diwan, web } = await getMessages();

  // The site's own header frames the Diwan too, so going between them
  // feels like one place.
  return (
    <NextIntlClientProvider
      messages={{ auth, common, diwan, web: { nav: web.nav } }}
    >
      <AppProviders>
        <div className="flex min-h-svh flex-col">{children}</div>
      </AppProviders>
    </NextIntlClientProvider>
  );
};

export default DiwanLayout;
