import "./styles.css";
import { DesignSystemProvider } from "@repo/design-system";
import { fonts } from "@repo/design-system/lib/fonts";
import { getDirection, locales } from "@repo/internationalization";
import { routing } from "@repo/internationalization/routing";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

interface LocaleLayoutProperties {
  readonly children: ReactNode;
  readonly params: Promise<{
    locale: string;
  }>;
}

export const generateStaticParams = () => locales.map((locale) => ({ locale }));

/**
 * The one document for the whole site: the public pages ((site)) and the
 * Nexus (nexus) each add their own frame and messages inside it. English
 * has no prefix (/events, /nexus/events); other languages do (/ar/…).
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
    <html className={fonts} dir={dir} lang={locale}>
      <body className="bg-surface text-text">
        <DesignSystemProvider dir={dir} labels={common.ui}>
          {children}
        </DesignSystemProvider>
      </body>
    </html>
  );
};

export default LocaleLayout;
