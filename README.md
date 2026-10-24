# AUIB Society of Arts and Letters — platform

The web platform of the AUIB Society of Arts and Letters (SAL, «جمعية الفنون
والآداب»), the bilingual student society for literature, theater and the arts
at the American University of Iraq – Baghdad. *The paper and the pen.*

**Version 1** (October 24, 2026): one light ground for the site and the
Nexus, the database at zero Supabase advisor findings with a test that
keeps it there, a publish rule with the fewest gates that still protect
the work, and the rails (protected `main`, audited dependencies, journeys
against built apps) that let the Society run it without a developer on
call. What remains is content and the owner's settings, listed in
`PROGRESS.md`.

**One app** (October 24, 2026): the public site, the Nexus and the API are
one Next.js app, `apps/web`, deployed once to auibsal.org.

| Where | What it is |
| --- | --- |
| `auibsal.org` (`app/[locale]/(site)`) | The public site, English at `/` and Arabic at `/ar` |
| `auibsal.org/nexus` (`app/[locale]/nexus`) | **The Nexus**: member portal and role-gated admin, client-rendered with the member's own token |
| `auibsal.org/api` (`app/api`, `lib/api`) | Email, cron (and a daily watch on the cron jobs), calendar feeds, exports, file links, deletion, the `/api/v1` API for apps, Hudhud the Telegram bot |
| `auibsal.org/developers` | The guide and reference for app builders (Sign in with SAL, the Waraq API) |
| `packages/storybook` | The SAL Design System: components, v5 Screens and every platform email, run locally (`bun run --cwd packages/storybook dev`) |
| `apps/e2e` | Playwright + axe journeys, in CI |

The old hosts (nexus.auibsal.org, api.auibsal.org) redirect to the new
paths.

Data lives in Supabase (Postgres with Row Level Security on every table,
Auth, Storage). Hosting is Vercel.

## Getting started

Prerequisites: Node.js 24 (`.nvmrc`), [Bun](https://bun.sh), Docker (for the local
Supabase stack).

```sh
bun install
bun run db:start      # local Supabase: migrations (the browser journeys seed their own data)
bun run dev           # the app at http://localhost:3000 (the Nexus at /nexus)
```

Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in the local
keys from `bunx supabase status` (run in `packages/database`).

## Checks

```sh
bun run check         # Biome
bun run typecheck
bun run test
bun run db:test       # pgTAP: RLS, RPC behavior, and the advisor invariants
bun run check:placeholders && bun run check:rtl && bun run check:i18n
bun run check:unused  # Knip
bun audit --audit-level=high
```

## Further reading

- `PROGRESS.md` — the build checklist, decisions, blocked items, content still
  needed and Arabic awaiting native review
- `AGENTS.md` — rules for humans and AI agents
- `ARCHITECTURE_AND_INTEGRATIONS.md` — how the pieces fit together and how to
  set up Supabase, Vercel, Resend and the domains
- `docs/platform/` — the runbooks: releases, backups, incidents, accounts
- `.github/CONTRIBUTING.md` — workflow and local checks

Repository: https://github.com/auibsal/mono · Contact: hello@auibsal.org
