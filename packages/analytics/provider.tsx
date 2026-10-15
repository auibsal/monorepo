import Script from "next/script";
import type { ReactNode } from "react";
import { bootScript, loaderSrc } from "./boot";
import { keys } from "./keys";

interface AnalyticsProviderProps {
  readonly children: ReactNode;
}

/** The analytics settings from the environment. */
const analyticsSettings = () => {
  const env = keys();
  return {
    gaId: env.NEXT_PUBLIC_GA_ID,
    gatewayPath: env.NEXT_PUBLIC_TAG_GATEWAY_PATH,
    gtmId: env.NEXT_PUBLIC_GTM_ID,
    zarazPurpose: env.NEXT_PUBLIC_ZARAZ_ANALYTICS_PURPOSE,
  };
};

/**
 * Analytics for the public site: Google Tag Manager (GA4 is configured in
 * the container) or GA4 alone, loaded only when NEXT_PUBLIC_GTM_ID or
 * NEXT_PUBLIC_GA_ID is set, through the Google tag gateway when
 * NEXT_PUBLIC_TAG_GATEWAY_PATH is set. Consent comes from Cloudflare Zaraz;
 * nothing is stored until the visitor allows analytics. No advertising
 * features. Render once, in apps/web's layout.
 */
export const AnalyticsProvider = ({ children }: AnalyticsProviderProps) => {
  const settings = analyticsSettings();
  const src = loaderSrc(settings);

  return (
    <>
      {children}
      {src ? (
        <>
          <Script id="analytics-consent" strategy="afterInteractive">
            {bootScript(settings)}
          </Script>
          <Script src={src} strategy="afterInteractive" />
        </>
      ) : null}
    </>
  );
};
