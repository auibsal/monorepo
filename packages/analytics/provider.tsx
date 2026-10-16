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
    adsense: Boolean(env.NEXT_PUBLIC_ADSENSE_CLIENT),
    gaId: env.NEXT_PUBLIC_GA_ID,
    gatewayPath: env.NEXT_PUBLIC_TAG_GATEWAY_PATH,
    gtmId: env.NEXT_PUBLIC_GTM_ID,
  };
};

/**
 * Analytics for the public site: Google Tag Manager (GA4 is configured in
 * the container) or GA4 alone, loaded only when NEXT_PUBLIC_GTM_ID or
 * NEXT_PUBLIC_GA_ID is set, through the Google tag gateway when
 * NEXT_PUBLIC_TAG_GATEWAY_PATH is set. Consent comes from the site's own card;
 * nothing is stored until the visitor allows analytics, and no ad cookies
 * until they allow advertising (Waraq's AdSense ads). Render once, in
 * apps/web's layout.
 */
export const AnalyticsProvider = ({ children }: AnalyticsProviderProps) => {
  const { adsense, ...settings } = analyticsSettings();
  const src = loaderSrc(settings);

  // Consent mode is set up whenever Google loads anything: GTM or GA4, or
  // Waraq's AdSense ads (which read the same consent signals).
  return (
    <>
      {children}
      {src || adsense ? (
        <Script id="analytics-consent" strategy="afterInteractive">
          {bootScript(settings)}
        </Script>
      ) : null}
      {src ? <Script src={src} strategy="afterInteractive" /> : null}
    </>
  );
};
