import { project } from "@repo/config";
import { routing } from "@repo/internationalization/routing";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { AppProviders } from "@/components/nexus/providers";

interface NexusLayoutProperties {
  readonly children: ReactNode;
  readonly params: Promise<{
    locale: string;
  }>;
}

export const metadata: Metadata = {
  // Installable, so phones can show notifications (iPhone needs it).
  appleWebApp: { capable: true, title: "Nexus" },
  icons: { apple: "/icons/sal-avatar-180.png" },
  manifest: "/manifest.webmanifest",
  // The Nexus is for members: keep it out of search engines.
  robots: { follow: false, index: false },
  title: {
    default: `The Nexus · ${project.shortName}`,
    template: "%s · The Nexus",
  },
};

export const viewport: Viewport = { themeColor: "#273236" };

/**
 * The Nexus, the member portal, at /nexus on the one site. Client-rendered:
 * every read and write goes to Supabase with the member's token (Row Level
 * Security decides) or to the API routes under /api with that token.
 */
const NexusLayout = async ({ children, params }: NexusLayoutProperties) => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const { auth, common, nexus } = await getMessages();

  return (
    <NextIntlClientProvider messages={{ auth, common, nexus }}>
      <AppProviders>{children}</AppProviders>
    </NextIntlClientProvider>
  );
};

export default NexusLayout;
