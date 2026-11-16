# Settings the owner sets by hand

What the code can't set, with the exact values (decisions.md, The site:
Tools and settings; Subdomains). Tick each in PROGRESS.md when done.

## Cloudflare (auibsal.org)
What Cloudflare can do at the edge, it does, not the site (the owner, Nov
16, 2026; decisions.md, The site: "every feature that protects it"). The
site keeps only what needs the page or the database: the CSP with each
request's nonce, the other response headers, Turnstile's check and the
rate limits per form and per account.

Turn **on**:
- **Security → WAF:** the free managed rules.
- **DDoS protection:** on by default; leave it on.
- **SSL/TLS → Overview:** Full (strict). **Edge Certificates:** Always Use
  HTTPS on; **Minimum TLS Version: TLS 1.2** (NIST SP 800-52 Rev. 2);
  TLS 1.3 on; **HTTP Strict Transport Security (HSTS):** on, Max Age 12
  months, Apply HSTS policy to subdomains on, Preload on, No-Sniff header
  on. The site no longer sends its own HSTS header.
- **Security → Settings → security.txt:** Contact
  `mailto:security@auibsal.org`; Policy `https://auibsal.org/security`;
  Preferred languages `en, ar`; Canonical
  `https://auibsal.org/.well-known/security.txt`; Expires a year ahead
  (renew it each September with the other yearly checks). The site no
  longer serves its own.
- **Security → Settings → Client-side security (Page Shield):** continuous
  script monitoring on. It lists every script the pages load and flags new
  ones; the site has no report address of its own.
- **Security → Settings → Block AI bots** (decisions.md, The site).
- **Caching → Configuration:** Standard caching for files; leave Browser
  Cache TTL as "Respect existing headers" (the site sets them).
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
- **Analytics → Web Analytics** automatic setup (the CSP blocks it; Vercel's
  analytics are used).

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
  Secure email change on.
- **Authentication → Attack Protection:** Leaked password protection on.
- **Authentication → Sessions:** JWT expiry 3600 seconds (an hour);
  refresh token reuse interval 10 seconds.
- **Database → Network Restrictions:** where the plan allows, only the
  addresses that need the database directly.
- **Authentication → Emails → SMTP Settings:** host `smtp.resend.com`, port
  465, user `resend`, the sending key as the password, sender
  `hello@auibsal.org`, name "AUIB Society of Arts and Letters". The
  templates are in `packages/database/supabase/templates`.

## status.auibsal.org
1. A free status page fed by the uptime check (for example Better Stack's
   free plan), checking `https://auibsal.org` and
   `https://auibsal.org/api/health` every three minutes.
2. In Cloudflare, a CNAME `status` to the address the status service gives,
   DNS only.

## Telegram
- Hudhud is an admin in both groups with every right but Remain Anonymous, **Add New Admins included**: it makes the officers admins (`docs/platform/telegram.md`).
