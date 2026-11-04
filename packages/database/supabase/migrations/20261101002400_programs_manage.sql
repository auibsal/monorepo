-- The permission key is American English (owner, Nov 4, 2026):
-- programmes.manage is programs.manage. The schema and its identifiers keep
-- `programmes` (code names may stay), but a permission is read by people
-- (in Notion's notes, refusals and the Diwan), so it is renamed everywhere:
-- the key, every role that holds it, the forms it handles, and every policy
-- and function that asks for it.

insert into access.permissions (key, description)
select 'programs.manage', description
from access.permissions
where key = 'programmes.manage'
on conflict (key) do nothing;

update access.role_permissions
set permission = 'programs.manage'
where permission = 'programmes.manage';

update governance.form_types
set handle_permission = 'programs.manage'
where handle_permission = 'programmes.manage';

-- Policies: the same expressions, asking for the new key.
do $$
declare
  p record;
  stmt text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where coalesce(qual, '') like '%programmes.manage%'
       or coalesce(with_check, '') like '%programmes.manage%'
  loop
    stmt := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    if p.qual is not null then
      stmt := stmt || format(' using (%s)', replace(p.qual, 'programmes.manage', 'programs.manage'));
    end if;
    if p.with_check is not null then
      stmt := stmt || format(' with check (%s)', replace(p.with_check, 'programmes.manage', 'programs.manage'));
    end if;
    execute stmt;
  end loop;
end;
$$;

-- Functions: recreated from their own definitions with the new key (their
-- grants, owners and settings are kept by create or replace).
do $$
declare
  f record;
begin
  for f in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.prosrc like '%programmes.manage%'
      and n.nspname not in ('pg_catalog', 'information_schema')
  loop
    execute replace(pg_get_functiondef(f.oid), 'programmes.manage', 'programs.manage');
  end loop;
end;
$$;

delete from access.permissions where key in ('programmes.manage');
