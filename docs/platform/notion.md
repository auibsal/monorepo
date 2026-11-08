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

**From the site (read-only)** holds the copies the platform writes for
planning: **Officers** and **Qirtas pipeline** (counts only; review is
blind). Edit them on the site; each row links there.

**Events** (decisions §10). Each English row sets **Way in** (Open, RSVP,
Members or Private; Private for a Council meeting), which alone decides who
sees and books it, and, for an event away from campus, **Off campus**.
Events are made here only: the Diwan shows them and keeps the site's own
parts (bookings, check-in, registration questions, shifts, the partner
checklist, approvals). Until the **Members only** checkbox is removed from
the database, a ticked row with Way in Open or RSVP counts as Members. An off-campus event is kept
as a draft in the Diwan until the General Secretary records Student Life's
written approval on its page there; the row then goes back to Planning with
a note, and Ready to publish again publishes it. Notion never brings an
event back on campus. There is no Program link: no event belongs to a
series. A meeting's row in **Meetings** links its event in **Event**, and
its minutes point at that event in the Diwan (the event's day is their
date). **Needs** link the event they are for (For: Event); **Projects** are
of a Kind (Event, Qirtas edition, Company production, Campaign,
Partnership, Membership, Internal) and no longer link Programs.

**One language per piece.** In Events and Programs an English row
publishes the record and an **Arabic edition** is its own row (Language
Arabic, **Edition of** the English row): its title, summary, venue (or
rhythm) and page text become the record's Arabic. An empty field never
blanks what the site already has.

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
4. **Events** (`publish.ts`): **Ready to publish** checks the row
   (`rules.ts`: title, start time, lengths, slug; a link to a former series is ignored) and publishes
   the event; the Arabic edition then fills its Arabic. **Cancel on the
   site** cancels it. Needs `events.manage`. Content calendar rows of kind
   **News post** or **Qirtas** are imported into the Qirtas newsroom, in
   Editing (`journal.edit.<desk>` or `journal.approve`).
5. **Documents** (`documents.ts`): **Ready to publish** renders the page
   (headings, lists, tables, quotes, links) to auibsal.org/library/<slug>
   for public documents; internal ones stay in Notion. Needs
   `governance.manage` (the President, the Vice President, the General
   Secretary). The site keeps only the adoption record, kept in the Diwan's
   Library, and writes **Adopted on** and **Vote** back to the row whenever
   they change there.
6. **Minutes** (`minutes.ts`): a meeting (Council, general, Annual, special or Founding) in
   Work, Meetings with Status **Minutes in the Diwan** goes to the Diwan as
   that meeting's draft minutes (and is updated while it changes). Once the
   Council adopts them there, the official copy is locked (the database
   refuses any change) and the page says so. Needs `governance.manage`.
7. **RSVP counts** go back to each event's row. Nothing goes the other way:
   no event or minutes are made in the Diwan.

Every published row gets back **Status**, **Public page**, **Diwan**,
**Diwan ID** and a **Platform note**; a refusal sets **Needs changes**, a
note and a comment saying what to fix. The person who set the status is
matched by email and must hold the permission on the site (roles that need
two-step sign-in count only with a verified second factor).

The result is stored in `core.settings` `notion.sync_state` and shown in
the Desk's Connected panel, with who to invite to and remove from
the workspace (Notion's API cannot invite people).

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
