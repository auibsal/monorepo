# Email

Every email the platform sends, who sends it, and the settings that keep it
working. Checked end to end on 2026-10-25 (`apps/e2e`: sign-up by link,
sign-in by emailed code).

## Two senders, one domain

| Sender | What | From | Templates |
| --- | --- | --- | --- |
| **Supabase Auth** (custom SMTP through Resend) | Sign-in links and codes, sign-up confirmation, password reset, email change, security notices | `hello@auibsal.org` | `packages/database/supabase/templates` (pasted into the hosted project) |
| **The site's outbox** (`lib/api/outbox.ts`, Resend API) | Everything else, below | `RESEND_FROM` | `packages/email` (`copy.ts`, `templates/notice.tsx`) |

The domain `auibsal.org` is verified in Resend (DKIM `resend._domainkey`,
return path `send.auibsal.org`). DMARC is `p=reject` with strict alignment:
mail passes on DKIM. Anything sent as `@auibsal.org` from elsewhere is
rejected, so every sender must go through Resend.

## Auth emails (Supabase)

One language per email (Arabic when the member signed up in Arabic,
`user_metadata.locale`); the subjects are in both, since Supabase subjects
can't choose. Paste each file into **Authentication → Emails** with the
subject from `templates/subjects.txt`.

| Template | When | Notes |
| --- | --- | --- |
| Magic link | "Email me a sign-in link" | The link **and a code**: the code works where the link can't be opened (another device, an app's own browser, a mail scanner that used the link) |
| Confirm signup | A new account | Link and code |
| Reset password | Forgot password | Link |
| Change email address | A new sign-in address | Link, sent to the new address |
| Password changed, Email changed, MFA added, MFA removed | After the change (**Security notifications**, turn each on) | No link to press; says what to do if it wasn't the member |

Every link goes to `{{ .SiteURL }}/auth/confirm`, which signs in only when
the member presses the button, so scanners that open links change nothing.

## Site emails (the outbox)

Database triggers and the daily notices queue a row in `core.outbox`; the
database calls `/api/hooks/outbox` (`DATABASE_WEBHOOK_SECRET`) and the
route sends it. Each email has an HTML and a plain-text part, an
idempotency key (a retry never sends twice), and goes to the member's
phone and Telegram too when they turned those on.

| Kind | To | Optional? |
| --- | --- | --- |
| `events.rsvp_confirmed`, `events.waitlist_promoted` | The member | No |
| `events.reminder` | Booked: the member; "Remind me": whoever asked | Booked reminders follow "Email me about events…"; "Remind me" was asked for |
| `journal.*` (received, decision, agreement, final check, notes, published, returned for formatting) | The author | No |
| `journal.call_opened` | Whoever asked "Tell me when" | They turn it off on the page |
| `journal.sunday_paper` | Every member who takes the optional emails | Yes: a stop link and one-click unsubscribe (`/emails/stop`) |
| `newsletter.confirm`, `newsletter.monthly` | Newsletter subscribers | Double opt-in; unsubscribe link and one-click |
| `personal_email.confirm` | The new personal address | No |
| `membership.verification_decided` | An account from outside AUIB | No |
| `access.role_ending`, `programmes.*`, `platform.cron_failed` | Officers | No |
| `access.two_step_reset` | The person whose authenticator was removed (by an officer or a recovery code) | No |

"Email me about events, calls and Society notices" (`notify_email`, in
Profile and in setup) covers the optional ones: the Sunday Paper and
booked-event reminders. The stop link turns it off without signing in; the
link is signed (`lib/api/email-stop.ts`) and the page needs a button press.

## Settings to keep right

**Supabase → Authentication**

- URL Configuration: Site URL `https://auibsal.org`; Redirect URLs
  `https://auibsal.org/**`.
- Emails → SMTP: host `smtp.resend.com`, port `465`, user `resend`,
  password a Resend API key with sending access to `auibsal.org`, sender
  `hello@auibsal.org`, name "AUIB Society of Arts and Letters". The key must
  belong to the Resend account where `auibsal.org` is verified now (added
  again on 2026-10-24): a key from before then sends nothing.
- Emails → templates: the files above. Security notifications: on.
- Rate limits: emails per hour at least 60 (custom SMTP starts at 30).
- Attack Protection → CAPTCHA: Turnstile, with the **secret** of the same
  widget whose site key is `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.

**Cloudflare**

- Turnstile → the widget: hostnames `auibsal.org` and `www.auibsal.org`;
  mode Managed. A widget made for `nexus.auibsal.org` fails on the site
  (error 110200, shown under the form).
- Security: the sign-in pages must not get a full-page challenge. If Bot
  Fight Mode or a WAF rule challenges visitors from Iraq, members see
  "Verifying you are human" loop before the page loads; skip
  `/sign-in`, `/sign-up`, `/forgot-password`, `/auth/*` and `/api/*`.

**Resend**

- The free plan sends 100 emails a day across the whole account, and this
  account also sends for another project. A busy day (the Sunday Paper to
  every member) can leave sign-in emails without quota: Supabase then fails
  to send and the member waits for an email that never comes. Give the
  Society its own Resend account, or move to a paid plan, before the member
  list passes about 60.

## When someone says "I never got the email"

1. Resend → Emails: was it sent, delivered, bounced? (A bounce is usually a
   typo in the address.)
2. Nothing in Resend: Supabase didn't send. Check the SMTP key, the rate
   limit, and Authentication → Logs.
3. Delivered but not seen: the spam or "Other" folder; AUIB mail sometimes
   holds new senders. The code in the email works on any device.
