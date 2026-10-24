# Releases and migrations

How a change reaches auibsal.org (the site, the Nexus and the API) and the database.

Every change goes through a pull request to `main`. Nothing is edited on production by hand: not the code, not the database.

1. **Open a pull request.** CI runs lint, types, unit tests, the unused-code check, the RTL and translation checks, builds the app, starts a local database with every migration and runs the Row Level Security tests, and runs the browser journeys with accessibility checks. CodeQL scans the code. Vercel builds a preview.
2. **Merge when CI is green.** Vercel builds and deploys the app to production.
   Squash merges put every commit message of the pull request into the merge commit, and GitHub skips all workflows on `main` when that message contains one of its skip markers (`skip ci` or `ci skip` in square brackets, and their `actions` variants). Never write those markers literally in a commit message or its body, not even to describe them; refer to "the skip marker" instead. CI fails a pull request whose commits contain one. A branch that was squash-merged keeps its old commits, and GitHub counts them in the next pull request from it: restart the branch from `main` after a merge. If a merge slips through anyway, the migration and the deployments do not run: merge a follow-up change, or run **Migrate production database** by hand (Actions → Run workflow) and redeploy in Vercel.
3. **The database follows.** When CI passes on `main`, the **Migrate production database** workflow runs `supabase db push`. It applies only migrations production has not seen, in order, and stops at the first error.
4. **Check.** The workflow run is green, the Vercel deployments read Ready, and the BetterStack monitors stay up.

## Rules for database changes

- A schema change is a new file in `packages/database/supabase/migrations`. Never edit a migration that has reached production; add a new one.
- Every new table enables Row Level Security in the same migration, and every policy has a pgTAP test. CI fails a table without RLS.
- Regenerate the types (`bun run db:types`) and commit them; CI checks they match.
- Never paste SQL into the production database. If a migration fails, fix it with a new migration and merge again.

## If a release breaks something

1. **Roll back the app** in Vercel: open the project, pick the last good production deployment, and promote it. This takes seconds and touches no data.
2. **Fix forward** with a pull request. A database change is never rolled back by hand; a new migration undoes it.
3. If data was lost, see [Backups and restore](backups.md).
