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
  // The Nexus is for members: keep it out of search engines.
  robots: { follow: false, index: false },
  title: {
    default: `The Diwan · ${project.shortName}`,
    template: "%s · The Diwan",
  },
};

/**
 * The Nexus, the member portal, at /diwan on the one site, in the site's
 * own header and footer. Client-rendered:
 * every read and write goes to Supabase with the member's token (Row Level
 * Security decides) or to the API routes under /api with that token.
 */
const NexusLayout = async ({ children, params }: NexusLayoutProperties) => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const { auth, common, nexus, web } = await getMessages();

  // The site's own header and footer frame the Nexus too, so going between
  // them feels like one place. The phones' tab bar sits over the bottom of
  // the page, so the page makes room for it when it is there.
  return (
    <NextIntlClientProvider
      messages={{ auth, common, nexus, web: { nav: web.nav } }}
    >
      <AppProviders>
        <div className="flex min-h-dvh flex-col has-[[data-tab-bar]]:pb-16 lg:has-[[data-tab-bar]]:pb-0 print:pb-0">
          {children}
          <Footer consent={false} />
        </div>
      </AppProviders>
    </NextIntlClientProvider>
  );
};

export default NexusLayout;
