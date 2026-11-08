import { project } from "@repo/config";
import { routing } from "@repo/internationalization/routing";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { AccountFrame } from "@/components/account/frame";
import { AppProviders } from "@/components/diwan/providers";
import { Footer } from "@/components/footer";

// Rendered for each request, so Next can put the request's CSP nonce on
// its scripts (apps/web/proxy.ts): the layout waits for the request, and
// may block rather than ship a static shell.
export const instant = false;

interface AccountLayoutProperties {
  readonly children: ReactNode;
  readonly params: Promise<{
    locale: string;
  }>;
}

export const metadata: Metadata = {
  // Installable, so phones can show notifications (iPhone needs it).
  appleWebApp: { capable: true, title: project.shortName },
  icons: { apple: "/icons/sal-avatar-180.png" },
  manifest: "/manifest.webmanifest",
  // Personal pages: keep them out of search engines.
  robots: { follow: false, index: false },
  title: {
    default: project.shortName,
    template: `%s · ${project.shortName}`,
  },
};

/**
 * The members' pages on the public site (decisions.md): signing in
 * and up, the account, and what members do (booking, shifts, writing for
 * Qirtas, the Society). The site's own header and footer; client-rendered,
 * so every read and write goes to Supabase with the member's token (Row
 * Level Security decides) or to the API routes with it. The Diwan, at
 * /diwan, is for the officers only.
 */
const AccountLayout = async ({ children, params }: AccountLayoutProperties) => {
  await connection();
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const { auth, common, diwan, web } = await getMessages();

  return (
    <NextIntlClientProvider messages={{ auth, common, diwan, web }}>
      <AppProviders>
        <div className="flex min-h-svh flex-col">
          <AccountFrame>{children}</AccountFrame>
          <Footer />
        </div>
      </AppProviders>
    </NextIntlClientProvider>
  );
};

export default AccountLayout;
