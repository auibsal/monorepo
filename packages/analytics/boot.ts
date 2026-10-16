// What the public site loads for analytics, worked out from the settings:
// GTM (with GA4 inside it) or GA4 alone, from the Google tag gateway on
// auibsal.org when it is set up, with Google consent mode starting from
// "denied" and following the visitor's choices in Cloudflare Zaraz.

export interface AnalyticsSettings {
  /** The Zaraz purpose for advertising (Waraq's AdSense ads). */
  adsPurpose?: string;
  gaId?: string;
  gatewayPath?: string;
  gtmId?: string;
  zarazPurpose?: string;
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
 * granted only when the Zaraz purpose for analytics is accepted; the three
 * advertising signals only when the purpose for advertising is (AdSense
 * shows limited, cookieless ads until then). Each follows the visitor when
 * they change their mind, and neither purpose ever grants the other's.
 */
export const bootScript = (settings: AnalyticsSettings) =>
  [
    "window.dataLayer=window.dataLayer||[];",
    "function gtag(){dataLayer.push(arguments);}window.gtag=gtag;",
    "gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});",
    "gtag('set','ads_data_redaction',true);",
    `var salPurpose=${inline(settings.zarazPurpose)},salAds=${inline(settings.adsPurpose)};`,
    "function salConsent(){var z=window.zaraz;if(!z||!z.consent||typeof z.consent.get!=='function'){return;}",
    "function on(p){return z.consent.get(p)===true?'granted':'denied';}",
    "if(salPurpose){gtag('consent','update',{analytics_storage:on(salPurpose)});}",
    "if(salAds){var a=on(salAds);gtag('consent','update',{ad_storage:a,ad_user_data:a,ad_personalization:a});}}",
    "document.addEventListener('zarazConsentAPIReady',salConsent);",
    "document.addEventListener('zarazConsentChoicesUpdated',salConsent);",
    "salConsent();",
    start(settings),
  ].join("");
