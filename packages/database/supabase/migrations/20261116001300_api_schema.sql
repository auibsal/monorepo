-- One schema for the Data API (PostgREST's own guide, "Schema Isolation";
-- the owner, Nov 17, 2026): `api` is the only schema the Data API exposes.
-- The data stays in its own schemas (core, access, membership, events,
-- journal, programs, governance, content), which are no longer exposed.
--
-- `api` holds nothing of its own. For each table a client role can reach,
-- a view with security_invoker, so Row Level Security, the restrictive "No
-- third-party apps" policy and every grant (column grants included) still
-- decide, as the caller; for each function a client role can call, a
-- SECURITY INVOKER wrapper with the same arguments and result. Names are
-- the table's or function's own; a name used in two schemas takes its
-- schema as a prefix (events_invitations, membership_invitations).
--
-- private.build_api() makes it all from the catalog, so the API can't
-- drift from the data: every migration that adds or changes a table, a
-- column, a grant or a function the clients use ends with
-- `select private.build_api();` (AGENTS.md), and
-- 99_api_schema.test.sql fails when it was forgotten.

create schema if not exists api;
comment on schema api is
  'The Data API: views and wrappers over the data schemas, made by private.build_api(); never edited by hand.';

create function private.data_schemas()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['core', 'access', 'membership', 'events', 'journal',
    'programs', 'governance', 'content']
$$;
revoke all on function private.data_schemas() from public, anon, authenticated;

-- The name a table or function has in `api`.
create function private.api_name(schema_name text, object_name text, is_function boolean)
returns text
language sql
stable
set search_path = ''
as $$
  select case when (
    case when is_function then
      (select count(distinct n.nspname) from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = any (private.data_schemas()) and p.proname = object_name)
    else
      (select count(*) from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = any (private.data_schemas()) and c.relname = object_name
         and c.relkind in ('r', 'p', 'v', 'm'))
    end) > 1
  then schema_name || '_' || object_name
  else object_name end
$$;
revoke all on function private.api_name(text, text, boolean) from public, anon, authenticated;

create function private.build_api()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  rel record;
  fn record;
  role_name text;
  priv text;
  made integer := 0;
  call_args text;
  body text;
  volatility text;
  view_name text;
  columns text;
