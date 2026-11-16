# Settings the owner sets by hand

What the code can't set, with the exact values (decisions.md, The site:
Tools and settings; Subdomains). Tick each in PROGRESS.md when done.

## Cloudflare (auibsal.org)
What Cloudflare can do at the edge, it does, not the site (the owner, Nov
16, 2026; decisions.md, The site: "every feature that protects it"). The
site keeps only what needs the page or the database: the CSP with each
request's nonce, the other response headers, Turnstile's check and the
rate limits per form and per account. Each thing lives in one place, never
both: the `*.vercel.app` addresses are behind Vercel's login, so every
visitor comes through Cloudflare.

Turn **on**:
- **Security → WAF:** the free managed rules.
- **DDoS protection:** on by default; leave it on.
- **SSL/TLS → Overview:** Full (strict). **Edge Certificates:** Always Use
  HTTPS on; **Minimum TLS Version: TLS 1.2** (NIST SP 800-52 Rev. 2);
  TLS 1.3 on; **HTTP Strict Transport Security (HSTS):** on, Max Age 12
  months, Apply HSTS policy to subdomains on, Preload on, **No-Sniff
  header off** (the site sends `X-Content-Type-Options` with its other
  headers, which stay together in `lib/security`). The site no longer
  sends its own HSTS header.
- **Security → Settings → security.txt:** Contact
  `mailto:security@auibsal.org`; Policy `https://auibsal.org/security`;
  Preferred languages `en, ar`; Canonical
  `https://auibsal.org/.well-known/security.txt`; Expires a year ahead
  (renew it each September with the other yearly checks). The site no
  longer serves its own.
- **Security → Settings → Client-side security (Page Shield):** continuous
  script monitoring on. It lists every script the pages load and flags new
  ones; the site has no report address of its own.
- **Security → Settings → Block AI bots** (decisions.md, The site), and
  the managed robots.txt: Security → Settings, filter by Bot traffic →
  **AI Crawler and Agent access policies** → Training: **Disallow**, and
  **Enable Bot Preference Sync** on. Cloudflare puts the AI crawlers'
  Disallow lines before the site's own robots.txt, which keeps only the
  search engines' rule and the sitemap.
- **Caching → Configuration:** Standard caching for files; leave Browser
  Cache TTL as "Respect existing headers" (the site sets them). No Cache
  Rule caches pages: Vercel caches them and refreshes each on publish, so
  Cloudflare passes pages through (`cf-cache-status: DYNAMIC`) and caches
  only the files, a year for the built ones.
