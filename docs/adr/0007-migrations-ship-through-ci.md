# 0007. Migrations ship through CI, in order

Status: Accepted (November 8, 2026)

## Context

SQL pasted into production leaves no record and no test. Two pull
requests merged out of order once stopped every later migration.

## Decision

A migration is a file in `packages/database/supabase/migrations`. After a
merge to `main` and a green CI, `migrate.yml` runs `supabase db push`
against production. CI refuses a pull request whose new migration is older
than the newest on `main`, so pushes need no `--include-all`.

## Consequences

Production's schema always matches the repository. A red `main` holds the
migrations back, so `main` must stay green.

## Amendment (November 17, 2026)

The owner turned on Supabase's GitHub integration (Deploy to production,
`main`, working directory `packages/database`). It applies a merged pull
request's migrations itself; `migrate.yml` now waits for production to
have them all, applies any left, and only then deploys the site. Pull
requests still merge only with CI green, so a migration reaches
production only once tested.
