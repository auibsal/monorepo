-- A route that fails or runs out of time reaches the web lead (decisions.md,
-- The site: no silent failures): the health check reads pg_net's answers to
-- the calls private.call_api recorded, once a day per route.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;

select plan(7);

delete from core.staff_alerts;
delete from private.api_calls;

create function pg_temp.answer(id bigint, route text, status integer, timed_out boolean)
returns void
language sql
as $$
  insert into private.api_calls (request_id, path) values (id, route);
  insert into net._http_response (id, status_code, timed_out, created)
  values (id, status, timed_out, now() - interval '5 minutes');
$$;

create function pg_temp.alerts(prefix text)
returns integer
language sql
as $$
  select count(*)::int from core.staff_alerts where dedupe_key like prefix || '%';
$$;

select pg_temp.answer(-1, '/cron/retention', 200, false);
select private.platform_health();
select is(pg_temp.alerts('route-failed:'), 0, 'A route that answered is not reported');

select pg_temp.answer(-2, '/cron/telegram', 504, false);
select pg_temp.answer(-3, '/cron/telegram', 504, false);
select pg_temp.answer(-4, '/cron/calendar-sync', 500, false);
select private.platform_health();
select is(pg_temp.alerts('route-failed:/cron/telegram:'), 1, 'A route that timed out is reported');
select ok((select text_en like '%ran out of time in the last hour (calls: 2)%' from core.staff_alerts
  where dedupe_key like 'route-failed:/cron/telegram:%'), 'As running out of time, with its count');
select ok((select text_en like '%failed in the last hour (calls: 1; last answer: 500)%' from core.staff_alerts
  where dedupe_key like 'route-failed:/cron/calendar-sync:%'), 'A failed route, with its last answer');
select is((select bool_and(urgent and team = 'web') from core.staff_alerts
  where dedupe_key like 'route-failed:%'), true, 'Urgent, for the web lead');

select pg_temp.answer(-5, '/cron/telegram', 504, false);
select private.platform_health();
select is(pg_temp.alerts('route-failed:/cron/telegram:'), 1, 'Once a day per route');

select is(
  (select count(*)::int from information_schema.role_table_grants
   where table_schema = 'private' and table_name = 'api_calls'
     and grantee in ('anon', 'authenticated')),
  0, 'No client reaches the record of calls');

select * from finish();
rollback;
