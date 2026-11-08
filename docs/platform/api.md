# API routes

Every route under auibsal.org/api (`apps/web/app/api`). Routes carry no
language. “Member” means a signed-in caller identified with
`authenticateRequest` (the user’s Supabase token as a Bearer); “+ permission”
means the route re-checks a permission with `hasPermission`. Public forms
check Turnstile (`lib/api/turnstile.ts`) and a limit per address in the
database (`withinRateLimit`).

Webhooks (calls from outside services) live under `/api/hooks/*`, the
scheduled jobs under `/api/cron/*`. Errors are RFC 9457 problem details (`application/problem+json`, from
`lib/api/problem.ts`): `type`, `title` and `status`, with the route's short
code in `error` (`"unauthorized"`, `"invalid_request"`, …), which the
Diwan's `callApi` reads. Shared secrets are checked by one helper,
`hasBearer` (`lib/api/bearer.ts`), in constant time, failing closed when
the secret is unset.

| Route | Method | Caller | Auth | Limit |
| --- | --- | --- | --- | --- |
| `/api/account/delete` | POST | The member, from Settings | Member, signed in within 15 minutes | — |
| `/api/account/export` | POST | The member (Download your data) | Member | — |
| `/api/associate-requests` | POST | Anyone, from /join | Turnstile | per address |
| `/api/calendar/events/<slug>` | GET | Anyone (Add to calendar) | Public | cached |
| `/api/calendar/feed/<token>` | GET | A member’s calendar app | The feed’s secret token | — |
| `/api/calendar/sal.ics` | GET | Anyone (the public calendar, `/calendar.ics`) | Public | cached |
| `/api/cron/calendar-sync` | GET, POST | Vercel Cron (GET), pg_cron (POST) | `CRON_SECRET` Bearer | hourly |
| `/api/cron/notion-sync` | GET, POST | Vercel Cron, pg_cron | `CRON_SECRET` Bearer | every 15 minutes |
| `/api/cron/retention` | GET | Vercel Cron | `CRON_SECRET` Bearer | daily |
| `/api/cron/telegram` | GET, POST | Vercel Cron, pg_cron | `CRON_SECRET` Bearer | every 10 minutes |
| `/api/design/[...path]` | GET | Staff’s browser (the design system at `/_design`) | Staff session cookie | — |
| `/api/email/stop` | POST | The stop page; mail apps’ one-click unsubscribe (RFC 8058) | The email’s signed token | — |
| `/api/exports/<name>` | POST | The Diwan | Member + permission per export | — |
| `/api/files/agreement` | POST | A writer | Member | — |
| `/api/files/blind` | POST | A reader | Member (assigned reader) | — |
| `/api/files/rights` | POST | The Company | Member + permission | — |
| `/api/files/submission` | POST | A writer | Member | — |
| `/api/qirtas/images` | POST | A Qirtas editor (a piece accepted from a submission takes the writer's images, metadata stripped) | Member (the piece's editor, under RLS) | — |
| `/api/forms/sign` | POST | Anyone signing without an account; anonymous concerns | Turnstile, or a single-use form link | per address |
| `/api/health` | GET | Uptime checks | Public (`no-store`) | — |
| `/api/hooks/outbox` | POST | The Supabase database webhook on `core.outbox` | `DATABASE_WEBHOOK_SECRET` Bearer | — |
| `/api/hooks/telegram` | POST | Telegram (Hudhud’s webhook) | `TELEGRAM_WEBHOOK_SECRET` header | — |
| `/api/hooks/wallet` | POST | Google Wallet (a pass saved or removed) | Google’s signed message | — |
| `/api/hooks/notion` | POST | Notion (a page changed: starts the sync, once a minute at most) | `X-Notion-Signature` HMAC (`NOTION_WEBHOOK_SECRET`) | one a minute |
| `/api/hooks/resend` | POST | Resend (bounces and complaints) | Svix signature (`RESEND_WEBHOOK_SECRET`) | — |
| `/api/invitations/test` | POST | The Diwan (an invitation list’s test) | Member + permission | — |
| `/api/newsletter/confirm` | POST | The confirmation page | The emailed token | — |
| `/api/newsletter/subscribe` | POST | Anyone (the Sunday Paper sign-up) | Turnstile | per address, 3 confirmations in 30 days |
| `/api/newsletter/unsubscribe` | POST | The unsubscribe page; one-click unsubscribe | The emailed token | — |
| `/api/notion/status` | POST | The Diwan’s Connected panel | Member + permission | — |
| `/api/password-check` | GET | Sign-up, reset and change | Public (k-anonymity prefix only) | — |
| `/api/personal-email/confirm` | POST | The confirmation page | The emailed token | — |
| `/api/push/test` | POST | The member’s notification settings | Member | — |
| `/api/removal-requests` | POST | Anyone (a request to take something down) | Turnstile | per address |
| `/api/revalidate` | POST | Outside callers refreshing published pages | `REVALIDATE_SECRET` Bearer | — |
| `/api/telegram/link` | POST | The member (link Telegram) | Member | — |
| `/api/telegram/setup` | POST | The Diwan (set the webhook) | Member + permission | — |
| `/api/tour/photo` | POST | Whoever runs the Tour; the page’s writer | Member | — |
| `/api/tour/station` | POST | A volunteer on a station shift | Member, during the shift | — |
| `/api/two-step/recover` | POST | The member, with a recovery code | Member | per account |
| `/api/two-step/recovery-codes` | POST | The member | Member (aal2) | — |
| `/api/two-step/reset` | POST | Whoever holds `roles.assign` | Member + permission | — |
| `/api/wallet/google` | POST | The member (Add to Google Wallet) | Member | — |

The scheduled jobs that call these, and those that run inside Postgres,
are in `docs/platform/overview.md` (Scheduled jobs).
