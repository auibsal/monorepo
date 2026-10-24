# Ads in Waraq

Waraq's pages on auibsal.org (the front page, each desk and each piece) show
ads to visitors who are **not signed in** (owner, Oct 16, 2026). Anyone
signed in to the Nexus sees none. There are three kinds:

- **Society ads.** Events, open calls, joining SAL. Written in the Nexus by
  whoever keeps the site's content (`content.manage`: the General Secretary,
  the Communications Lead and program leads).
- **Sponsor ads.** Ads from a partner in the partners register. Written by
  the partnership managers (`partners.manage`). A sponsor ad runs only while
  the partner is **active** and has a **signed memorandum in force** that
  grants **Sponsor ads in Waraq** (`advertising`). The Policy Manual's limits
  on sponsors (11.3: no political parties, religious or sectarian bodies,
  tobacco, alcohol or gambling) are checked when the memorandum is drafted
  and signed.
- **Google AdSense.** Fills the spaces that no running Society or sponsor ad
  takes. Nothing loads until it is set up (below).

## How it works

- **Where ads are kept.** In `journal.ads`. Readers never read the table
  itself: auibsal.org asks `journal.current_ads()`, which returns only
  published ads that are within their dates and, for sponsors, allowed
  today. Pages refresh when an ad changes (the `journal` cache tag).
- **Which ad a space shows.** Each space shows one running ad, and the
  spaces on a page take turns through them (`adForSlot` in
  `@repo/sal-data/ads`). When nothing is running, AdSense fills the space.
- **Members.** Each ad space is drawn in the browser. It stays empty when the
  Nexus session cookie is present, which works because the public pages and
  the Nexus share one origin. This
  check only decides what the page shows; it controls no access.
- **Consent.** Once AdSense is set up, the consent card asks about
  **Analytics** and **Advertising**. Until a visitor allows Advertising, Google's ad
  signals (`ad_storage`, `ad_user_data`, `ad_personalization`) stay denied:
  AdSense then shows limited ads that use no cookies and are not chosen for
  the visitor. Society and sponsor ads use no cookies at all.
- **Security.** The page's Content Security Policy allows AdSense's hosts only
  on apps/web, and only while `NEXT_PUBLIC_ADSENSE_CLIENT` is set.
  `auibsal.org/ads.txt` names the Society's AdSense account as the only seller
  of ad space on the site.

## Setting up AdSense (once)

Only the owner or the technical administrator holds these accounts.

1. **Apply.** At [adsense.google.com](https://adsense.google.com), sign up with
   the Society's Google account and add the site `auibsal.org`. Payment and
   tax details belong to whoever the Council decides receives AdSense
   payments. Record that decision in the minutes, and enter AdSense income
   in the Treasury's records like any other income.
2. **Copy the publisher ID** (`ca-pub-` followed by 16 digits).
3. **Create one display ad unit** (Ads → By ad unit → Display ads,
   responsive) and copy its **data-ad-slot** number.
4. **Block what the Policy Manual rules out.** Go to Brand safety → Blocking
   controls → All sites → Sensitive categories. Block gambling, alcohol,
   dating, politics, religion, get-rich-quick and anything else the Council
   would not accept from a sponsor (11.3). Under General categories, also
   block what does not suit a student paper.
5. **Tell the site.** In Vercel → **auibsal** → **Settings** → **Environment
   Variables** (Production), set the following, then redeploy:

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_ADSENSE_CLIENT` | `ca-pub-…` |
   | `NEXT_PUBLIC_ADSENSE_SLOT` | the ad unit's slot number |
   
6. **Ask Google to review the site.** Once
   `https://auibsal.org/ads.txt` shows the publisher line, request the
   review in AdSense. Ads stay blank until Google approves the site.

## Check

1. In a private window, open auibsal.org/waraq. Each ad space shows a
   Society or sponsor ad, or an AdSense ad (blank until AdSense approves the
   site).
2. The consent card lists Analytics and Advertising under **Choose**.
3. Sign in to the Nexus and reload auibsal.org/waraq: no ad spaces.
4. The privacy page (Platform section) describes the ads.

## Writing an ad

Nexus → Administration → **Ads** → **New Society ad** or **New sponsor ad**.
Write a short headline (both languages where possible), an optional line of
text and button text, and a link (an auibsal.org path such as `/join`, or an
`https://` address). Add an image if you like, with a description. Set the
dates, tick **Published**, and save. A sponsor ad also needs its partner.
Without a memorandum that grants advertising it is saved but never shown.
