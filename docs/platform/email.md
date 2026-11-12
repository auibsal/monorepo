# Email

Every email the platform sends, who sends it, and the settings that keep it
working. Audited end to end on 2026-11-04 (journeys added, merged and
removed below); sign-in checked on 2026-10-25 (`apps/e2e`: sign-up by link,
sign-in by emailed code).

## Two senders, one domain

| Sender | What | From | Templates |
| --- | --- | --- | --- |
| **Supabase Auth** (custom SMTP through Resend) | Sign-in links and codes, sign-up confirmation, password reset, email change, security notices | `hello@auibsal.org` | `packages/database/supabase/templates` (pasted into the hosted project) |
| **The site's outbox** (`lib/api/outbox.ts`, Resend API) | Everything else, below | `SENDER` in `packages/email`: AUIB Society of Arts and Letters <hello@auibsal.org> (decisions §6), set in code | `packages/email` (`copy.ts`, `templates/notice.tsx`) |

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
| `events.rsvp_confirmed` | A place booked, or a held place claimed | The member | Service |
| `events.waitlist_offered` | A released place held for the next on the waiting list: 12 hours, or until two hours before the start; one button claims it | The member | Service |
| `events.reminder` | The day before | Booked: the member, with "Can't come? Cancel" (the event's page); "Remind me": whoever asked | Service |
| `events.changed` | A published event canceled, or its day, time or place changed | Everyone booked, waiting or asking to be reminded; edits within ten minutes make one email | Service |
| `events.shift_reminder` | The day before a shift | Whoever is on it | Optional |
| `company.audition_update` | An audition time booked; called back, cast or not cast | The member | Service |
| `get_involved.received` | A member sends an application on Get involved | The applicant (a receipt) | Service |
| `get_involved.reply_update` | The hiring seat sets an interview, an offer is made (answered within 7 days from Your applications), the applicant accepts a director seat, or someone else is chosen (at the latest 14 days after the opening closes) | The applicant | Service |
| `access.role_assigned` | A Society role assigned (not a partner's team role) | The holder: what it opens; two-step sign-in first when it needs it | Officer |
| `access.role_ending` | Seven days before a role ends | The holder | Officer |
| `access.two_step_reset` | An authenticator removed (by an officer or a recovery code) | The person | Service |
| `access.recovery_attempts` | Five wrong recovery codes within an hour (`/api/two-step/recover`; once an hour) | The person | Service |
| `qirtas.submission_received` (with the record number, SUB-<year>-<n>), `qirtas.in_reading`, `qirtas.returned_for_formatting`, `qirtas.decision`, `qirtas.agreement_reminder` (weekly, four weeks at most), `qirtas.final_check`, `qirtas.piece_note`, `qirtas.piece_published` | Work sent to Qirtas, through to publication | The author | Service |
| `qirtas.call_opened` | A Qirtas call opens | Whoever asked "Tell me when" | Service (they stop it on the page) |
| `membership.certificate_issued` | A certificate signed by both and issued | The holder | Service |
| `membership.service_letter` | A service letter (F-05) written | The holder | Service |
| `forms.signed_copy` | A form signed on the site (not an anonymous concern) | The signer: their account, or the address a signer without one gave | Service |
| `forms.link` | A Qalam lead sends a parent's single-use link (F-38, F-39) | The teacher, who passes it on | Direct |
| `forms.updated` | A concern, motion or pitch taken up, then closed | Its sender | Service |
| `governance.election` | The notice; voting open; the results | Every member; then everyone on the register | Service |
| `governance.candidacy_decided` | The Elections Committee's answer | The nominee | Service |
| `partners.application_received` | An application to partner | The applicant (Partnerships and the President read it in the next staff digest) | Direct |
| `partners.application_decided` | Signed (active) or not taken forward | The applicant | Direct |
| `partners.invitation` | A partner's or the Society's email invitation | The invited address | Direct |
| `sunday_paper.broadcast` (a Resend Broadcast, from qirtas@auibsal.org, replies to it) | The Managing Editor's send, from the Diwan, after a preview and a test to the Editor-in-Chief (decisions.md, Qirtas) | "The Sunday Paper" topic (`core.mailing_recipients('paper')`), one Broadcast per language | Optional (each person's own preferences page) |
| `membership.invitations` (a draft Resend Broadcast) | The President's go, once per list (Membership → Invitations; `membership.send_invitations(list)`), only after the list's test has reached the President ("Send the test to the President", `/api/invitations/test`, recorded as `invitation_lists.tested_at`): the site makes the draft, the President sends it from Resend. The President's letter, from hello@auibsal.org like every site email, signed with their signature (`/api/email/signature`). Each list's addresses are deleted thirty days after its own send, and its contacts leave Resend first (`invitation.forget`, decisions.md, Qirtas) | One list: the spring 2026 Tour writers (sent Nov 7), or the fall 2026 club fair's paper sign-ups typed in by staff; addresses with an account are skipped | Direct (its stop link takes the address off the list) |
| `announcement.broadcast` (a Resend Broadcast) | The President's go (The Council → Announcements; `core.send_announcement(id)`), only after the notice's test has reached the President in both languages (`/api/announcements/test`, recorded as `announcements.tested_at`, cleared by any change). Hudhud posts the same notice | "Society news and events" (`core.mailing_recipients('news')`), one Broadcast per language; at most one a week | Optional (each person's own preferences page) |
| `newsletter.confirm` | A public sign-up | The address (double opt-in) | Direct |
| `personal_email.confirm` | A personal email added | The new address only | Direct |
| `governance.concern_raised` | A concern is sent (urgent, at once); it names no one and carries none of the concern | The complaints panel's chair, the Vice President; one about the Vice President or the President to whoever holds `concerns.about_vp` or `concerns.about_president` | Officer |
| `events.incident_reported` | An incident report from an event's page in the Diwan (urgent, at once); it names the event, not what happened | The Director of Events and the President | Officer |
| `removal.requested`, `removal.overdue` | A Next Stop removal request; past its 24 hours | Next Stop's managers; the requester gets a receipt in the language they asked in | Officer; direct |
| `removal.done` | The request removed, declined or closed | The requester, in their language (the receipt promises it) | Direct |
| `staff.digest` | Daily: what came in since yesterday that the officer can act on: Get involved replies counted by role (no names), partner applications, actions waiting for a second officer, problem reports. Urgent alerts (a removal request, a concern, an incident report, a failed job) still go at once (decisions.md, Channels and email) | Each officer holding `members.manage`, `partners.manage` or `partners.sign`, a pending action's permission, or `settings.manage` | Officer |
| `membership.verification_decided` | An account from outside AUIB decided (requests from before partners verified their own) | The account | Service |
| `platform.cron_failed` | A database job failed in the last day | Administrators | Officer |
| `account.deleted` | An account deleted | The address it had (the last email) | Direct |

The two mailing topics (Your account → Settings → Notices) and "Email me
reminders for the events I book" (`notify_email`) are the optional
emails. The preferences link changes the topics or stops everything
without signing in; the link is signed (`lib/api/email-stop.ts`), and the
one-click unsubscribe (List-Unsubscribe) stops everything.

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
  mode Managed. A widget made for another hostname fails on the site
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

## Bounces, complaints and confirmations

- Resend's webhook goes to `https://auibsal.org/api/hooks/resend`, with
  the events `email.bounced` and `email.complained`, signed with
  `RESEND_WEBHOOK_SECRET` (Resend → Webhooks; the secret starts
  `whsec_`). A hard bounce or a complaint puts the address on
  `core.email_suppressions`; the outbox and every Broadcast skip it from
  then on. Resend keeps its own suppression list as well.
- The Sunday Paper's confirmation goes to one address at most three
  times in thirty days, and a sign-up never confirmed is deleted after
  thirty days (the retention job, `sal-retention`, daily).
- One sender, set in code (`SENDER` in `packages/email`); there is no
  `RESEND_FROM` to set.

## When someone says "I never got the email"

1. Resend → Emails: was it sent, delivered, bounced? (A bounce is usually a
   typo in the address.)
2. Nothing in Resend: Supabase didn't send. Check the SMTP key, the rate
   limit, and Authentication → Logs.
3. Delivered but not seen: the spam or "Other" folder; AUIB mail sometimes
   holds new senders. The code in the email works on any device.
