# Retention

How long the site keeps each kind of record, and how it is deleted. This
is the site's half of the records retention schedule in the Policy Manual
(SAL-GOV-03, decisions §13): the Privacy Notice shows its personal-data
rows and links to it, and the site enforces every row below.

The schedule lives in one place, `private.retention_schedule()` (readable
as `core.retention_schedule()`). One daily pg_cron job, `sal-retention`
(5:15 UTC), runs every rule that is only rows; the daily Vercel Cron
`/api/cron/retention` (1:00 UTC) runs the rules that also remove files or
whole accounts, removing the files first, and then the same rules. A rule
that fails is emailed to the administrators (`platform.cron_failed`) and the
others still run. `99_retention.test.sql` tests each rule.

| Record | Kept | Deleted by |
| --- | --- | --- |
| Unpublished Write for Qirtas submissions, with their files | 12 months after the decision | the route |
| Write for Qirtas drafts | 12 months after the last change | `purge_stale_drafts` |
| Blind copies, assignments, scores and decisions of deleted submissions | 12 months | `purge_blind_entries` |
| Invitation lists (the Tour's, the club fair's) | 30 days after the list is sent (the Tour list on December 7, 2026) | `purge_tour_lists` |
| Unclaimed spring 2026 Tour pages, with their photographs | Until the spring 2027 Tour (`tour.unclaimed_until`, seeded June 30, 2027) | the route, then `purge_unclaimed_tour_pages` |
| Associate membership requests | 1 year after the decision (a declined request’s Tour page at once) | `purge_associate_requests` |
| Qalam consent forms (F-38, F-39), the roster and its attendance | 3 years after the program year | `purge_qalam_records` |
| Incident records (F-16) | 7 years | `purge_incident_records` |
| Ballots, ballot receipts and voter lists | 1 year after the vote closes | `purge_expired_ballots` |
| Who voted for the Mutanabbi Prize (the votes stay, unlinked) | 1 year after the vote closes | `purge_prize_vote_receipts` |
| Get involved replies | 12 months after the last change, once decided | `purge_opening_replies` |
| Removal requests | 2 years after closing | `purge_removal_requests` |
| Unconfirmed Sunday Paper sign-ups | Until the confirmation window closes | `purge_unconfirmed_subscribers` |
| Unconfirmed personal email requests | 7 days | `purge_personal_email_requests` |
| Push subscriptions and calendar feed addresses | 12 months without a sign-in | `purge_idle_devices` |
| Guest accounts holding no role | 2 years without a sign-in | the route (`deleteAccount`) |
| The activity log (ids and changed columns only) | 12 months | `purge_activity_log` |
| Sent emails in the outbox | 30 days after sending | `prune_outbox` |
| Backups | 30 days (GitHub), by the R2 lifecycle rule (R2) | `docs/platform/backups.md` |

Accounts a person deletes go at once, with their own files and activity
lines (`lib/api/deletion.ts`); deletion keeps the name, roles held and
published bylines (decisions §11).

Where decisions.md sets no period (drafts, replies, removal requests,
devices, guests, Prize voters), the period is the usual practice of
student organizations; the Governance chat confirms them in SAL-GOV-03.

## Adding a rule

1. Write a `private.purge_<what>()` function returning the rows deleted.
2. Add its row to `private.retention_schedule()` (a new migration
   replacing the function).
3. Add a test to `99_retention.test.sql`, and a row here.