- **Speed → Optimization:** Brotli on; **Early Hints** on (Cloudflare sends
  the site's font and script preloads before the page); HTTP/3 on;
  **0-RTT off** (a resumed connection's first request can be replayed).
- **DNS:** DNSSEC on; the CAA records as Cloudflare manages them for its
  certificates; **Email → DMARC Management** on (the reports of
  `_dmarc`'s `p=reject` go to it).
- **Network:** "True-Client-IP Header" or "Pseudo IPv4" off, and keep the
  default `CF-Connecting-IP`, so the real visitor address reaches Vercel
  (the rate limits read it).

Leave **off**:
- **Bot Fight Mode** (decisions.md, The site): on the free plan nothing can
  exempt the webhooks (Telegram, Resend, Notion, Supabase, Vercel) from it.
  JavaScript Detections still runs on the free plan; Cloudflare offers no
  switch for it below Super Bot Fight Mode.
- **Scrape Shield → Email Address Obfuscation** (it rewrites the page and
  breaks the CSP).
- **Speed → Optimization → Rocket Loader** and any **Auto Minify** left
  on (they rewrite scripts and break the CSP's nonces).
- **Zaraz** (decisions.md, The site: no Tag Manager or Google Analytics).
- **Speed → Optimization → Speed Brain:** the site already loads the next
  page ahead of a click and opens it in place, so the whole pages Speed
  Brain fetches are never used.
- **Email → Email Routing:** mail is Zoho's (the MX records).
- **Scrape Shield → Hotlink Protection:** Telegram and Notion show the
  site's images in their previews.
- **Analytics → Web Analytics** automatic setup (the CSP blocks it; Vercel's
  analytics are used).

## Email: delivery standards (auibsal.org)
In place: SPF, DKIM (Zoho, Resend, Resend's news domain), DMARC at
`p=reject` with strict alignment (reports to Cloudflare's DMARC
Management), DNSSEC, and the CAA records' `iodef`.

**MTA-STS and TLS-RPT** (RFC 8461 and 8460): servers sending to
@auibsal.org deliver only over TLS to Zoho's MX hosts, and report any
failure. The policy is served by a Cloudflare Worker at
`https://mta-sts.auibsal.org/.well-known/mta-sts.txt`, built from
`infra/mta-sts` (its README has the deploy settings, the DNS records and
how to change the policy); the site has no copy of it.
1. Zoho: an alias `tls-reports@auibsal.org` to the web lead (the daily
   reports are JSON; nobody needs them in hello@).
2. Cloudflare → DNS: TXT `_smtp._tls`, `v=TLSRPTv1;
   rua=mailto:tls-reports@auibsal.org`, and TXT `_mta-sts`, `v=STSv1;
   id=…` (the date and time).
3. After two weeks of clean reports: `mode` to `enforce` in
   `infra/mta-sts/src/index.js`, and a new `id` in `_mta-sts`. Any change
   to the MX records or the policy needs both.

**DKIM at 2048 bits:** Zoho signs with the selector `zoho202611`
(2048-bit; the provider, then the year and month the key was made). Each
year a new key is added beside it (`zoho202711`), made the default, and
the old one removed a week later, once mail signed with it has arrived
(M3AAWG and NIST SP 800-177: 2048 bits, a yearly rotation). Resend chooses
its own keys.

**BIMI** (the logo beside the Society's mail in inboxes) is not used: Gmail
and Apple Mail show it only with a paid mark certificate (decisions.md:
money, none).

## news.auibsal.org (bulk email)
Done: the domain is verified in Resend and `RESEND_BULK_DOMAIN` is set in
Vercel (Production). The steps, for a new domain or a move:

1. Resend → Domains → Add `news.auibsal.org`.
2. Add the DNS records Resend shows (SPF `send.news`, DKIM
   `resend._domainkey.news`, the MX for bounces) in Cloudflare, DNS only
   (gray cloud).
3. Once verified, set `RESEND_BULK_DOMAIN` = `news.auibsal.org` in Vercel
   (Production). Announcements then come from "AUIB Society of Arts and
   Letters" <news@news.auibsal.org> with replies to hello@, and the Sunday
   Paper from "Qirtas" <qirtas@news.auibsal.org> with replies to
   qirtas@auibsal.org. Without it both send from auibsal.org.

## Resend
- **Settings → Tracking:** open and click tracking off.
- **Webhooks:** `https://auibsal.org/api/hooks/resend` for
  `email.bounced` and `email.complained` (in place).
- **API keys:** one sending-only key per use (the site, the backup's failure
  email), each restricted to its domain; rotate each September.

## Supabase
- **Authentication → Sign In / Providers → Email:** Confirm email on;
  Secure email change on; minimum password length 12, no required
  characters; secure password change on; require current password when
  updating on (Settings asks for it; a reset from the email never does);
  email OTP length 8, expiry 3600 seconds (decisions.md, Members; the
  local stack's `config.toml` matches, except the current-password
  setting, which it has no key for). **Attack Protection:** CAPTCHA (Turnstile) on; leaked
  password protection (a Pro plan setting) on.
- **Authentication → Sessions:** JWT expiry 3600 seconds (an hour);
  refresh token reuse interval 10 seconds.
- **Database → Network Restrictions:** where the plan allows, only the
  addresses that need the database directly.
- **Authentication → Hooks → Send Email:** on, HTTPS,
  `https://auibsal.org/api/hooks/auth-email`, with the secret that is
  `SEND_EMAIL_HOOK_SECRET` in Vercel. Every auth email (confirmation, reset,
  address change) is the site's own template (`@repo/email`), sent through
  Resend. While the hook is on, Supabase never uses SMTP: **Authentication
  → Emails → SMTP Settings** stays empty (Resend's "SMTP" key is deleted),
  so there is one way auth email leaves. The templates in
  `packages/database/supabase/templates` serve only the local stack.
- **API → Exposed schemas:** `public`, `graphql_public`, `core`, `access`,
  `membership`, `events`, `journal`, `programmes`, `governance` and
  `content` (the list in `config.toml`, `[api] schemas`). Without one, every
  read of that schema fails with PGRST106; the site's published pages
  then render empty sections and the Diwan cannot load.
- **Settings → API Keys:** the publishable and secret keys only; **Legacy
  API keys (anon, service_role): disabled**. Nothing reads them, and
  Vercel's `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_JWT_SECRET` and the rest of the old integration's variables are
  deleted (`docs/platform/secrets.md`).

## status.auibsal.org
The uptime check is the one thing the site cannot do for itself: it has to
run from outside. Until it exists, `status` must not point anywhere.
1. A free status page fed by the uptime check (Better Stack's free plan, in
   the Society's own team, not another organization's), checking
   `https://auibsal.org` and `https://auibsal.org/api/health` every three
   minutes, alerting the web lead.
2. Then, in Cloudflare, a CNAME `status` to the address the status
   service gives, DNS only. A CNAME with no status page behind it lets
   anyone who claims the name on that service show their page at
   status.auibsal.org, so the record exists only while the page does.

## Telegram
- Hudhud is an admin in both groups with every right but Remain Anonymous, **Add New Admins included**: it makes the officers admins (`docs/platform/telegram.md`).
