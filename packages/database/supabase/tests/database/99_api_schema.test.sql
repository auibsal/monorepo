-- The Data API's one schema (decisions.md, The site; PostgREST's Schema
-- Isolation): `api` mirrors exactly what the data schemas let a client
-- role reach, as the caller. It fails when a migration changed a table, a
-- column, a grant or a function and didn't end with
-- `select private.build_api();`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;

select plan(10);

-- Every table a client role reaches has its view, with the same columns.
select is(
  (select count(*)::int from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = any (private.data_schemas()) and c.relkind in ('r', 'p')
     and exists (
       select 1 from unnest(array['anon', 'authenticated', 'service_role']) r(name),
         unnest(array['select', 'insert', 'update', 'delete']) k(name)
       where has_table_privilege(r.name, c.oid, k.name)
         or (k.name <> 'delete' and has_any_column_privilege(r.name, c.oid, k.name)))
     and to_regclass(format('api.%I', private.api_name(n.nspname, c.relname, false))) is null),
  0, 'every table the clients reach has its view in api');

select is(
  (select count(*)::int from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   -- A table some clients read only in part: its _all view has every column.
   join pg_class v on v.oid = coalesce(
     to_regclass(format('api.%I', private.api_name(n.nspname, c.relname, false) || '_all')),
     to_regclass(format('api.%I', private.api_name(n.nspname, c.relname, false))))
   where n.nspname = any (private.data_schemas()) and c.relkind in ('r', 'p')
     and (select array_agg(attname order by attnum) from pg_attribute
          where attrelid = c.oid and attnum > 0 and not attisdropped)
       is distinct from
         (select array_agg(attname order by attnum) from pg_attribute
          where attrelid = v.oid and attnum > 0 and not attisdropped)),
  0, 'each view has its table''s columns, in order (a new column means build_api again)');

-- Every function a client role calls has its wrapper, with the same arguments.
select is(
  (select count(*)::int from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = any (private.data_schemas()) and p.prokind = 'f'
     and p.prorettype not in ('trigger'::regtype, 'event_trigger'::regtype)
     and (has_function_privilege('anon', p.oid, 'execute')
       or has_function_privilege('authenticated', p.oid, 'execute')
       or has_function_privilege('service_role', p.oid, 'execute'))
     and not exists (
       select 1 from pg_proc w
       where w.pronamespace = 'api'::regnamespace
         and w.proname = private.api_name(n.nspname, p.proname, true)
         and pg_get_function_identity_arguments(w.oid) = pg_get_function_identity_arguments(p.oid))),
  0, 'every function the clients call has its wrapper in api');

-- As the caller, always.
select is(
  (select count(*)::int from pg_class v
   where v.relnamespace = 'api'::regnamespace and v.relkind = 'v'
     and not coalesce(v.reloptions @> array['security_invoker=true'], false)),
  0, 'every view runs as the caller (security_invoker), so RLS decides');
select is(
  (select count(*)::int from pg_proc w
   where w.pronamespace = 'api'::regnamespace and w.prosecdef),
  0, 'no wrapper runs as its owner');

-- api holds nothing but what build_api makes.
select is(
  (select count(*)::int from pg_class c
   where c.relnamespace = 'api'::regnamespace and c.relkind not in ('v')),
  0, 'api holds only views and wrappers, no tables of its own');

-- A column a client may not read is in no view it can reach.
select is(
  (select count(*)::int from pg_class v
   join pg_attribute va on va.attrelid = v.oid and va.attnum > 0
   where v.relnamespace = 'api'::regnamespace and v.relkind = 'v'
     and v.relname = 'contributors' and va.attname = 'user_id'),
  0, 'api.contributors has no user_id (blind review)');
select is(
  (select array_agg(distinct g.grantee::text order by g.grantee::text)
   from information_schema.role_table_grants g
   where g.table_schema = 'api' and g.table_name like '%\_all'),
  array['postgres', 'service_role'], 'the _all views are for the server only');

select is(
  (select array_agg(replace(relname, '_all', '') order by relname) from pg_class
   where relnamespace = 'api'::regnamespace and relname like '%\_all'),
  array['blind_entries', 'contributors', 'newsletter_subscribers', 'profiles',
    'recovery_codes', 'student_life_weeks', 'sunday_paper_issues', 'telegram_groups'],
  'the tables read in part are those in partlyRead (@repo/database)');

-- RLS still decides through a view: a token issued to a third-party app
-- reaches nothing.
select set_config('request.jwt.claims',
  '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001","client_id":"9b2f3c1e-0000-4000-8000-000000000001","aal":"aal2"}', true);
set local role authenticated;
select is((select count(*)::int from api.events), 0,
  'a third-party app reads nothing through api');
reset role;

select * from finish();
rollback;
