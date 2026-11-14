# Vendors

The services the site uses, what each does for the Society and what
personal data it handles. The Privacy Notice (SAL-GOV-04) lists them.

| Vendor | Purpose | Personal data it handles |
| --- | --- | --- |
| Supabase | The database, sign-in and file storage | Everything the site keeps: accounts, the Register, records, uploaded files |
| Vercel | Hosts the site; cookieless Web Analytics | IP address and request details in short-lived logs; page views counted without cookies or identifiers |
| Resend | Sends the site’s email | Email address, name, the email’s content, delivery and bounce events |
| Cloudflare | In front of the site (DNS, the firewall's managed rules, DDoS protection, Block AI bots) and Turnstile, the human check on sign-up, sign-in and public forms | IP address and request details as traffic passes; browser signals during a check |
| Telegram | Hudhud, the Society’s bot, and the members’ group | Telegram user id, name and username of members who link their account, messages to the bot |
| Notion | The officers’ workspace | Officers’ names and roles, and Qirtas’s counts; no member records |
| Google Wallet | The membership card as a pass, when a member adds it | The card’s number, name, class, role and code |
| Zoho Mail | hello@auibsal.org | Messages sent to the Society |
| GitHub | The code; runs the nightly backup | None kept: the encrypted backup leaves for R2 (a one-day artifact only if the R2 copy fails) |
| Cloudflare R2 | The encrypted nightly backup, kept 30 days in a private bucket with a 7-day lock | Encrypted backups only (unreadable without the passphrase) |

The database and the site’s functions run in Frankfurt (Supabase, Vercel `fra1`).

The cookies, all needed and all named in the Privacy Notice (SAL-GOV-04;
`docs/platform/analytics.md`); a new one is added there before it ships:

| Cookie | Set by | What it holds |
| --- | --- | --- |
| `sb-…-auth-token` | Supabase sign-in | The signed-in session (30 days on a device) |
| `NEXT_LOCALE` | The site | The language chosen |
| `sal_theme` | The site | Light or dark, when chosen in the header |
| `sal_ways` | The site | Whether the account menu shows the Diwan or the partner dashboard (no personal data). Kept in the browser's local storage, not sent with requests; GOV-04 lists it with the cookies |
| `__cf_bm`, `cf_clearance` and Turnstile's | Cloudflare | Its security checks, when they run |

There is no browser push: notices go by email and Hudhud.