begin
  drop schema if exists api cascade;
  create schema api;
  comment on schema api is
    'The Data API: views and wrappers over the data schemas, made by private.build_api(); never edited by hand.';
  grant usage on schema api to anon, authenticated, service_role;

  -- A view for every table a role can reach.
  for rel in
    select c.oid, n.nspname, c.relname,
      -- Where a client role may read only some columns (journal.contributors
      -- hides user_id), its view holds just the columns every client role
      -- that reads the table may read: a view checks each column it holds.
      exists (
        select 1 from unnest(array['anon', 'authenticated']) r(name)
        where not has_table_privilege(r.name, c.oid, 'select')
          and has_any_column_privilege(r.name, c.oid, 'select')
      ) as limited
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = any (private.data_schemas())
      and c.relkind in ('r', 'p')
      and exists (
        select 1 from unnest(array['anon', 'authenticated', 'service_role']) r(name),
          unnest(array['select', 'insert', 'update', 'delete']) p(name)
        where has_table_privilege(r.name, c.oid, p.name)
          or (p.name <> 'delete' and has_any_column_privilege(r.name, c.oid, p.name))
      )
    order by n.nspname, c.relname
  loop
    view_name := private.api_name(rel.nspname, rel.relname, false);
    if rel.limited then
      select string_agg(quote_ident(a.attname), ', ' order by a.attnum) into columns
      from pg_attribute a
      where a.attrelid = rel.oid and a.attnum > 0 and not a.attisdropped
        and not exists (
          select 1 from unnest(array['anon', 'authenticated']) r(name)
          where has_any_column_privilege(r.name, rel.oid, 'select')
            and not has_column_privilege(r.name, rel.oid, a.attnum, 'select'));
    else
      columns := '*';
    end if;
    execute format(
      'create view api.%I with (security_invoker = true) as select %s from %I.%I',
      view_name, columns, rel.nspname, rel.relname);
    -- The view passes each kind of access the role has at all; the table's
    -- own grants (columns included) and policies decide, as the caller.
    foreach role_name in array array['anon', 'authenticated', 'service_role'] loop
      foreach priv in array array['select', 'insert', 'update', 'delete'] loop
        if has_table_privilege(role_name, rel.oid, priv)
          or (priv <> 'delete' and has_any_column_privilege(role_name, rel.oid, priv))
        then
          execute format('grant %s on api.%I to %I', priv, view_name, role_name);
        end if;
      end loop;
    end loop;
    -- Every column, for the server's secret key only (service_role).
    if rel.limited then
      execute format(
        'create view api.%I with (security_invoker = true) as select * from %I.%I',
        view_name || '_all', rel.nspname, rel.relname);
      foreach priv in array array['select', 'insert', 'update', 'delete'] loop
        if has_table_privilege('service_role', rel.oid, priv) then
          execute format('grant %s on api.%I to service_role', priv, view_name || '_all');
        end if;
      end loop;
      made := made + 1;
    end if;
    made := made + 1;
  end loop;

  -- A wrapper for every function a client role can call.
  for fn in
    select p.oid, n.nspname, p.proname, p.pronargs, p.proretset, p.provolatile,
      p.prorettype, t.typtype,
      pg_get_function_arguments(p.oid) as args,
      pg_get_function_result(p.oid) as result
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_type t on t.oid = p.prorettype
    where n.nspname = any (private.data_schemas())
      and p.prokind = 'f'
      and p.prorettype not in ('trigger'::regtype, 'event_trigger'::regtype)
      and (has_function_privilege('anon', p.oid, 'execute')
        or has_function_privilege('authenticated', p.oid, 'execute')
        or has_function_privilege('service_role', p.oid, 'execute'))
    order by n.nspname, p.proname, p.oid
  loop
    select coalesce(string_agg('$' || i, ', ' order by i), '')
      into call_args
    from generate_series(1, fn.pronargs) i;
    body := case
      when fn.proretset or fn.typtype = 'c' or fn.prorettype = 'record'::regtype
        then format('select * from %I.%I(%s)', fn.nspname, fn.proname, call_args)
      else format('select %I.%I(%s)', fn.nspname, fn.proname, call_args)
    end;
    volatility := case fn.provolatile
      when 'i' then 'immutable' when 's' then 'stable' else 'volatile' end;
    execute format(
      'create function api.%I(%s) returns %s language sql %s security invoker set search_path = '''' as $body$ %s $body$',
      private.api_name(fn.nspname, fn.proname, true), fn.args, fn.result, volatility, body);
    execute format('revoke all on function api.%I(%s) from public',
      private.api_name(fn.nspname, fn.proname, true), pg_get_function_identity_arguments(fn.oid));
    foreach role_name in array array['anon', 'authenticated', 'service_role'] loop
      if has_function_privilege(role_name, fn.oid, 'execute') then
        execute format('grant execute on function api.%I(%s) to %I',
          private.api_name(fn.nspname, fn.proname, true),
          pg_get_function_identity_arguments(fn.oid), role_name);
      end if;
    end loop;
    made := made + 1;
  end loop;

  -- The Data API reads its schema cache again.
  notify pgrst, 'reload schema';
  return made;
end;
$$;
revoke all on function private.build_api() from public, anon, authenticated;

-- A person's own choices on core.profiles that they may change but not read
-- back as a column (they read them through core.my_private_profile and
-- core.my_name_parts): a view can't carry a column its caller can't read, so
-- Settings saves them here. Only the columns signed-in members may update
-- (their column grants), only their own row.
create function private.update_my_profile(change jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  sets text;
begin
  if me is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  select string_agg(format('%I = (%L::jsonb ->> %L)::%s', k, change, k,
      format_type(a.atttypid, a.atttypmod)), ', ')
    into sets
  from jsonb_object_keys(change) k
  join pg_attribute a on a.attrelid = 'core.profiles'::regclass and a.attname = k
    and a.attnum > 0 and not a.attisdropped
  where has_column_privilege('authenticated', 'core.profiles'::regclass, k, 'update');
  if (select count(*) from jsonb_object_keys(change)) <> (
    select count(*) from jsonb_object_keys(change) k
    where has_column_privilege('authenticated', 'core.profiles'::regclass, k, 'update'))
  then
    raise exception 'Not a choice you can change' using errcode = '42501';
  end if;
  if sets is not null then
    execute format('update core.profiles set %s where id = %L', sets, me);
  end if;
end;
$$;
revoke all on function private.update_my_profile(jsonb) from public, anon, authenticated;

create function core.update_my_profile(change jsonb)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.update_my_profile(change) $$;
revoke all on function core.update_my_profile(jsonb) from public, anon;
grant execute on function core.update_my_profile(jsonb) to authenticated;
grant execute on function private.update_my_profile(jsonb) to authenticated;

select private.build_api();
