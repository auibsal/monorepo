# Accounts and access

Every service the platform runs on, what it does, and who must hold it.

Policy P15 and Bylaws B11.3 apply to the platform too: **every account has at least two administrators on the Council, with two-step verification on, and access moves within seven days of a handover.** Passwords live in the Society's password manager, never in chats or documents.

| Service | What it does for SAL | Plan and free limits |
| --- | --- | --- |
| GitHub (`auibsal/mono`) | The code, CI, nightly backups, Dependabot, CodeQL | Free (public repository) |
| Vercel (team `theideaiq`) | Hosts the auibsal project, the one app (auibsal.org, /diwan, /api); daily keep-alive cron | Pro for now; Hobby is free: 100 deployments a day, cron jobs at most once a day, one member |
| Supabase (project `auibsal.org`, Frankfurt) | Postgres, sign-in (also for the design system and third-party apps), file storage, scheduled jobs, live co-editing (Realtime) | Free: 500 MB database, 1 GB files; pauses after 7 idle days (the keep-alive cron prevents it); no downloadable backups (the nightly GitHub backup covers it) |
| Cloudflare | DNS for auibsal.org; the Google tag gateway once auibsal.org is proxied ([Analytics](analytics.md)) | Free |
| Google Analytics 4 and Tag Manager | Visit counts on auibsal.org, with consent ([Analytics](analytics.md)) | Free |
| Resend | Every email the platform sends, including sign-in links | Free: 100 emails a day, 3,000 a month. Emails over the limit wait in the outbox until it resets |
| Sentry (EU) | Errors and server logs from the app | Free Developer plan: 5,000 errors a month, one user |
| BetterStack | Uptime monitors for the site, the sign-in page and the API health check | Free |
| Arcjet | Protects the public removal-request form | Free after the trial: 10,000 requests a month, then a hard stop (no bill); the form keeps working when it is spent |
| Google Analytics 4 | Visitor counts on the public site only | Free |
| Cloudflare Turnstile | The human check on sign-up, sign-in and password reset (Supabase Auth → Attack Protection; site key `NEXT_PUBLIC_TURNSTILE_SITE_KEY` on the auibsal project, secret in Supabase) | Free |
| Cloudflare Email Routing | Forwards mail to hello@auibsal.org (and any role addresses) to officers' inboxes | Free |
| Cloudflare R2 | Turned on, not used yet: room for files if Supabase Storage's free 1 GB runs short | Free up to 10 GB; a card is on file |

## Where secrets live

| Secret | Held by |
| --- | --- |
| Supabase secret key, Resend token, cron and webhook secrets, Arcjet key, Notion token, Telegram token and secrets, Web Push private key (`VAPID_PRIVATE_KEY`), revalidation secret | The auibsal project in Vercel, Production, marked sensitive; read only by the API routes |
| Supabase access token and database password | GitHub → Settings → Environments → production (used by the migration workflow) |
| Backup passphrase | GitHub production environment; also kept in the password manager, since a backup is useless without it |

The pages and the Diwan read only the public keys; the database enforces the rules.

## Passkeys

Members can sign in with a passkey (fingerprint, face or screen lock) and manage them under Membership, Profile (auibsal.org/membership/profile). The settings live in Supabase → Authentication → Passkeys:

| Setting | Value | Why |
| --- | --- | --- |
| Relying Party ID | `auibsal.org` | Passkeys work only on this domain and its subdomains. **Never change it**: every passkey already registered stops working. |
| Relying Party Origins | `https://auibsal.org` (sign-in and the account are on the site itself since October 24, 2026) | The exact pages allowed to ask for a passkey. Safe to edit at any time. |
| Display name | `AUIB Society of Arts and Letters` | Shown in the device's passkey prompt. |

A passkey sign-in counts as the first step only: officers whose roles need two-step sign-in still enter their authenticator code afterwards.

## Lost authenticator

Two ways back in, both of which remove the lost authenticator app so the officer sets up a new one at once:

- **Recovery codes.** The Diwan's overview asks every officer whose role needs two-step sign-in to make ten one-time codes, and again when three or fewer are left. They are shown once; only keyed hashes are stored (`access.recovery_codes`). At the code prompt, "Lost your phone? Use a recovery code" spends one.
- **A reset.** Whoever holds `roles.assign` opens the person's page in the Diwan (Members) and chooses "Reset two-step sign-in". Check it's really them first (in person, or from their AUIB address). It also removes their recovery codes. Nobody can reset their own.

Every reset is recorded in `access.two_step_resets` (and the activity log) and emails the person, so one they didn't ask for is noticed. Supabase's own recovery codes are still experimental and can't be turned on from `config.toml`, so the platform keeps its own.

The hashes are keyed with `SUPABASE_SECRET_KEY`. Rotating that key makes every saved set stop working: tell the officers to make new codes from the Diwan's overview right after a rotation.

## Handing the platform over

1. **Add the incoming administrator.** Invite them to the GitHub organization, the Vercel team, the Supabase organization, Cloudflare, Resend, Sentry, BetterStack and Arcjet, with admin rights.
2. **Walk through a release.** Merge one small pull request together and watch CI, the migration workflow and the Vercel deployments go green. See [Releases and migrations](releases.md).
3. **Restore a backup together.** Practice the [restore](backups.md) into a scratch project once, so it is not new on the day it matters.
4. **Remove the outgoing administrator.** Within seven days of the handover (B11.3), unless they stay on as one of the two required administrators.
