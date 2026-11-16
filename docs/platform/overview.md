# How the platform works

The one app, the database, and the rules that keep members' data safe.

The platform is one repository, [auibsal/monorepo](https://github.com/auibsal/monorepo), deployed to Vercel and backed by one Supabase project. Members never need to know any of this; the web lead and their successor do.

| App | Address | What it does |
| --- | --- | --- |
| Public site | [auibsal.org](https://auibsal.org) (`apps/web`, `app/[locale]/(site)`) | Events, Qirtas, the Company, Next Stop, Get involved, the Library and About; English and Arabic |
| Your account | [auibsal.org/account](https://auibsal.org/account) (`app/[locale]/(account)`) | Every member's and guest's own pages: Today, Events, Work, Roles and service, Documents and Settings; rendered in the browser, with the member's own token |
| The Diwan | [auibsal.org/diwan](https://auibsal.org/diwan) (`app/[locale]/diwan`) | The staff's administration, one section per Council seat (the Desk, the Council, Qirtas, Media, the Company, Events, Partnerships, Membership); rendered in the browser, with the member's own token |
| API | auibsal.org/api (`app/api`, `lib/api`) | Email, scheduled jobs, calendar feeds, file links, exports, account deletion, Hudhud and the Notion sync; the only code holding the secret key |
| The design system | [auibsal.org/diwan/media/design](https://auibsal.org/diwan/media/design) (`packages/brand`, built into the site) | SAL-MED-02 in full: the guide, foundations, logos, every component, screen and email in both languages, social and print files; in the Diwan, read-only, not indexed |
| Officer handbook | The team's Notion workspace (linked from the Desk) | How to run the Society; officers only |
| These runbooks | `docs/platform` in the repository | How the platform runs, for the web lead |

## How the parts connect

```mermaid
flowchart LR
  CF["Cloudflare<br/>DNS · TLS · WAF · bots"]
  subgraph apps/web · auibsal.org (one Vercel project)
    W["(site) · public pages<br/>prerendered, cached by tag"]
    M["(account) · your account<br/>client-rendered"]
    A["/diwan · the Diwan<br/>client-rendered"]
    API["/api · route handlers<br/>email · cron · feeds · files · hooks"]
  end
  subgraph Supabase
    AUTH["Auth"]
    DB[("Postgres + RLS<br/>pg_cron · outbox")]
    ST["Storage"]
  end
  CF --> W & M & A & API
  W -- "publishable key, published rows" --> DB
  M & A -- "member's token" --> AUTH & DB & ST
  M & A -- "member's token" --> API
  API -- "secret key" --> DB & ST
  DB -- "pg_net: outbox, cron" --> API
  AUTH -- "Send Email hook" --> API
  API --> RESEND["Resend"] & NOTION["Notion"] & TG["Telegram"]
```

## How a request flows

1. The **public site** reads published rows from Postgres with the public (publishable) key, and caches pages until something is published.
2. The **Diwan** talks to Postgres directly with the signed-in member's own token. The database decides what that member may read or write.
3. When something needs a secret (sending email, a private file link, an export), the Diwan calls the **API** with the member's token; the API checks the member's permission again before acting.
4. Changes that need side effects (an email to send, a page to refresh) are written to an **outbox** table in the same transaction. The database hands each row to the API, which sends the email through Resend or refreshes the public site.

## The rules that keep it safe

- **Row Level Security is the boundary.** Every table checks `access.has_permission()` on every read and write. A screen the Diwan hides is a convenience; the database is the guard.
- **Permissions, not role names.** Roles are bundles of permissions, assigned only through `access.assign_role()`, never from a user's profile.
- **Two-step sign-in for sensitive roles.** Council officers, directors and the Elections Committee only hold their permissions on a session that passed the second step.
- **Secrets live only in the API and CI.** The Diwan bundle is public by design; CI fails if a secret's name or value appears in it.
- **Multi-step rules are database functions.** Ballots, the election count, waitlist promotion and Qirtas decisions are single atomic functions.
- **Blind review.** Readers never receive an author's identity before a decision; the database withholds it.
- **Readers read the work, never the file.** A reader signs `confidentiality-agreement`, the Confidentiality pledge, on the reading page itself (in their platform name, kept and emailed like every signed form; `journal.sign_reader_pledge`), then reads a blind entry's text on the page (`journal.entry_text`; the columns aren't selectable by themselves) and a Gallery entry's images as copies marked with their card number and the day (`/api/files/blind`). Selecting, copying, the context menu and printing are off on that page, a speed bump that keeps the keyboard and screen readers working. Originals open only for the writer, the Managing Editor in intake, and the section's editor or the Editor-in-Chief once accepted (`journal.open_original`); every opening shows in the submission's History.

## The data model

Every schema below is exposed to the Data API, with RLS on every table;
`private` holds the function bodies and is not exposed.

| Schema | What it holds |
| --- | --- |
| `core` | profiles, semesters, settings, the activity log, the outbox, announcements and Broadcasts, Notion links, Telegram, devices, problem reports |
| `access` | permissions, roles and their permissions, role assignments, agreements and checklists, access reviews, two-step recovery |
| `membership` | memberships and classes, pledges, cards and Wallet passes, guests, invitations and their lists, certificates, service records and letters, requests (Associate, merge, verification) |
| `events` | events, RSVPs and the waitlist, staff, check-ins, invitations, reminders, debriefs, incident reports, Student Life Week |
| `journal` | Qirtas: Editions (`issues`) and calls, contributors, pieces and their parts, submissions and files, blind entries and keys, readers' assignments and scores, decisions, the Prize, games |
| `programmes` | Next Stop's episodes and reels, the Tour (Six Words), needs and shifts, openings and replies, the Company's productions, auditions and rehearsals, Qalam, removal requests |
| `governance` | the Council's minutes, resolutions and motions, elections, partners and memoranda, forms and signed copies, the Library (`society_documents`), conflict declarations |
| `content` | the Sunday Paper and its list |

Three designs worth knowing: **blind review** (readers see `journal.blind_entries`
through their assignments, never the author, until a decision);
**elections** (`governance.cast_ballot()` writes a receipt and a ballot with no
shared key, so no one can match them); and the **outbox** (side effects are
rows in `core.outbox`, written in the same transaction and handed to the API).

## Scheduled jobs

| Job | Runs (UTC) | Does |
| --- | --- | --- |
| sal-new-devices | Every 5 minutes | Emails a person when a new kind of device signs in |
| sal-release-unclaimed | Every 5 minutes | Releases unclaimed places at full events and expires waitlist offers |
| sal-outbox-drain | Every 10 minutes | Retries any outbox row the insert's call missed |
| sal-publish | Every 10 minutes | Publishes what was scheduled |
| sal-telegram-posts | Every 10 minutes | Hudhud's posts to the Society's groups |
| sal-notion-sync | Every 15 minutes | Publishes Notion's documents and minutes, and writes the site's read-only copies into Notion (notion.md) |
| sal-two-step-from | Hourly at :05 | Turns on two-step sign-in for roles whose date has come |
| sal-calendar-sync | Hourly at :07 | Refreshes the AUIB campus calendar and the semesters |
| sal-platform-health | Hourly at :20 | Alerts the web topic and the Desk to a late job, a stalled outbox or Notion sync, a dead email |
| sal-retention | 1:00 | Calls `/api/cron/retention`: the files and accounts first, then every rule of the retention schedule (`retention.md`) |
| sal-wallet-terms | 3:20 | Refreshes Google Wallet passes when a term or role ends |
| sal-telegram-tidy | 3:25 | Expired Telegram codes and old posts |
| sal-adult-birthdays | 4:35 | Deletes the month and year of birth of members who turned 18 |
| sal-daily | 4:45 (7:45 a.m. Baghdad) | Event and shift reminders, agreement reminders, role-ending notices |
| sal-applications | 4:45 | Declines offers for openings that were not answered in time |
| sal-cron-health | 5:35 | Emails the administrators the jobs that failed in the last day |
| sal-thanks-for-coming | 6:00 (9:00 a.m. Baghdad) | "Thanks for coming" to everyone who checked in yesterday, with "How was it?" |
| sal-student-life-week | Wednesdays, 6:00 | Student Life's week of events |
| sal-daily-updates | 17:00 (8:00 p.m. Baghdad) | Each person's one daily update email |
| Nightly backup (GitHub Actions) | 23:20 | Encrypted dump of the production database (and Storage on the 1st), kept 30 days, emailed on failure (`backups.md`) |

All but the backup run inside Postgres (pg_cron). The Supabase security and
performance advisors are kept at zero findings, and
`00_advisors.test.sql` fails CI when one would come back: every RPC entry
point in an exposed schema is a SECURITY INVOKER wrapper around its body in
the `private` schema, no table has two permissive policies for the same
role and action, and every foreign key is indexed. Every platform setting is in [settings.md](settings.md) and every secret in [secrets.md](secrets.md); the rules for changing code are in [AGENTS.md](https://github.com/auibsal/monorepo/blob/main/AGENTS.md), and the technical decisions in [docs/adr](../adr/README.md).
