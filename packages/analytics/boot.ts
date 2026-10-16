// What the public site loads for analytics, worked out from the settings:
// GTM (with GA4 inside it) or GA4 alone, from the Google tag gateway on
// auibsal.org when it is set up, with Google consent mode starting from
// "denied" and following the visitor's answers in the site's consent cookie.

import { CONSENT_SAVED, SITE_CONSENT_COOKIE } from "./consent";

export interface AnalyticsSettings {
  gaId?: string;
  gatewayPath?: string;
  gtmId?: string;
}

const GOOGLE = "https://www.googletagmanager.com";

/** The script that loads GTM or GA4, or null when neither is set. */
export const loaderSrc = ({ gaId, gatewayPath, gtmId }: AnalyticsSettings) => {
  const base = gatewayPath ?? GOOGLE;
  if (gtmId) {
    return `${base}/gtm.js?id=${encodeURIComponent(gtmId)}`;
  }
  if (gaId) {
    return `${base}/gtag/js?id=${encodeURIComponent(gaId)}`;
  }
  return null;
};

// JSON inside an inline <script>: never let a value close the tag.
const inline = (value: unknown) =>
  JSON.stringify(value ?? null)
    .replaceAll("<", "\\u003C")
    .replaceAll(">", "\\u003E")
    .replaceAll(" ", "\\u2028")
    .replaceAll(" ", "\\u2029");

/** What runs once consent is set up: GTM's start event, or GA4's config. */
const start = ({ gaId, gtmId }: AnalyticsSettings) => {
  if (gtmId) {
    return "dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});";
  }
  if (gaId) {
    return `gtag('js',new Date());gtag('config',${inline(gaId)},{allow_google_signals:false,allow_ad_personalization_signals:false});`;
  }
  return "";
};

/**
 * Runs before the loader. Every consent signal starts denied. Analytics is
 * granted only when the visitor allowed "analytics" in the site's consent
 * cookie; the three advertising signals only when they allowed "ads"
 * (AdSense shows limited, cookieless ads until then). Each follows the
 * visitor when they change their mind, and neither ever grants the other.
 */
export const bootScript = (settings: AnalyticsSettings) =>
  [
    "window.dataLayer=window.dataLayer||[];",
    "function gtag(){dataLayer.push(arguments);}window.gtag=gtag;",
    "gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});",
    "gtag('set','ads_data_redaction',true);",
    `function on(p){var m=(document.cookie||'').match(/(?:^|; )${SITE_CONSENT_COOKIE}=([^;]*)/);if(!m){return 'denied';}try{return JSON.parse(decodeURIComponent(m[1]))[p]===true?'granted':'denied';}catch(e){return 'denied';}}`,
    "function salConsent(){var a=on('ads');gtag('consent','update',{analytics_storage:on('analytics'),ad_storage:a,ad_user_data:a,ad_personalization:a});}",
    `document.addEventListener(${inline(CONSENT_SAVED)},salConsent);`,
    "salConsent();",
    start(settings),
  ].join("");
