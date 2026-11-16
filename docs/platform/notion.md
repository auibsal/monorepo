# The team's Notion workspace

The Diwan is the Society's administration, in three rooms (owner, Nov 4,
2026): **Notion** for the work (the workspace **AUIB Society of Arts and
Letters**, teamspace **The Diwan**), **the site** at auibsal.org/diwan for
people and private records, and the Telegram group **The Diwan** for talk.
Every piece of information has one home; anywhere else it appears is a
read-only view.

## What lives where

| Written in Notion (the only home) | Kept on the site (the only home) |
| --- | --- |
| Projects, tasks, meetings: agendas, working notes and the minutes' text | Members, verification, roles and the officers |
| Events (Publishing, Events), published from there: every event is one kind, Council, general and Annual Meetings among them | RSVPs, check-in, the waitlist, and each event's standard parts (needs, shifts on the event, the partner checklist, links) |
| The Programs database: kept for history, no longer published (owner, Nov 5, 2026: standard events) | Elections and ballots |
| The Society's documents and website policies (Publishing, Documents), published from there | Each document's adoption record: status, version, adopted on, the vote |
| The content calendar (news posts and Qirtas pieces start there) | Qirtas submissions and blind review |
| The handbook and the internal documents | Certificates, staff hours, Qalam's roster, the Prize's shortlists and votes |
| | Adopted minutes (the official copy, locked) |

**From the site (read-only)** holds every copy the platform writes for
planning, so plans, tasks and minutes can link to them (decisions.md,
Where things live). Each has one row per record, written only by the site
with a **Diwan** link back, updated by the sync within 15 minutes, never
read back; edit the record in the Diwan.

| Copy | Columns | Code |
| --- | --- | --- |
| Officers | the Council's seats and their holders | `mirrors.ts` |
| Qirtas pipeline | counts per stage only (review is blind) | `mirrors.ts` |
| Events | title, dates, venue, status, access, lead, public page; an English and an Arabic row | `events.ts` |
| Needs | item, quantity, date, what it is for, status | `needs.ts` |
| Editions | number, titles, season, call opens and closes, publication date, status, public page; ↔ Events (the launch) | `copies.ts` |
| Productions | the Company's productions and Next Stop's episodes: title, kind (reading, production, episode, special), season or episode code, key dates, status, public page; ↔ Events | `copies.ts` |
| Openings | role, seat, opens, closes, status; never applicants or counts of people | `copies.ts` |
| Organizations | names, kind, listed, public link; ↔ Events (hosted and co-sponsored); never their people, contacts or memoranda | `copies.ts` |
| Announcements and resolutions | title, kind, date, RES number, public link; never a resolution about a person (a role exception) | `copies.ts` |
| Measures | the five measures, written on the first of each month from the site's records (counts only) | `copies.ts` |

The copies made on Nov 16, 2026 tick **Archived** when their record goes
and keep the row; nothing is deleted. Never copied: anything about a
person (beyond the Council's seats), Qirtas's pieces and the Sunday Paper.
Each copy reads only the columns in `COPY_COLUMNS` (`copies.ts`), and a
test keeps them free of personal fields. The weekly scan (`scan.ts`) reads
every copy, the officers aside, beside the documents. Tasks and Projects
may link to any copy.

**Events are the site's** (decisions.md, Events; Where things live, Nov
16, 2026). They are made and edited only in the Diwan (Events, New event),
every field: title, summary and description in both languages, the dates,
venue, access, capacity, lead (from the register), host, image, off campus
and Student Life's approval, links and the debrief's link. The Events
database is a **read-only copy** the site writes, "Events (from the site,
read-only)": one row per language with the title, dates, venue, status,
access, lead, the public link and the Diwan link, for plans and projects to
link to. Anything typed in it is replaced at the next sync; nothing there
is read. **Needs** are the site's too (listed on the event, production,
Edition or standing activity, sent to Student Life by the Secretary); the
Needs database is a read-only copy in the same way.

Once (Nov 16, 2026), before the copies started, the sync imported what only
Notion held (`events.ts`, `needs.ts`; `core.settings` `notion.imported`):
rows never on the site became drafts in the Diwan with their text, image,
lead (matched by address), host and debrief; each Arabic row filled its
event's Arabic; and the Needs rows became needs on the site. Then the
columns the copy no longer writes (Summary, Capacity, Off campus, Host,
Debrief, Image, RSVPs, Platform note; Requested by in Needs) were removed
and each database was retitled as a copy.

## How the sync works

The route `/api/cron/notion-sync`, called by pg_cron (`sal-notion-sync`)
every fifteen minutes with the cron secret, runs these steps in order
(`apps/web/lib/api/notion/run.ts`). Notion's webhook (`/api/hooks/notion`)
starts the same run within a minute of a change, at most once a minute;
the fifteen-minute run stays as the reconcile. To turn the webhook on: in
the “SAL Platform” connection's Webhooks tab, subscribe
`https://auibsal.org/api/hooks/notion` to page events; Notion's first call
puts the verification token in the Vercel runtime log; paste it into
Notion to verify, and set it as `NOTION_WEBHOOK_SECRET` in Vercel
(Production).

