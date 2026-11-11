# Moving Vercel and Resend to the Society's own accounts

Prepared Nov 11, 2026; nothing moves until the owner decides who owns the
tool accounts (decisions §19). The steps are the same whichever Society
address owns them; it must be a Society mailbox, never a person's.

## Vercel

1. Create a Vercel account (Hobby is free) with the Society's address and
   turn on two-step verification; invite the two officer admins.
2. From the current team, transfer the `auibsal` project to the new
   account (Project → Settings → Advanced → Transfer). The domains, the
   environment variables and the deployments move with it.
3. Check that the Git connection still points at the repository and that
   `main` still deploys; re-add the GitHub integration if asked.
4. Confirm the domains (auibsal.org, www) show as valid, and the cron
   paths still answer (`/api/cron/*` with `CRON_SECRET`).

## Resend

1. Create a Resend account with the Society's address, two-step
   verification on, the two officer admins invited.
2. Add the domain `auibsal.org` (region eu-west-1) and publish the DKIM,
   SPF (return path) and DMARC records it shows, in Cloudflare DNS; wait
   for Verified.
3. Make an API key with sending access only, and set it as `RESEND_TOKEN`
   in Vercel (Production and Preview) and in GitHub Actions' secrets.
4. Re-create the webhook to `https://auibsal.org/api/hooks/resend` for
   bounces, complaints and unsubscribes, and set its signing secret as
   `RESEND_WEBHOOK_SECRET` in Vercel.
5. Supabase Auth's custom SMTP: set the new key as the SMTP password
   (Authentication → SMTP).
6. Send a test from the Diwan (an announcement's test reaches the
   President), then remove the Society's two keys and the `auibsal.org`
   domain from the old account.

After the move, send the owner the new DNS records and the list of
environment variables that changed.
