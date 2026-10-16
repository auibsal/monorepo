# Analytics and consent

auibsal.org counts visits with **Google Analytics 4**, loaded by **Google Tag
Manager**. Both scripts are served from auibsal.org's own address by the
**Google tag gateway** on Cloudflare. **Cloudflare Zaraz** shows the cookie
consent banner, and the site passes each visitor's choice to Google through
consent mode (owner, Oct 15, 2026). The Nexus has no analytics.

## How it fits together

- **Nothing loads until it is set up.** `@repo/analytics` adds Google's
  scripts only when `NEXT_PUBLIC_GTM_ID` (or `NEXT_PUBLIC_GA_ID`, for GA4
  without GTM) is set on the sal-web project.
- **Every consent signal starts denied.** Before GTM loads, the site sets
  `analytics_storage`, `ad_storage`, `ad_user_data` and `ad_personalization`
  to denied.
- **Analytics is granted only by the visitor.** That happens when they accept
  the Zaraz purpose named in `NEXT_PUBLIC_ZARAZ_ANALYTICS_PURPOSE`. If they
  change their mind later, the site updates consent again. The advertising
  signals follow a separate Advertising purpose, used by Waraq's AdSense ads
  (`docs/platform/ads.md`); without it they stay denied.
- **The site asks and remembers.** A small card at the bottom of the page
  (never in the way of the page) asks each new visitor. Their answers are
  kept in the site's own consent cookie, `sal_consent` (one year), and passed
  on to Zaraz for each purpose Zaraz stores. Zaraz lists every purpose but
  stores only some (in practice those with a Zaraz tool assigned; Advertising
  has none), and it rejects a whole save that names one it doesn't store, so
  the site sends Zaraz one purpose at a time. Zaraz's own consent window
  stays off. **Cookie settings** in the footer reopens the card. Both appear
  only where Zaraz consent runs.
- **GA4 is never added as a Zaraz tool.** GTM already loads it, and adding it
  in Zaraz too would count every visit twice.

## Setting it up (once)

Do these steps in this order. Only the owner or the technical administrator
holds these accounts.

### 1. Put auibsal.org behind Cloudflare's proxy

Zaraz, the consent banner and the tag gateway work only on traffic that
passes through Cloudflare. Today auibsal.org is "DNS only": Vercel serves it
directly.

1. In Cloudflare, open auibsal.org → **SSL/TLS** → **Overview** and set the
   mode to **Full (strict)**. Do this before step 2: with Flexible, the site
   redirects in a loop.
2. Open **DNS** → **Records**. Turn the cloud **on (Proxied)** for the
   `auibsal.org` and `www` records only. Leave `nexus`, `api`, `design` and
   the mail records as **DNS only**.
3. Open **Caching** → **Cache Rules** and create a rule: "Hostname equals
   auibsal.org" → **Bypass cache**. Vercel already caches, and publishing
   clears Vercel's cache, not Cloudflare's.
4. In **Speed** → **Optimization**, turn **Rocket Loader off**. It breaks
   Next.js scripts.
5. Check the site afterwards. auibsal.org should still load. In Vercel →
   sal-web → **Settings** → **Domains**, auibsal.org should still say
   *Valid Configuration*. The response headers should include `cf-ray`.

To undo, turn the cloud off again (DNS only).

### 2. Create GA4

1. At [analytics.google.com](https://analytics.google.com), create the
   property "auibsal.org" and a **Web** data stream for
   `https://auibsal.org`.
2. Copy the **measurement ID** (`G-…`).
3. In **Admin** → **Data collection**, leave **Google signals off**. Set
   **Data retention** to 2 months.

### 3. Create the GTM container

1. At [tagmanager.google.com](https://tagmanager.google.com), create a
   **Web** container named "auibsal.org" and copy its ID (`GTM-…`).
2. **Admin** → **Container settings**: turn on **Enable consent overview**.
3. Add a **Google tag** with the GA4 measurement ID and the trigger
   **Initialization – All Pages**. Its built-in consent check is
   `analytics_storage`; leave it as is.
4. **Submit** → **Publish**.

### 4. Turn on the Google tag gateway

In GTM, open **Admin** → **Google tag gateway**, choose **Cloudflare**, and
follow the steps. It connects to your Cloudflare account. If the Cloudflare
dashboard offers the setup instead, search for "Google tag gateway" there.
Choose the measurement path **`/metrics`**.

Keep the gateway's **automatic tag injection off**: the site loads GTM
itself, after it has set every consent signal to denied. Injected by
Cloudflare, GTM loads before that default (and twice), and GA4 sets its
cookies without consent.

When it is done, `https://auibsal.org/metrics/gtm.js?id=GTM-…` should return
JavaScript. If Google's setup screen shows a different script address, tell
the developer; the site builds `<path>/gtm.js?id=…` and may need to match.

### 5. Turn on Zaraz consent

1. In Cloudflare, open auibsal.org → **Zaraz** and enable it.
2. In **Zaraz** → **Consent**, turn on **consent management**. Turn **Show
   consent modal** and **Use IAB TCF compliant modal** off: the site shows
   its own card. Add one purpose, **Analytics** ("Counting visits with Google Analytics; no
   advertising"), and give it an Arabic name and description if Zaraz
   offers translations.
3. Copy the purpose's **ID**: a short code shown next to it.
4. Under **Assign purposes to tools**, give every tool (Cloudflare
   Monitoring included) the Analytics purpose.
5. Do **not** add Google Analytics, or anything else that loads Google's
   scripts, under **Zaraz** → **Tools**. GTM loads GA4.

### 6. Tell the site

In Vercel → **sal-web** → **Settings** → **Environment Variables**
(Production), set the following, then redeploy:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_GTM_ID` | `GTM-…` |
| `NEXT_PUBLIC_TAG_GATEWAY_PATH` | `/metrics` |
| `NEXT_PUBLIC_ZARAZ_ANALYTICS_PURPOSE` | the Zaraz purpose ID |

Leave `NEXT_PUBLIC_GA_ID` empty: GA4 lives in the GTM container.

### 7. Check

1. Open auibsal.org in a private window. The consent card appears at the
   bottom of the page, and the page still scrolls and clicks behind it.
2. Decline, then look at GA4 → **Reports** → **Realtime**: no visit appears.
3. Open **Cookie settings** in the footer, choose Allow and reload: the
   visit appears within a minute.
4. GTM's **Preview** (Tag Assistant) shows consent `analytics_storage`
   changing from denied to granted.
5. The privacy page (auibsal.org/privacy, Platform section) now says the site
   uses GA4 through GTM and sets cookies only with consent.

## Events

Pages record events with `track()` from `@repo/analytics/client`; the names
are listed in `packages/analytics/events.ts`. They reach GA4 through the
Google tag in GTM, under the same consent.