1. **Officers** (`mirrors.ts`): `access.officer_directory()`, the nine
   seats by full title (Editor-in-Chief, Director of Media, …), matched to
   Notion people by AUIB email, which is never written to Notion. Written only when changed (hash in
   `core.notion_links`); removed when the record is gone.
2. **Qirtas pipeline** (`mirrors.ts`): counts per stage, never titles or
   names.
3. **Programs:** retired (owner, Nov 5, 2026: every event is a standard
   event, none in a series). The sync no longer reads the Programs
   database, which Notion keeps for history.
4. **Documents** (`documents.ts`): **Ready to publish** renders the page
   (headings, lists, tables, quotes, links) to auibsal.org/library/<slug>
   for public documents; internal ones stay in Notion (**Audience** is the
   publish switch). **For** (Everyone, Members or Staff) sets the group it
   sits in on the Library page; with no For it is for everyone. Needs
   `governance.manage` (the President, the Vice President, the General
   Secretary). The site keeps only the adoption record, kept in the Diwan's
   Library, and writes **Adopted on** and **Vote** back to the row whenever
   they change there.
5. **Minutes** (`minutes.ts`): a meeting (Council, general, Annual, special or Founding) in
   Work, Meetings with Status **Minutes in the Diwan** goes to the Diwan as
   that meeting's draft minutes (and is updated while it changes). Once the
   Council adopts them there, the official copy is locked (the database
   refuses any change) and the page says so. Needs `governance.manage`.
6. **The one-time import** (`events.ts`, `needs.ts`), until it has
   finished once.
7. **Events and needs** (`events.ts`, `needs.ts`): the read-only copies,
   written only when a record changed, removed when it is gone.
8. **The weekly scan** (`scan.ts`), in whatever time is left: from each
   Monday, every document page is read for the retired names, the terms in
   `terms-to-check.md` and personal data; each finding is listed on the
   Desk for the document's keeper (the seat in its Owner) and the web lead
   (`core.document_scan_hits`, masked). The quarterly sweep is now a check
   that the list is empty.

Every published document gets back **Status**, **Public page**, **Diwan**,
**Diwan ID** and a **Platform note**; a refusal sets **Needs changes**, a
note and a comment saying what to fix. The person who set the status is
matched by email and must hold the permission on the site (roles that need
two-step sign-in count only with a verified second factor).

The result is stored in `core.settings` `notion.sync_state` and shown in
the Desk's Connected panel.

## Who is in the workspace

The only way into the team's Notion is the invitation that comes with a
role. Notion's API cannot invite or remove people, so the role email
(`access.role_assigned`) carries the workspace's invite link, saved in the
Connected panel (`core.settings` `notion.invite_link`; Notion: Settings,
People, Invite link). Roles that do not open Notion (`access.roles.in_notion`
false: partners, parents and Qalam students) get no link.

Once, the panel shows who to invite (role holders with no Notion account
under their address) and who to remove (members holding no such role), and
one button that emails the invitation to everyone on the first list
(`/api/notion/invite`, `notion.invite`; `roles.assign`). Removing is done
in Notion by hand first. When it is sent, `notion.catch_up_sent_at` is set
and the block goes away for good. People who leave every such role are
removed in Notion by hand.

## Setup (done once)

1. Notion → Settings → Connections → Develop or manage integrations → new
   connection **SAL Platform**, authentication **API token**. Under its
   capabilities, allow **Read user information including email addresses**
   (without it nothing can be published: the platform cannot tell who set
   Ready to publish).
2. Vercel → **auibsal** → Environment Variables: `NOTION_TOKEN` (Production,
   marked sensitive). It is read only by the API routes.
3. In Notion, on **Start here**: ••• → Connections → add **SAL Platform**.
4. The databases' ids are in `core.settings` `notion.data_sources`
   (migrations `20261010000300` and `20261101002200`, which adds
   `meetings`). Moving a database keeps its id; if one is recreated, update
   that setting.

## Rules

- Never rename the properties the sync reads or writes (Title, Status
  and its options, When, Summary, Language, Edition of, Diwan, Diwan ID,
  Public page, Platform note, Way in, Off campus, Event,
  Rhythm, Code, Slug, Audience, Adopted on,
  Vote, Body, Minutes (Diwan), …) without changing the sync in the same
  change; add new ones freely.
- Do not turn on the allowed email domain setting for auib.edu.iq: it would
  let every AUIB student and staff member into the workspace.
- Volunteers (rotas, crews) are added as **guests** on their project's pages
  only.
- Never put member records, RSVPs by name, ballots, submissions or authors,
  certificates or confidential forms in Notion.

## When something is wrong

- **Nothing publishes; pages say the platform could not see who set the
  status:** step 1's email capability is off.
- **Settings shows "Not connected":** `NOTION_TOKEN` is missing on the auibsal project.
- **A database stops syncing:** a property was renamed or the page is no
  longer shared with SAL Platform; the problem list in Settings names it.
