# Notifications

Email and Hudhud notifications, and what each costs. Every email, its
sender and the settings behind it: `email.md`.

Every notice goes by **email** through Resend, and to members who link Telegram, by **Hudhud** in their own chat, by topic and channel as each person chooses in Settings → Notifications (decisions.md, Channels and email). There is no browser push: it was removed on Nov 14, 2026, with its stored subscriptions, its service worker (the old worker now unregisters itself) and the VAPID keys.

Emails about a person's own records follow three switches in Settings → Notifications, all on by default: the signed copy of what they sign (at once), one "received" email for an application or a submission (at once, with its record number), and one daily update at 8:00 p.m. Baghdad time gathering the later changes (decisions, status changes) to their applications and submissions. Everything stays in Your account either way; account and security emails always go.

## Email limits

Resend's free plan sends 100 emails a day and 3,000 a month, shared with
Supabase's sign-in emails and with anything else on the same Resend account. When the day's limit is spent, the outbox waits for it to reset instead of using up its retries, and each email carries an idempotency key so a retry never sends twice.
