-- The Supabase advisor stays clean: CI fails if a function in an exposed
-- schema runs with its owner's rights and a client role may call it, if a
-- table has two permissive policies for the same role and action, if a
-- foreign key has no index, or if the hand-made function comes back.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;

select plan(7);

-- RPC convention: the body lives in private (SECURITY DEFINER, with its own
-- permission checks); the exposed name is a SECURITY INVOKER wrapper.
select is_empty(
  $$
    select n.nspname || '.' || p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'core', 'access', 'membership', 'events',
        'journal', 'charity', 'programmes', 'governance', 'content')
      and p.prosecdef
      and (has_function_privilege('anon', p.oid, 'execute')
        or has_function_privilege('authenticated', p.oid, 'execute'))
  $$,
  'No SECURITY DEFINER function in an exposed schema is callable by anon or authenticated (advisor 0028, 0029)'
);

select is_empty(
  $$
    select n.nspname || '.' || p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'core', 'access', 'membership', 'events',
        'journal', 'charity', 'programmes', 'governance', 'content', 'private')
      and p.prokind = 'f'
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, '{}')) c
        where c like 'search_path=%')
  $$,
  'Every function in a SAL schema pins its search_path (advisor 0011)'
);

select is_empty(
  $$
    with expanded as (
      select schemaname, tablename, policyname,
        unnest(case when roles = '{public}'
          then array['anon', 'authenticated'] else roles::text[] end) as role,
        unnest(case when cmd = 'ALL'
          then array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] else array[cmd] end) as action
      from pg_policies
      where permissive = 'PERMISSIVE'
    )
    select schemaname || '.' || tablename || ' ' || role || ' ' || action
    from expanded
    group by schemaname, tablename, role, action
    having count(*) > 1
  $$,
  'No table has two permissive policies for the same role and action (advisor 0006)'
);

select is_empty(
  $$
    select c.conrelid::regclass::text || '.' || c.conname
    from pg_constraint c
    join pg_namespace n on n.oid = c.connamespace
    where c.contype = 'f'
      and n.nspname in ('public', 'core', 'access', 'membership', 'events',
        'journal', 'charity', 'programmes', 'governance', 'content', 'private')
      and not exists (
        select 1 from pg_index i
        where i.indrelid = c.conrelid
          and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] = c.conkey::int2[])
  $$,
  'Every foreign key in a SAL schema has an index on its columns (advisor 0001)'
);

select hasnt_function('public', 'rls_auto_enable',
  'The hand-made rls_auto_enable function is gone');

-- The daily cron watch: a failed run becomes one outbox notice.
select is((select private.cron_health()), 0, 'No failed runs, no notice');

insert into cron.job_run_details (jobid, runid, database, username, command, status, return_message, start_time, end_time)
select jobid, (select coalesce(max(runid), 0) + 1 from cron.job_run_details), 'postgres', 'postgres', command, 'failed', 'ERROR: boom', now() - interval '1 hour', now() - interval '1 hour'
from cron.job where jobname = 'sal-daily';
select private.cron_health();
select is(
  (select count(*)::int from core.outbox where kind = 'platform.cron_failed'
     and payload -> 'jobs' -> 0 ->> 'job' = 'sal-daily'),
  1, 'A failed cron run is queued for the administrators');

select * from finish();
rollback;
