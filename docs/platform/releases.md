# Releases and migrations

How a change reaches auibsal.org (the site, the Diwan and the API) and the database.

Every change goes through a pull request to `main`. Nothing is edited on production by hand: not the code, not the database.

1. **Open a pull request.** CI runs lint, types, unit tests, the unused-code check, the RTL and translation checks, builds the app, starts a local database with every migration and runs the Row Level Security tests, and runs the browser journeys with accessibility checks. CodeQL scans the code. Vercel builds a preview.
2. **Merge when CI is green.** Vercel builds previews for pull requests, but not `main` (`apps/web/vercel.json`): `main` deploys after its migrations (owner, Nov 8, 2026).
   Squash merges put every commit message of the pull request into the merge commit, and GitHub skips all workflows on `main` when that message contains one of its skip markers (`skip ci` or `ci skip` in square brackets, and their `actions` variants). Never write those markers literally in a commit message or its body, not even to describe them; refer to "the skip marker" instead. CI fails a pull request whose commits contain one. A branch that was squash-merged keeps its old commits, and GitHub counts them in the next pull request from it: restart the branch from `main` after a merge. If a merge slips through anyway, the migration does not run: merge a follow-up change, or run **Migrate production database** by hand (Actions → Run workflow).
3. **The database.** When CI passes on `main`, the **Migrate production database** workflow runs `supabase db push`, which applies only migrations production has not seen, in order, and stops at the first error. Then it calls the Deploy Hook, so the site goes live only once its database has caught up. It needs `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` and `VERCEL_DEPLOY_HOOK` (Vercel → the project → Settings → Git → Deploy Hooks, for `main`) in the production environment; without them it fails and nothing deploys.
4. **Check.** The workflow run is green, the Vercel deployments read Ready, and auibsal.org and auibsal.org/api/health answer.

## Versions and GitHub releases

The platform follows [Semantic Versioning](https://semver.org): a major
version for a change that breaks how people or other systems use it, a
minor version for new features, a patch for fixes. Every workspace keeps
the same version as the root `package.json`, and each release has its
entry in `CHANGELOG.md`.

To cut a release once its pull request is merged and `main` is green:

1. On GitHub, open **Releases** (the repository's right-hand column, or
   `/releases`) → **Draft a new release**.
2. **Choose a tag** → type the version with a `v` (`v1.0.0`) → **Create
   new tag on publish**. Target: `main`.
3. Title it the same (`v1.0.0`), paste that version's `CHANGELOG.md`
   entry as the description (or **Generate release notes**, then trim).
4. Leave **Set as a pre-release** off, keep **Set as the latest release**
   on, and **Publish release**.

The tag marks the exact commit that was deployed; Vercel's deployment for
that commit is the one to promote if a later release has to be rolled back.

## Rules for database changes

- A schema change is a new file in `packages/database/supabase/migrations`. Never edit a migration that has reached production; add a new one.
- Every new table enables Row Level Security in the same migration, and every policy has a pgTAP test. CI fails a table without RLS.
- Regenerate the types (`bun run db:types`) and commit them; CI checks they match.
- Never paste SQL into the production database. If a migration fails, fix it with a new migration and merge again.

## If a release breaks something

1. **Roll back the app** in Vercel: open the project, pick the last good production deployment, and promote it. This takes seconds and touches no data.
2. **Fix forward** with a pull request. A database change is never rolled back by hand; a new migration undoes it.
3. If data was lost, see [Backups and restore](backups.md).
