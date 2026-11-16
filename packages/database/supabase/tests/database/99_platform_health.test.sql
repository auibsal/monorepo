-- The hourly platform health check (private.platform_health; decisions.md,
-- The site: no silent failures): a failed job, a late one, and the email
-- outbox, each raised once a day for the web lead, and never a false alarm
-- about the check itself or about an email that has already given up.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;

select plan(8);

delete from core.staff_alerts;
delete from core.outbox;

create function pg_temp.run(job text, status text, started interval)
returns void
language sql
as $$
  insert into cron.job_run_details (jobid, runid, database, username, command, status, return_message, start_time, end_time)
  select j.jobid, (select coalesce(max(runid), 0) + 1 from cron.job_run_details), 'postgres', 'postgres', j.command,
    status, '', now() - started, case when status = 'running' then null else now() - started end
  from cron.job j where j.jobname = job;
$$;

create function pg_temp.alerts(prefix text)
returns integer
language sql
as $$
  select count(*)::int from core.staff_alerts where dedupe_key like prefix || '%';
$$;

-- The check itself, mid-run on its first hour, is not late.
select pg_temp.run('sal-platform-health', 'running', interval '0 minutes');
select private.platform_health();
select is(pg_temp.alerts('cron-late:sal-platform-health'), 0,
  'The health job never reports itself as late');

-- An hourly job that started ten minutes ago has not been due yet.
select cron.schedule('test-hourly', '5 * * * *', 'select 1');
select pg_temp.run('test-hourly', 'running', interval '10 minutes');
select private.platform_health();
select is(pg_temp.alerts('cron-late:test-hourly'), 0,
  'A job that has not been due yet is not late');

-- Three hours on, with no success, it is.
select pg_temp.run('test-hourly', 'failed', interval '3 hours');
select private.platform_health();
select is(pg_temp.alerts('cron-late:test-hourly'), 1,
  'An hourly job with no success in two hours is late');

-- An email that gave up after its five tries: no "waited over an hour".
insert into core.outbox (kind, payload, created_at, attempts, last_error)
values ('access.role_assigned', '{}', now() - interval '2 days', 5, 'domain not verified');
select private.platform_health();
select is(pg_temp.alerts('outbox-stalled:'), 0,
  'An email that has given up does not raise the outbox alarm');
select is(pg_temp.alerts('outbox-dead:'), 1,
  'It is reported once, as an email that gave up');
select is((select urgent from core.staff_alerts where dedupe_key like 'outbox-dead:%'), false,
  'That report goes to the digest, not as urgent');
select private.platform_health();
select is(pg_temp.alerts('outbox-dead:'), 1,
  'The same email is not reported again');

-- An email still being tried that has waited two hours: urgent.
insert into core.outbox (kind, payload, created_at, attempts)
values ('account.new_device', '{}', now() - interval '2 hours', 1);
select private.platform_health();
select is(pg_temp.alerts('outbox-stalled:'), 1,
  'An email still being tried after an hour raises the outbox alarm');

select * from finish();
rollback;
