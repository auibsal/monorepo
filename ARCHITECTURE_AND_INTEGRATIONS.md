# Architecture and integrations

How the SAL platform fits together, and how to set up each integration.
`AGENTS.md` has the rules in short; `PROGRESS.md` has the state of the build.

## Architecture at a glance

```mermaid
flowchart LR
  subgraph apps/web · auibsal.org (one Vercel project)
    W["(site) · public pages<br/>SSG + cache tags"]
    A["/nexus · the Nexus<br/>client-rendered"]
    API["/api · route handlers<br/>email · cron · feeds · signed URLs · /api/v1"]
  end
  subgraph Supabase
    AUTH["Auth (email)"]
    DB[("Postgres + RLS")]
    ST["Storage"]
  end
  RESEND["Resend (auibsal.org)"]

  W -- "publishable key, published rows" --> DB
  A -- "member's JWT" --> AUTH & DB & ST
  A -- "Bearer token" --> API
  API -- "secret key" --> DB & ST
  DB -- "outbox webhook" --> API
  API -- "revalidateTag, in process" --> W
  API --> RESEND
```

One app since October 24, 2026 (owner's decision): the public site, the
Nexus and the API share one Next.js project, one deployment and one origin.
The old hosts (nexus.auibsal.org, api.auibsal.org, design.auibsal.org) and
their Vercel projects are gone.

### Principles

1. **Row Level Security is the boundary.** The Nexus queries Postgres with the
   member's token; the public site with the publishable key. Policies decide
   what each can read and write. Every policy calls
   `access.has_permission(permission, scope_type, scope_id)` (its body
   lives in `private.has_permission`, which the policies bind to).
2. **Secrets live in server code only.** The route handlers under `app/api`
   and `lib/api` read the secret key, Resend and the shared secrets; the
   pages and the Nexus (client-rendered) read only `NEXT_PUBLIC_*` values,
   and CI greps the client bundle for the server names. When the Nexus needs
   a privileged action it calls an API route with the member's token, which
   verifies the JWT (`authenticateRequest`) and re-checks the permission
   (`hasPermission`) before using the admin client.
3. **Multi-step rules are Postgres functions.** RSVPs and waitlist promotion,
   check-ins, Journal transitions and decisions, ledger sign-off, spending
   approvals, ballots and the ranked-choice count are `SECURITY DEFINER`
   functions with `search_path = ''` in the `private` schema, each checking
   permissions itself; the name the apps call, in the exposed schema, is a
   `SECURITY INVOKER` wrapper with the same signature (migration
   `20261024000000`). The Supabase advisors stay at zero findings and
   `00_advisors.test.sql` fails CI if one would come back.
4. **Side effects go through an outbox.** Functions and triggers write to
   `core.outbox` in the same transaction (emails to send, cache tags to
   revalidate). A Supabase database webhook on insert hands each row to
   `/api/hooks/outbox`, which sends the mail or revalidates the public
   pages' cache tags in process.
5. **One session, one origin.** The public pages, the Nexus and the API
   routes share auibsal.org, so the session cookie needs no domain setting.
   Production keeps `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.auibsal.org` only
   because existing sessions carry that domain (`packages/auth/cookies.ts`).

## Data model

Schemas (all exposed to the Data API, all with RLS on every table):

| Schema | Contents |
| --- | --- |
| `core` | profiles, semesters, blackouts, programmes, settings, activity log, outbox |
| `access` | permissions, roles (with spending limits), role bundles, role assignments, `has_permission`, `assign_role` |
| `membership` | memberships (tiers), pledges (versioned), verification queue, activity records, calendar tokens, `is_voting_member` |
| `events` | events, RSVPs, waitlist, staff, check-ins, cached AUIB campus calendar |
| `journal` | issues, contributors, pieces and their text, calls, submissions, files, blind entries, blind keys, assignments, scores, decisions, agreements, status history |
| `charity` | partners, campaigns, append-only ledger and sign-offs, receipts, impact metrics |
| `programmes` | Side Quest episodes and reels, Six Words, rotas, shifts, removal requests |
| `governance` | Council terms, minutes, resolutions, spending approvals, library, elections, positions, candidates, voters, ballot receipts, ballots, results |
| `content` | pages, news, media, homepage slots, announcements, document search index, `search()` |

Key designs:

- **Blind review.** `journal.submissions` (with the author) is readable by the
  author and `journal.identity.view` holders only. Readers see
  `journal.blind_entries` (no author) through their assignments; the mapping
  is `journal.blind_keys`. `journal.entry_author()` reveals the author only
  after a decision.
- **Ledger.** No update or delete grants for anyone and a trigger that refuses
  them; corrections are reversing entries. `charity.campaign_progress()`
  counts signed-off entries only (the signer is never the recorder).
- **Elections.** `governance.cast_ballot()` writes a receipt (who) and a
  ballot (what) with no shared key, timestamp or order; no client role can
  read ballots. Voters are snapshotted when voting opens. RON is offered on
  uncontested races. Off until `features.elections` is true.
- **Voting Members.** Two activity records in the current or previous
  semester. Check-ins create them; member managers add manual ones with a note.

## Local development

```sh
bun run db:start            # Docker: Postgres, Auth, Storage, REST
bun run db:reset            # re-apply migrations from scratch
bun run db:test             # pgTAP
bun run db:types            # regenerate packages/database/types.ts
```

Change the schema with a new migration (`bun run --cwd packages/database
migration:new <name>`); never edit one that has reached a shared database.
Each new table needs RLS, policies that use `has_permission`, column grants,
indexes on policy columns, and pgTAP tests. Regenerate types and commit them.

## Supabase (production)

1. Link the project: `cd packages/database && bunx supabase link --project-ref <ref>`.
2. Apply migrations: `bunx supabase db push` (CI does this on merge to `main`).
3. **Exposed schemas** (Settings → API): add `core, access, membership, events,
   journal, charity, programmes, governance, content`.
4. **Auth → URL configuration:** site URL `https://auibsal.org`; redirect
   URLs `https://auibsal.org/**` and `http://localhost:3000/**`. OAuth
   Server: authorization path `/nexus/oauth/consent`.
5. **Auth → Providers:** email on (confirmations on, password min 10, letters
   and digits); phone off.
6. **Auth → SMTP:** Resend (`smtp.resend.com`, port 465, user `resend`,
   password = API key, sender `SAL <hello@auibsal.org>`); bilingual templates.
7. **Database webhook:** on `INSERT` into `core.outbox` → `POST
   https://auibsal.org/api/hooks/outbox` with `Authorization: Bearer
   <DATABASE_WEBHOOK_SECRET>`.
8. **First admin:** after the Founder signs up, run once (SQL editor, as the
   service role): `select access.bootstrap_founder('<email>');`
9. The security and performance advisors read zero findings; the one row
   the code cannot change is **leaked-password protection** (Authentication
   → Attack protection), a dashboard setting on the Pro plan.

## Vercel

One project from this repository:

| Project | Root | Domains |
| --- | --- | --- |
| auibsal | `apps/web` | auibsal.org, www.auibsal.org (redirect) |

Every push to `main` builds it; only a commit whose subject carries the
skip marker builds nothing (`scripts/vercel-ignore.mjs`, the Ignored Build
Step). The daily keep-alive cron is in `apps/web/vercel.json`.

Environment variables are listed in `apps/web/.env.example`. The server-only
ones (`SUPABASE_SECRET_KEY`, `RESEND_TOKEN`, `CRON_SECRET`,
`DATABASE_WEBHOOK_SECRET`, `REVALIDATE_SECRET`, `NOTION_TOKEN`,
`VAPID_PRIVATE_KEY`, `TELEGRAM_*`) are marked sensitive in Vercel; CI greps
the client bundle for their names.

## Email (Resend)

Add `auibsal.org` in Resend, then add its DKIM, SPF and return-path records in
Vercel DNS. The API routes send every email with the `@repo/email` templates (previewed in Storybook, "SAL/Emails"), in
the member's language (both when unknown).
