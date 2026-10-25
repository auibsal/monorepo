import { AnalyticsProvider } from "@repo/analytics/provider";
import { routing } from "@repo/internationalization/routing";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import type { ReactNode } from "react";
import { ConsentBanner } from "@/components/consent-banner";
import { ConsoleNote } from "@/components/console-note";
import { Footer } from "@/components/footer";
import { SiteHeader } from "@/components/site-header";
import { askedConsent } from "@/lib/consent";
import { JsonLd, organization } from "@/lib/json-ld";

interface SiteLayoutProperties {
  readonly children: ReactNode;
  readonly params: Promise<{
    locale: string;
  }>;
}

/** The public site: header, footer, analytics and the consent card. */
const SiteLayout = async ({ children, params }: SiteLayoutProperties) => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "common" });
  // Client components only need the shared and public-site texts.
  const { common, web } = await getMessages();
  const consentPurposes = askedConsent();

  return (
    <div className="flex min-h-svh flex-col">
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:bg-surface focus:p-2"
        href="#main"
      >
        {t("skipToContent")}
      </a>
      <JsonLd data={organization()} />
      <NextIntlClientProvider messages={{ common, web }}>
        <AnalyticsProvider>
          <SiteHeader />
          <main className="flex-1" id="main">
            {children}
          </main>
          <Footer />
          <ConsoleNote />
          {consentPurposes.ads || consentPurposes.analytics ? (
            <ConsentBanner purposes={consentPurposes} />
          ) : null}
        </AnalyticsProvider>
      </NextIntlClientProvider>
    </div>
  );
};

export default SiteLayout;
