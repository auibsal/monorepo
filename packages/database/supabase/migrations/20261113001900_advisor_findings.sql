-- The monthly look at the advisors (decisions.md, Platform: "a monthly look
-- at the advisors on the Desk"): the checks CI already holds at zero
-- (00_advisors.test.sql), run live for whoever keeps the platform
-- (settings.manage), so a change made outside a migration shows up too.

create function private.advisor_findings()
returns table (check_key text, item text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('settings.manage') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  -- A table in a SAL schema without row level security.
  return query
  select 'rls_disabled'::text, n.nspname || '.' || c.relname
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where c.relkind = 'r' and not c.relrowsecurity
    and n.nspname in ('public', 'core', 'access', 'membership', 'events',
      'journal', 'programmes', 'governance', 'content');

  -- An exposed SECURITY DEFINER function a client role may call (0028, 0029).
  return query
  select 'definer_exposed'::text, n.nspname || '.' || p.proname
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'core', 'access', 'membership', 'events',
      'journal', 'programmes', 'governance', 'content')
    and p.prosecdef
    and (has_function_privilege('anon', p.oid, 'execute')
      or has_function_privilege('authenticated', p.oid, 'execute'));

  -- A function without a pinned search_path (0011).
  return query
  select 'search_path'::text, n.nspname || '.' || p.proname
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'core', 'access', 'membership', 'events',
      'journal', 'programmes', 'governance', 'content', 'private')
    and p.prokind = 'f'
    and not exists (
      select 1 from unnest(coalesce(p.proconfig, '{}')) c
      where c like 'search_path=%');

  -- Two permissive policies for the same role and action (0006).
  return query
  with expanded as (
    select schemaname, tablename,
      unnest(case when roles = '{public}'
        then array['anon', 'authenticated'] else roles::text[] end) as role,
      unnest(case when cmd = 'ALL'
        then array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] else array[cmd] end) as action
    from pg_policies
    where permissive = 'PERMISSIVE'
  )
  select 'multiple_policies'::text,
    schemaname || '.' || tablename || ' ' || role || ' ' || action
  from expanded
  group by schemaname, tablename, role, action
  having count(*) > 1;

  -- A foreign key without an index on its columns (0001).
  return query
  select 'unindexed_foreign_key'::text, c.conrelid::regclass::text || '.' || c.conname
  from pg_constraint c
  join pg_namespace n on n.oid = c.connamespace
  where c.contype = 'f'
    and n.nspname in ('public', 'core', 'access', 'membership', 'events',
      'journal', 'programmes', 'governance', 'content', 'private')
    and not exists (
      select 1 from pg_index i
      where i.indrelid = c.conrelid
        and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] = c.conkey::int2[]);
end;
$$;

revoke all on function private.advisor_findings() from public, anon;
grant execute on function private.advisor_findings() to authenticated, service_role;

create function core.advisor_findings()
returns table (check_key text, item text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.advisor_findings() $$;

revoke all on function core.advisor_findings() from public, anon;
grant execute on function core.advisor_findings() to authenticated, service_role;
