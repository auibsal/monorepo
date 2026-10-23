-- The rest of the Supabase advisor list, and a watch on the cron jobs.

-- 1. A function created in the production database by hand, outside the
--    migrations (public.rls_auto_enable, with its event trigger). Nothing
--    calls it; every table gets RLS in the migration that creates it, and
--    00_structure.test.sql fails when one does not. The local database never
--    had it, so this runs only where it exists.
do $$
declare
  t record;
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    for t in
      select evtname from pg_event_trigger
      where evtfoid = to_regprocedure('public.rls_auto_enable()')
    loop
      execute format('drop event trigger if exists %I', t.evtname);
    end loop;
    drop function public.rls_auto_enable();
  end if;
end;
$$;

-- 2. Foreign keys without a covering index (advisor 0001).
create index if not exists oauth_clients_created_by_idx
  on access.oauth_clients (created_by);
create index if not exists handbook_pages_updated_by_idx
  on governance.handbook_pages (updated_by);
create index if not exists form_types_handle_permission_idx
  on governance.form_types (handle_permission);
create index if not exists telegram_groups_registered_by_idx
  on core.telegram_groups (registered_by);

-- 3. The Notion mirror was the database's heaviest reader (every five
--    minutes, every mirrored table). Every fifteen minutes is prompt enough
--    for a team workspace.
select cron.schedule('sal-notion-sync', '*/15 * * * *',
  $$ select private.call_api('/cron/notion-sync', '{}'::jsonb, 'cron_secret') $$);

-- 4. Failed cron runs used to fail silently. Once a day, the runs that
--    failed in the last day go to the administrators (settings.manage) as
--    one outbox notice, and run records older than thirty days are pruned.
create function private.cron_health()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  failed jsonb;
  n integer;
begin
  select
    jsonb_agg(jsonb_build_object(
      'job', j.jobname,
      'failures', f.failures,
      'last_error', f.last_error,
      'last_at', f.last_at) order by j.jobname),
    count(*)
  into failed, n
  from (
    select d.jobid, count(*) as failures, max(d.end_time) as last_at,
      (array_agg(left(coalesce(d.return_message, ''), 300) order by d.end_time desc))[1] as last_error
    from cron.job_run_details d
    where d.status = 'failed' and d.end_time > now() - interval '1 day'
    group by d.jobid
  ) f
  join cron.job j on j.jobid = f.jobid;
  if n > 0 then
    perform private.enqueue('platform.cron_failed',
      jsonb_build_object('jobs', failed, 'day', (now() at time zone 'UTC')::date));
  end if;
  delete from cron.job_run_details where end_time < now() - interval '30 days';
  return coalesce(n, 0);
end;
$$;

comment on function private.cron_health() is
  'Daily: one notice to the administrators listing the cron jobs that failed in the last day; prunes run records older than 30 days.';

select cron.schedule('sal-cron-health', '35 5 * * *', $$ select private.cron_health() $$);
