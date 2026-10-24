# Analytics and consent

auibsal.org counts visits with **Google Analytics 4**, loaded by **Google Tag
Manager**. Both scripts are served from auibsal.org's own address by the
**Google tag gateway** on Cloudflare. The site asks for consent itself, with
its own card, and passes each visitor's choice to Google through consent mode
(owner, Oct 15, 2026; the site's own card replaced Cloudflare Zaraz on Oct 16,
2026). The Diwan has no analytics.

## How it fits together

- **Nothing loads until it is set up.** `@repo/analytics` adds Google's
  scripts only when `NEXT_PUBLIC_GTM_ID` (or `NEXT_PUBLIC_GA_ID`, for GA4
  without GTM) is set on the auibsal project.
- **Every consent signal starts denied.** Before GTM loads, the site sets
  `analytics_storage`, `ad_storage`, `ad_user_data` and `ad_personalization`
  to denied.
- **Analytics is granted only by the visitor.** That happens when they allow
  Analytics on the consent card. If they change their mind later, the site
  updates consent again. The advertising signals follow a separate
  Advertising choice, asked only while Qirtas's AdSense ads are switched on
  (`docs/platform/ads.md`); without it they stay denied.
- **The site asks and remembers.** A small card at the bottom of the page
  (never in the way of the page) asks each new visitor about what is
  switched on. Their answers are kept in the site's own cookie,
  `sal_consent` (one year), which the boot script reads on every page.
  **Cookie settings** in the footer reopens the card. No third-party consent
  tool is involved: Cloudflare Zaraz was used at first, but it saved only
  some answers (it stores only purposes that have a Zaraz tool), so it was
  dropped.

## Setting it up (once)

Do these steps in this order. Only the owner or the technical administrator
holds these accounts.

### 1. Put auibsal.org behind Cloudflare's proxy

The tag gateway works only on traffic that passes through Cloudflare. auibsal.org
and www have been proxied since October 2026; these steps record how.

1. In Cloudflare, open auibsal.org → **SSL/TLS** → **Overview** and set the
   mode to **Full (strict)**. Do this before step 2: with Flexible, the site
   redirects in a loop.
2. Open **DNS** → **Records**. Turn the cloud **on (Proxied)** for the
   `auibsal.org` and `www` records. The mail records stay **DNS only**;
   `nexus`, `api` and `design` can follow (see the end of this section).
3. Open **Caching** → **Cache Rules** and create a rule: "Hostname equals
   auibsal.org" → **Bypass cache**. Vercel already caches, and publishing
   clears Vercel's cache, not Cloudflare's.
4. In **Speed** → **Optimization**, turn **Rocket Loader off**. It breaks
   Next.js scripts.
5. Check the site afterwards. auibsal.org should still load. In Vercel →
   auibsal → **Settings** → **Domains**, auibsal.org should still say
   *Valid Configuration*. The response headers should include `cf-ray`.

To undo, turn the cloud off again (DNS only).

The API routes share the site's host, so they are proxied with it: their
form rate limits read the visitor's address from `CF-Connecting-IP` when a
request comes from Cloudflare (`packages/security/form.ts`). Add a
Cloudflare configuration rule "URI Path starts with /api/" that turns
**Browser Integrity Check** off and sets the security level to
**Essentially off**, and a cache rule that bypasses the cache. Leave **Bot
Fight Mode** off for the zone: on the free plan it cannot be skipped per
hostname. Webhooks, cron, calendar apps and `/v1` clients cannot solve a
challenge.
`nexus` and `design` may be proxied with the same settings as auibsal.org
(Full (strict), cache bypass, Rocket Loader off); nothing in them depends on
the visitor's address. Mail and verification records stay DNS only.

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

### 5. Keep Zaraz off

The site asks for consent itself. In Cloudflare, open auibsal.org → **Zaraz**
and leave it **disabled** (if it was enabled earlier, disable it). With Zaraz
on, its own consent window can appear on top of the site's card. Never load
GA4 through Zaraz either: GTM already loads it, and it would count every
visit twice.

### 6. Tell the site

In Vercel → **auibsal** → **Settings** → **Environment Variables**
(Production), set the following, then redeploy:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_GTM_ID` | `GTM-…` |
| `NEXT_PUBLIC_TAG_GATEWAY_PATH` | `/metrics` |

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
