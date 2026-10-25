import "./styles.css";
import { DesignSystemProvider } from "@repo/design-system";
import { fonts } from "@repo/design-system/lib/fonts";
import { getDirection, locales } from "@repo/internationalization";
import { routing } from "@repo/internationalization/routing";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { env } from "@/env";
import { themeScript } from "@/lib/theme";

interface LocaleLayoutProperties {
  readonly children: ReactNode;
  readonly params: Promise<{
    locale: string;
  }>;
}

export const generateStaticParams = () => locales.map((locale) => ({ locale }));

// AdSense checks this tag to confirm the site is the Society's (ads.txt
// says the same); it loads nothing.
export const metadata: Metadata = env.NEXT_PUBLIC_ADSENSE_CLIENT
  ? { other: { "google-adsense-account": env.NEXT_PUBLIC_ADSENSE_CLIENT } }
  : {};

// The browser bar follows the mode: white in light, ink in dark.
export const viewport: Viewport = {
  themeColor: [
    { color: "#ffffff", media: "(prefers-color-scheme: light)" },
    { color: "#273236", media: "(prefers-color-scheme: dark)" },
  ],
};

/**
 * The one document for the whole site: the public pages ((site)) and the
 * Nexus (nexus) add their messages inside it and share one masthead and
 * footer. Light or dark mode is set on <html> by the theme script. English
 * has no prefix (/events, /diwan/events); other languages do (/ar/…).
 */
const LocaleLayout = async ({ children, params }: LocaleLayoutProperties) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Lets pages under this layout render statically.
  setRequestLocale(locale);
  const dir = getDirection(locale);
  const { common } = await getMessages();

  return (
    // The theme script sets data-theme on <html> before React hydrates.
    <html className={fonts} dir={dir} lang={locale} suppressHydrationWarning>
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: our own constant script, no input
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </head>
      <body className="bg-surface text-text">
        <DesignSystemProvider dir={dir} labels={common.ui}>
          {children}
        </DesignSystemProvider>
      </body>
    </html>
  );
};

export default LocaleLayout;
