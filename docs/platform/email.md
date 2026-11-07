# Email

Every email the platform sends, who sends it, and the settings that keep it
working. Audited end to end on 2026-11-04 (journeys added, merged and
removed below); sign-in checked on 2026-10-25 (`apps/e2e`: sign-up by link,
sign-in by emailed code).

## Two senders, one domain

| Sender | What | From | Templates |
| --- | --- | --- | --- |
| **Supabase Auth** (custom SMTP through Resend) | Sign-in links and codes, sign-up confirmation, password reset, email change, security notices | `hello@auibsal.org` | `packages/database/supabase/templates` (pasted into the hosted project) |
| **The site's outbox** (`lib/api/outbox.ts`, Resend API) | Everything else, below | `RESEND_FROM`, AUIB Society of Arts and Letters <hello@auibsal.org> (decisions §6) | `packages/email` (`copy.ts`, `templates/notice.tsx`) |

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
route sends it. Every email (audited end to end on 2026-11-04):

- **One template** (`templates/notice.tsx`): white paper, the lockup in the
  email's language, a Light `h1`, the message in the recipient's language
  only, lists of links where there are several things (the Sunday Paper,
  the welcome, digests), one crimson button, and for confirmations and
  invitations the same address written under it for mail apps that block
  buttons. An HTML and a plain-text part that say the same.
- **The inbox line**: the subject is the heading; the preview (what the
  inbox shows after it) is the first sentence, never the subject again.
- **Replies reach a person**: every email has `Reply-To:
  hello@auibsal.org` (`project.supportEmail`); several ask the reader to
  reply.
