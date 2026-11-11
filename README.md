# auibsal.org

The platform of the AUIB Society of Arts and Letters (SAL, «جمعية الفنون
والآداب»), the bilingual student society for literature, theater and the
arts at the American University of Iraq – Baghdad. *The paper and the pen.*

## What it is

One Next.js app, `apps/web`, deployed once to auibsal.org:

| Where | What |
| --- | --- |
| `auibsal.org` (`app/[locale]/(site)`) | The public site: English at `/`, Arabic at `/ar` |
| `/account`, `/sign-in`, `/join`, … (`app/[locale]/(account)`) | Your account: the members’ pages |
| `/diwan` (`app/[locale]/diwan`) | The Diwan: the officers’ administration |
| `/api` (`app/api`, `lib/api`) | Email and the outbox, cron, feeds, exports, file links, Google Wallet, the Notion sync and Hudhud, the Telegram bot |

`packages/brand` is the design system (SAL-MED-02) and its Storybook;
`packages/*` hold the shared code (`@repo/<name>`); `apps/e2e` holds the
Playwright and axe journeys.

## Stack

Next.js 16 and React on Node.js 26 (LTS), Bun workspaces with Turborepo,
TypeScript, Tailwind CSS and shadcn/ui, next-intl. Supabase (Postgres with
Row Level Security on every table, Auth, Storage, pg_cron), Vercel
(hosting, cookieless Web Analytics), Resend (email), Notion (the officers’
workspace), Telegram (grammY) and Google Wallet. Tests: Vitest, pgTAP and
Playwright with axe. Lint and format: Biome (Ultracite).

## Setup

Prerequisites: Node.js 26 (`.nvmrc`), [Bun](https://bun.sh) and Docker
(for the local Supabase stack).

```sh
bun install
bun run db:start      # local Supabase with every migration
cp apps/web/.env.example apps/web/.env.local
bun run dev           # http://localhost:3000 (the Diwan at /diwan)
```

## Environment

Every variable is described in `apps/web/.env.example`; where each value
lives in production, preview and development is in
`docs/platform/secrets.md`. Fill the Supabase keys from `bunx supabase
status` (in `packages/database`). Leave the integrations empty locally:
email is logged, and Turnstile, Notion, Telegram and Wallet stay off.

## Scripts

```sh
bun run dev | build
bun run check | fix          # Biome
bun run typecheck
bun run test                 # Vitest in every workspace
bun run db:start | db:reset | db:test | db:types
bun run check:placeholders && bun run check:rtl && bun run check:i18n
bun run check:unused         # Knip
```

## Testing

`bun run test` runs the unit tests, `bun run db:test` the pgTAP tests
(RLS, every RPC and the Supabase advisor invariants), and `bun run --cwd
apps/e2e e2e` the browser journeys against a local stack. Integration
tests run with `SUPABASE_INTEGRATION=1`, as in `.github/workflows/ci.yml`.

## Deploy

A pull request runs CI. When it merges to `main`, CI runs again, then
`migrate.yml` applies the new migrations to production (`supabase db
push`), and Vercel deploys `main`. Nothing is applied to production by
hand. The nightly backup and how to restore it: `docs/platform/backups.md`.

## Docs

- `claude/decisions.md` and `claude/glossary_ar.md`: the owner’s decisions and the Arabic glossary, a read-only mirror of the Claude project’s copies (replaced whole, never edited here)
- `AGENTS.md`: the code conventions for people and AI agents
- `packages/brand/BRAND-BOOK.md`: the brand rules
- `ARCHITECTURE_AND_INTEGRATIONS.md`: how the pieces fit together
- `docs/adr/`: the technical decisions and why
- `docs/platform/`: the runbooks (email, backups, retention, secrets, vendors, releases, incidents)
- `PROGRESS.md`: what is done and what is open

## Contributing

Read `AGENTS.md` and `.github/CONTRIBUTING.md`. Work on a branch, open a
pull request with the template, and run `check`, `typecheck` and `test`
(and `db:test` for a schema change) before pushing.

## Security

Report a vulnerability privately to hello@auibsal.org (see
`.github/SECURITY.md` and `/.well-known/security.txt`), never in an issue.

## License

Unlicensed: all rights reserved by the AUIB Society of Arts and Letters.
The code is public to read; it is not licensed for reuse.
