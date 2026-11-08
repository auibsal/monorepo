# 0002. Row Level Security is the security boundary

Status: Accepted

## Context

Your account and the Diwan are client-rendered and talk to Supabase with
the member's own token. Any check in the browser can be skipped by anyone
who opens the console.

## Decision

Postgres Row Level Security decides every read and write. Every table has
RLS from the migration that creates it, a pgTAP test for each policy and
the restrictive "No third-party apps" policy. Policies ask
`access.has_permission(...)`, never a role name. Checks in the interface
are for the interface only.

## Consequences

A new table is not done until its policies and tests are.
`00_structure.test.sql`, `99_no_third_party_apps.test.sql` and
`00_advisors.test.sql` fail CI otherwise. The admin client, which bypasses
RLS, is used only in webhooks, cron and the API routes.
