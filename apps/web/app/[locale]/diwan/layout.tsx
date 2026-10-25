import { project } from "@repo/config";
import { routing } from "@repo/internationalization/routing";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { Footer } from "@/components/footer";
import { AppProviders } from "@/components/nexus/providers";

interface NexusLayoutProperties {
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
 * The Diwan (code name Nexus), the officers' administration at /diwan on
 * the one site, in the site's own header and footer. Members' pages are on
 * the site itself (/membership and the rest; owner, Oct 24, 2026). Client-
 * rendered: every read and write goes to Supabase with the officer's token
 * (Row Level Security decides) or to the API routes under /api with it.
 */
const NexusLayout = async ({ children, params }: NexusLayoutProperties) => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const { auth, common, nexus, web } = await getMessages();

  // The site's own header and footer frame the Diwan too, so going between
  // them feels like one place.
  return (
    <NextIntlClientProvider
      messages={{ auth, common, nexus, web: { nav: web.nav } }}
    >
      <AppProviders>
        <div className="flex min-h-svh flex-col">
          {children}
          <Footer consent={false} />
        </div>
      </AppProviders>
    </NextIntlClientProvider>
  );
};

export default NexusLayout;