- **Why it came** (the footer): *service* (it concerns the member; they
  choose their emails on Membership → Settings → Notices), *optional*
  (they may stop it: a stop link and `List-Unsubscribe` one-click), *officer*
  (their role's work) or *direct* (no account behind the address).
- **Safe retries**: an idempotency key per row and address; a spent daily
  quota gives the row back to wait for the next drain.
- **Tagged** in Resend by kind (`kind`), so each journey's delivery can be
  read on its own.
- Members who turned them on also get the notice on their phone and in
  Telegram.

### Every email

| Kind | When | To | Footer |
| --- | --- | --- | --- |
| `membership.welcome` | The first member pledge (the end of `/welcome`) | The new member: their card and where to start | Service |
| `events.rsvp_confirmed`, `events.waitlist_promoted` | A place booked, or freed from the waiting list | The member | Service |
| `events.reminder` | The day before | Booked: the member; "Remind me": whoever asked | Optional when booked; service for "Remind me" |
| `events.changed` | A published event canceled, or its day, time or place changed | Everyone booked, waiting or asking to be reminded; edits within ten minutes make one email | Service |
| `programmes.shift_reminder` | The day before a shift | Whoever is on it | Optional |
| `programmes.audition_update` | An audition time booked; called back, cast or not cast | The member | Service |
| `programmes.reply_update` | The General Secretary's team sets a time to talk, makes an offer, or picks someone else | The member who said "I'm interested" | Service |
| `access.role_assigned` | A Society role assigned (not a partner's team role) | The holder: what it opens; two-step sign-in first when it needs it | Officer |
| `access.role_ending` | Seven days before a role ends | The holder | Officer |
| `access.two_step_reset` | An authenticator removed (by an officer or a recovery code) | The person | Service |
| `access.recovery_attempts` | Five wrong recovery codes within an hour (`/api/two-step/recover`; once an hour) | The person | Service |
| `journal.submission_received`, `journal.returned_for_formatting`, `journal.decision`, `journal.agreement_reminder` (weekly, four weeks at most), `journal.final_check`, `journal.piece_note`, `journal.piece_published` | Work sent to Qirtas, through to publication | The author | Service |
| `journal.call_opened` | A Qirtas call opens | Whoever asked "Tell me when" | Service (they stop it on the page) |
| `membership.certificate_issued` | A certificate signed by both and issued | The holder | Service |
| `membership.service_letter` | A service letter (F-05) written | The holder | Service |
| `forms.updated` | A concern, motion or pitch taken up, then closed | Its sender | Service |
| `governance.election` | The notice; voting open; the results | Every member; then everyone on the register | Service |
| `governance.candidacy_decided` | The Elections Committee's answer | The nominee | Service |
| `partners.application_received` | An application to partner | The applicant; Partnerships and the President (that it waits) | Direct; officer |
| `partners.application_decided` | Signed (active) or not taken forward | The applicant | Direct |
| `partners.invitation` | A partner's or the Society's email invitation | The invited address | Direct |
| `sunday_paper.broadcast` (a Resend Broadcast) | The first Sunday of the month | Members who take optional emails; the public list, one Broadcast per language | Optional (each person's own stop link) |
| `membership.invitations` (a draft Resend Broadcast) | The President's go, once per list (Membership → Invitations; `membership.send_invitations(list)`), only after the list's test has reached the President ("Send the test to the President", `/api/invitations/test`, recorded as `invitation_lists.tested_at`): the site makes the draft, the President sends it from Resend. The President's letter, from hello@auibsal.org like every site email, signed with their signature (`/api/email/signature`). Each list's addresses are deleted thirty days after its own send | One list: the spring 2026 Tour writers (sent Nov 7), or the fall 2026 club fair's paper sign-ups typed in by staff; addresses with an account are skipped | Direct (its stop link takes the address off the list) |
| `newsletter.confirm` | A public sign-up | The address (double opt-in) | Direct |
| `personal_email.confirm` | A personal email added | The new address only | Direct |
| `programmes.removal_requested`, `programmes.removal_overdue` | A Next Stop removal request; past its 24 hours | Next Stop's managers; the requester gets a receipt in the language they asked in | Officer; direct |
| `programmes.removal_done` | The request removed, declined or closed | The requester, in their language (the receipt promises it) | Direct |
| `programmes.replies_digest` | Daily, when there were replies on Get involved | The General Secretary's team (`members.manage`) | Officer |
| `membership.verification_decided` | An account from outside AUIB decided (requests from before partners verified their own) | The account | Service |
| `platform.cron_failed` | A database job failed in the last day | Administrators | Officer |
| `account.deleted` | An account deleted | The address it had (the last email) | Direct |

"Email me about events, calls and Society notices" (`notify_email`, on
Membership → Settings → Notices) covers the optional ones: the Sunday
Paper and reminders of booked events and shifts. The stop link turns it
off without signing in; the link is signed (`lib/api/email-stop.ts`) and
the page needs a button press.

Merged or removed in the audit: one email per reply on Get involved
became the daily digest; "in progress" on a request sends nothing (taken
up and closed do); the agreement reminder stops after four weeks.

## Settings to keep right

**Supabase → the database (the outbox and the scheduled jobs)**

The outbox trigger and every scheduled job reach the site through
`private.call_api`: the address `platform.api_url` (in `core.settings`,
`https://auibsal.org/api`, set by migration `20261101000300`) plus a
bearer token read from Vault. With the address or a token missing, it
does nothing at all: emails wait in `core.outbox` and no error shows
anywhere. That is why the personal-email link was never sent (Oct 31,
2026). In the Supabase dashboard, Project Settings → Vault, add two
secrets, each with the same value as the app's environment variable in
Vercel:

| Vault secret | Same value as (Vercel) |
| --- | --- |
| `outbox_webhook_secret` | `DATABASE_WEBHOOK_SECRET` |
| `cron_secret` | `CRON_SECRET` |

The Desk's Connected panel (Email) says which of the three is missing,
how many emails wait and when the last one left (`core.outbox_health()`,
`settings.manage`). Waiting emails go out on their own once the secrets
are in: the next outbox row or scheduled run calls the route again.

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

- The free plan sends 100 emails a day across the whole account, counting
  sign-in emails (Supabase sends through Resend). The two emails that go to
  many people at once, the Sunday Paper and the one-time invitation, are
  Resend Broadcasts instead (`lib/api/broadcast.ts`): Broadcasts don't count
  against the 100 a day (the free plan sends them to up to 1,000 contacts a
  month).
- How a Broadcast goes: the job (an outbox row) reads Resend's unsubscribes
  back into the site's list, makes a fresh segment, imports the people it
  goes to as contacts (with their stop link, and for the invitation their
  greeting and Tour line, as contact properties), sends one Broadcast per
  language, and deletes the segment once it has gone (the free plan keeps
  three segments). Its progress is a row in `core.broadcasts`; a job whose
  import is still running carries on at the next drain.
- `RESEND_TOKEN` must be a full-access key: a key made for sending only
  can't make contacts, segments or Broadcasts (the job says so in the
  outbox's `last_error`).
- Unsubscribes made through Resend come back to the site before each send:
  a member stops optional email, a subscriber leaves the public list, an
  invited address leaves the invitation list; the contact is then deleted
  from Resend.

## When someone says "I never got the email"

1. Resend → Emails: was it sent, delivered, bounced? (A bounce is usually a
   typo in the address.)
2. Nothing in Resend: Supabase didn't send. Check the SMTP key, the rate
   limit, and Authentication → Logs.
3. Delivered but not seen: the spam or "Other" folder; AUIB mail sometimes
   holds new senders. The code in the email works on any device.
