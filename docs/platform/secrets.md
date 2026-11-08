# Secrets and settings by environment

Where each value lives. Values never go in git, Notion or chat; the
descriptions are in `apps/web/.env.example`. Variables without
`NEXT_PUBLIC_` are server-only (route handlers and `lib/api`), and CI
fails a build whose client bundle names one.

## The site (Vercel → the project → Settings → Environment Variables)

| Name | Production | Preview | Development (`.env.local`) |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://auibsal.org` | the preview’s URL | `http://localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | production project | a separate staging project | the local stack (`bun run db:start`) |
| `SUPABASE_SECRET_KEY` | production project | staging project | the local stack |
| `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN` | `.auibsal.org` | empty | empty |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | the Turnstile widget for auibsal.org | Cloudflare’s test keys | empty (the check is off) |
| `CRON_SECRET`, `DATABASE_WEBHOOK_SECRET`, `REVALIDATE_SECRET` | one value each (`openssl rand -hex 32`) | different values | any |
| `RESEND_TOKEN` | full-access key for auibsal.org | empty, or a test key | empty (emails are logged) |
| `RESEND_WEBHOOK_SECRET` | the webhook’s `whsec_…` | empty | empty |
| `NOTION_TOKEN` | the “SAL Platform” connection | empty | empty, or a test workspace |
| `NOTION_WEBHOOK_SECRET` | the webhook subscription’s verification token | empty | empty (the webhook is off) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | one pair | another pair | another pair |
| `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_WALLET_PRIVATE_KEY` | the issuer’s service account | empty | empty |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET` | Hudhud | empty | a separate test bot |
| `TELEGRAM_LOGIN_CLIENT_SECRET` | Hudhud’s OpenID client secret | empty | empty |

## The database (Supabase → the project)

| Name | Where | What |
| --- | --- | --- |
| `platform.api_url` | `core.settings` | The site’s address, for the outbox webhook and pg_cron |
| The outbox webhook’s Bearer token | Vault (`outbox_webhook_secret`) | Equal to `DATABASE_WEBHOOK_SECRET` |
| The cron token | Vault (`cron_secret`) | Equal to `CRON_SECRET` |

## GitHub (Settings → Secrets and variables)

| Name | Kind | Where | Used by |
| --- | --- | --- | --- |
| `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` | secret | the `production` environment | migrate, backup |
| `BACKUP_PASSPHRASE` | secret | `production` | backup |
| `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | secret | `production` | backup (the second copy) |
| `RESEND_TOKEN` | secret | `production` | backup (the failure email) |
| `VERCEL_DEPLOY_HOOK` | secret, optional | `production` | migrate |
| `NOTION_TOKEN` | secret | repository | CI (the forms register) |
| `REQUIRE_FORMS_REGISTER` | variable, `1` once `NOTION_TOKEN` is set | repository | CI (a missing token then fails) |
| `TURBO_TOKEN` | secret, optional | repository | CI (remote cache) |
| `SUPABASE_PROJECT_REF` | variable | repository | migrate, backup |
| `TURBO_TEAM` | variable, optional | repository | CI |
