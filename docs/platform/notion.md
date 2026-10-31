# The team's Notion workspace

The officers' working space is the Notion workspace **AUIB Society of Arts
and Letters**, teamspace **HQ** (Notion Plus for education clubs). Team work
lives there; anything that needs privacy between people, a tamper-proof
record or members taking part lives in the Diwan. Nothing is kept in both.

## What lives where

| In Notion (the only home) | In the Diwan (the only home) |
| --- | --- |
| Projects, tasks, meetings (agendas, working notes) | Members, verification, roles |
| Events (published from Notion) and Qirtas pieces (imported for editing) | RSVPs, check-in, the waitlist |
| The content calendar (Instagram, newsletters) | Elections and ballots |
| The officer handbook and the internal documents' text | Journal submissions and blind review |
| | The charity ledger, certificates, service hours |
| | Forms (including confidential ones), adopted minutes, the public foundational documents, the document registry (status, version, dates) |

Notion also holds **read-only copies** ("From the Nexus", its name in the workspace): the officer
directory, programs, the document and minutes registry, and Journal counts
per stage (numbers only; review is blind). Edit them in the Diwan; each row
links there.

## The handbook and the internal documents

The officer handbook is **Handbook and internal documents → Officer
handbook**, one page per topic, edited only there. The Diwan links to it
from Account → Officer handbook for people who may read the internal
library. The public setting `notion.handbook` holds its first page and each
page by its old Nexus slug, so `/handbook?page=events` and the old
docs.auibsal.org links still land on the right page; update it when a page
is added or moved. The old `governance.handbook_pages` table is read only
(migration `20261010000400`).

The internal documents (Founding Proposal, Operations Playbook, Templates &
Forms, Printables, and any later ones) live in Notion entirely (owner,
Oct 30, 2026); the Diwan's menu links to the team workspace (setting
`notion.home_url`). The platform keeps only the public documents: the
Library, auibsal.org/library, edited in the Diwan's Library by the
President, the Vice President and the General Secretary.

## How the sync works

The route `/api/cron/notion-sync`, called by pg_cron (`sal-notion-sync`)
every fifteen minutes with the cron secret:

1. **Mirrors.** Programs, officers (`access.officer_directory()`), documents
   and minutes, Qirtas pipeline counts (each call's stages, the News, Video
   and Voices desks' stages, and each desk's pieces by newsroom stage). A row is written only when it changed
   (hash in `core.notion_links`) and moved to the trash when its record is
   gone. Officers are matched to Notion people by AUIB email.
2. **Publishing.** Pages in Events with
   Status **Ready to publish** are checked (`lib/notion/rules.ts`): titles in
   both languages, a start time, lengths, slug, program. The page's last
   editor is matched by email and must hold `events.manage` or
   `content.manage` (`access.notion_publisher()`; roles that need two-step
   sign-in count only when that account has a verified second factor). The
   text is read from the page under the headings **English** and **العربية**,
   converted to HTML and sanitized; the first image is copied to the media
   bucket. The page gets Status **Published**, the Diwan and public links and
   a note; problems set **Needs changes**, a note and a comment.
   **Cancel on the site** cancels a published event.
   **Qirtas** (kind `Waraq` in the workspace, with a **Desk**: News, Letters, Gallery, Video or
   Voices): Ready to publish imports the page as a staff piece in **Editing**
   in Administration → Qirtas, bylined to the person who set it (they need
   `journal.edit.<desk>` or `journal.approve`). It is not published from
   Notion: the approvals and the publish rule happen in the Diwan. The page
   gets Status **In editing** and the Diwan link; while the piece is still in
   editing, setting Ready to publish again updates its title, deck and text.
   **News post** pages (the old news, Oct 14, 2026) are imported the same
   way, to the News desk.
3. **Diwan items.** Events made in the Diwan get a page in Notion
   too (their text stays in the Diwan until written in the page; an empty
   page never blanks it).
4. **RSVP counts** go back to each event's page.

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
4. The databases' ids are in `core.settings` `notion.data_sources` (migration
   `20261010000300`). If a database is recreated, update that setting.

## Rules

- Never rename the properties the sync reads or writes (Title, Title
  (Arabic), Status and its options, When, Summary, Nexus ID, …); add new ones
  freely.
- Do not turn on the allowed email domain setting for auib.edu.iq: it would
  let every AUIB student and staff member into the workspace.
- Volunteers (rotas, crews) are added as **guests** on their project's pages
  only.
- Never put member records, RSVPs by name, ballots, submissions or authors,
  ledger entries, certificates or confidential forms in Notion.

## When something is wrong

- **Nothing publishes; pages say the platform could not see who set the
  status:** step 1's email capability is off.
- **Settings shows "Not connected":** `NOTION_TOKEN` is missing on the auibsal project.
- **A database stops syncing:** a property was renamed or the page is no
  longer shared with SAL Platform; the problem list in Settings names it.
