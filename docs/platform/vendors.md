# Vendors

The services the site uses, what each does for the Society and what
personal data it handles. The Privacy Notice (SAL-GOV-04) lists them.

| Vendor | Purpose | Personal data it handles |
| --- | --- | --- |
| Supabase | The database, sign-in and file storage | Everything the site keeps: accounts, the Register, records, uploaded files |
| Vercel | Hosts the site; cookieless Web Analytics | IP address and request details in short-lived logs; page views counted without cookies or identifiers |
| Resend | Sends the site’s email | Email address, name, the email’s content, delivery and bounce events |
| Cloudflare Turnstile | The human check on sign-up, sign-in and public forms | IP address and browser signals during the check; no cookies for tracking |
| Telegram | Hudhud, the Society’s bot, and the members’ group | Telegram user id, name and username of members who link their account, messages to the bot |
| Notion | The officers’ workspace | Officers’ names and roles, and Qirtas’s counts; no member records |
| Google Wallet | The membership card as a pass, when a member adds it | The card’s number, name, class, role and code |
| Zoho Mail | hello@auibsal.org | Messages sent to the Society |
| GitHub | The code and the encrypted nightly backup | Encrypted backups only (unreadable without the passphrase) |
| Cloudflare R2 | The second copy of the encrypted backup | Encrypted backups only |

The database and the site’s functions run in Frankfurt (Supabase, Vercel `fra1`).

The site sets three cookies, all needed (`docs/platform/analytics.md`):
the sign-in session (Supabase), the language (`NEXT_LOCALE`) and the
theme (`sal_theme`).
