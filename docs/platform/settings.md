# Settings the owner sets by hand

What the code can't set, with the exact values (decisions.md, The site:
Tools and settings; Subdomains). Tick each in PROGRESS.md when done.

## Cloudflare (auibsal.org)
Turn **on**:
- **Security → WAF:** the free managed rules.
- **Security → Bots:** Bot Fight Mode.
- **DDoS protection:** on by default; leave it on.
- **SSL/TLS → Overview:** Full (strict). **Edge Certificates:** Always Use
  HTTPS on; HSTS stays as it is (the site sends its own header).
- **Caching → Configuration:** Standard caching for files; leave Browser
  Cache TTL as "Respect existing headers" (the site sets them).
- **Network:** "True-Client-IP Header" or "Pseudo IPv4" off, and keep the
  default `CF-Connecting-IP`, so the real visitor address reaches Vercel
  (the rate limits read it).

Turn **off**:
- **Scrape Shield → Email Address Obfuscation** (it rewrites the page and
  breaks the CSP).
- **Speed → Optimization → Rocket Loader** and any **Auto Minify** left
  on (they rewrite scripts and break the CSP's nonces).
- **Analytics → Web Analytics** automatic setup (the CSP blocks it; Vercel's
  analytics are used).

## news.auibsal.org (bulk email)
1. Resend → Domains → Add `news.auibsal.org`.
2. Add the DNS records Resend shows (SPF `send.news`, DKIM
   `resend._domainkey.news`, the MX for bounces) in Cloudflare, DNS only
   (gray cloud).
3. Once verified, set `RESEND_BULK_DOMAIN` = `news.auibsal.org` in Vercel
   (Production). Announcements then come from "AUIB Society of Arts and
   Letters" <news@news.auibsal.org> with replies to hello@, and the Sunday
   Paper from "Qirtas" <qirtas@news.auibsal.org> with replies to
   qirtas@auibsal.org. Until then both send from auibsal.org.

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
- Hudhud stays an admin in both groups with **Add New Admins off**.
