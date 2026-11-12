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
import { Footer, SlimFooter } from "@/components/footer";
import { FooterSwitch } from "@/components/footer-switch";

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

/** The account's titles, in the page's language (decisions.md, Standards). */
export const generateMetadata = async ({
  params,
}: {
  readonly params: Promise<{ locale: string }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  const society = locale === "ar" ? "الجمعية" : project.shortName;
  return {
    // Installable, so phones can show notifications (iPhone needs it).
    appleWebApp: { capable: true, title: society },
    icons: { apple: "/icons/sal-avatar-180.png" },
    manifest: "/manifest.webmanifest",
    // Personal pages: keep them out of search engines.
    robots: { follow: false, index: false },
    title: { default: society, template: `%s · ${society}` },
  };
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
          <FooterSwitch full={<Footer />} slim={<SlimFooter />} />
        </div>
      </AppProviders>
    </NextIntlClientProvider>
  );
};

export default AccountLayout;
