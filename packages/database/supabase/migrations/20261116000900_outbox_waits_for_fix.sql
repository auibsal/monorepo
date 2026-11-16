-- The outbox waits for a configuration fix (decisions.md, The site: no
-- silent failures).
--
-- When a send fails for a configuration reason (the email key, its
-- domain), the row is marked `waits_for_fix`. Once an email sends again,
-- the drain retries each such row once (lib/api/outbox.ts,
-- retryAfterFix), but never one older than 7 days or whose link has
-- expired: those are closed with the reason.

alter table core.outbox add column waits_for_fix boolean not null default false;
comment on column core.outbox.waits_for_fix is
  'Failed for a configuration reason; retried once after the next successful send, if no older than 7 days and its link has not expired.';

-- The four emails that failed between Oct 25 and Nov 4, when the email key
-- was limited to another domain. The two address confirmations carried
-- links that have since expired: closed. The role and the opening reply
-- are queued again once, as new rows.
update core.outbox
set processed_at = now(),
  last_error = 'expired: its link expired before the email key was fixed'
where kind = 'personal_email.confirm'
  and processed_at is null
  and attempts >= 5
  and last_error like 'The associated domain with your API key is not verified%';

with failed as (
  update core.outbox
  set processed_at = now(),
    last_error = 'replaced: queued again once after the email key was fixed'
  where kind in ('access.role_assigned', 'programmes.opening_reply')
    and processed_at is null
    and attempts >= 5
    and last_error like 'The associated domain with your API key is not verified%'
  returning kind, payload
)
insert into core.outbox (kind, payload)
select kind, payload from failed;
