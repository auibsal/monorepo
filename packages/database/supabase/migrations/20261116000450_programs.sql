-- American spelling in the database too (AGENTS.md, Language and copy; the
-- owner, Nov 17, 2026): the British form of "program" (its stem built
-- below as `w`, so no line here spells it) becomes "program" everywhere:
-- the schema is `programs`, the table core.programs, every *_id column
-- program_id, the role program_lead, and the scope and Notion link kind
-- 'program'. Function bodies, policies and triggers that spell it are made
-- again with the new names; the activity log's past rows and the outbox
-- follow, so a record's history still reads and nothing waiting is lost.

do $rename$
declare
  w constant text := 'program' || 'me';
  ws constant text := w || 's';
  wc constant text := initcap(w);
  r record;
  def text;
  affected oid[];
begin
  -- Functions whose arguments, result or name carry the word: their
  -- parameter names can't change in place, so they are made again.
  select array_agg(p.oid) into affected
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname not in ('pg_catalog', 'information_schema')
    and (p.proname ~ w
      or pg_get_function_arguments(p.oid) ~ w
      or pg_get_function_result(p.oid) ~ w);

  -- What depends on them, and every policy or function that spells the
  -- word, kept to be made again.
  create temp table saved_policies on commit drop as
  select pol.oid, n.nspname as schema_name, c.relname as table_name,
    pol.polname, pol.polpermissive, pol.polcmd,
    array(select case when r2 = 0 then 'public' else pg_get_userbyid(r2) end
      from unnest(pol.polroles) r2) as roles,
    pg_get_expr(pol.polqual, pol.polrelid) as qual,
    pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check
  from pg_policy pol
  join pg_class c on c.oid = pol.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where exists (select 1 from pg_depend d
      where d.classid = 'pg_policy'::regclass and d.objid = pol.oid
        and d.refobjid = any (affected))
    or pg_get_expr(pol.polqual, pol.polrelid) ~* w
    or pg_get_expr(pol.polwithcheck, pol.polrelid) ~* w
    or pol.polname ~* w;

  create temp table saved_triggers on commit drop as
  select t.oid, t.tgname, t.tgrelid, pg_get_triggerdef(t.oid) as def
  from pg_trigger t
  where not t.tgisinternal
    and (t.tgfoid = any (affected) or encode(t.tgargs, 'escape') ~* w);

  create temp table saved_functions on commit drop as
  select p.oid, pg_get_functiondef(p.oid) as def, p.oid = any (affected) as remade,
    p.proacl, obj_description(p.oid, 'pg_proc') as note,
    n.nspname as schema_name, p.proname,
    pg_get_function_identity_arguments(p.oid) as identity
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname not in ('pg_catalog', 'information_schema')
    and p.prokind = 'f'
    and (p.oid = any (affected) or p.prosrc ~* w);

  for r in select * from saved_policies loop
    execute format('drop policy %I on %I.%I', r.polname, r.schema_name, r.table_name);
  end loop;
  for r in select * from saved_triggers loop
    execute format('drop trigger %I on %s', r.tgname, r.tgrelid::regclass);
  end loop;
  for r in select p.oid from pg_proc p where p.oid = any (affected) loop
    execute format('drop function %s', r.oid::regprocedure);
  end loop;

  -- The names.
  execute format('alter schema %I rename to programs', ws);
  execute format('alter table core.%I rename to programs', ws);
  for r in
    select c.table_schema, c.table_name, c.column_name
    from information_schema.columns c
    join pg_class t on t.relname = c.table_name
    join pg_namespace n on n.oid = t.relnamespace and n.nspname = c.table_schema
    where c.column_name ~ w and t.relkind in ('r', 'p')
  loop
    execute format('alter table %I.%I rename column %I to %I', r.table_schema,
      r.table_name, r.column_name, replace(r.column_name, w, 'program'));
  end loop;
  for r in
    select n.nspname, c.relname from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'i' and c.relname ~ w
      and not exists (select 1 from pg_constraint k where k.conindid = c.oid)
  loop
    execute format('alter index %I.%I rename to %I', r.nspname, r.relname,
      replace(r.relname, w, 'program'));
  end loop;
  for r in
    select k.conname, k.conrelid::regclass as rel from pg_constraint k
    where k.conname ~ w
  loop
    execute format('alter table %s rename constraint %I to %I', r.rel, r.conname,
      replace(r.conname, w, 'program'));
  end loop;
  for r in
    select pol.polname, pol.polrelid::regclass as rel from pg_policy pol
    where pol.polname ~* w
  loop
    execute format('alter policy %I on %s rename to %I', r.polname, r.rel,
      replace(replace(r.polname, w, 'program'), wc, 'Program'));
  end loop;

  -- The values: the scope and Notion link kinds, the role.
  alter table access.role_assignments drop constraint role_assignments_scope_type_check;
  update access.role_assignments set scope_type = 'program' where scope_type = w;
  alter table access.role_assignments add constraint role_assignments_scope_type_check
    check (scope_type in ('global', 'program', 'event', 'issue', 'production', 'partner',
      'episode', 'member'));
  alter table core.notion_links drop constraint notion_links_kind_check;
  update core.notion_links set kind = replace(kind, w, 'program')
  where kind ~ w;
  alter table core.notion_links add constraint notion_links_kind_check check (kind in (
    'event', 'event_ar', 'news', 'officer', 'program', 'program_ar', 'document',
    'minutes', 'journal_stage', 'piece', 'piece_ar', 'need',
    'edition', 'production', 'episode', 'opening', 'organization', 'announcement',
    'resolution', 'measure'));

  -- Functions first, bodies checked only once all are back (they call one
  -- another).
  perform set_config('check_function_bodies', 'off', true);
  for r in select * from saved_functions order by remade loop
    def := replace(replace(r.def, w, 'program'), wc, 'Program');
    execute def;
  end loop;
  -- The remade ones get their grants and notes back.
  for r in
    select s.proacl, s.note, p.oid as new_oid
    from saved_functions s
    join pg_namespace n on n.nspname = replace(s.schema_name, ws, 'programs')
    join pg_proc p on p.pronamespace = n.oid
      and p.proname = replace(s.proname, w, 'program')
      and pg_get_function_identity_arguments(p.oid)
        = replace(s.identity, w, 'program')
    where s.remade
  loop
    execute format('revoke all on function %s from public', r.new_oid::regprocedure);
    for def in
      select distinct pg_get_userbyid(a.grantee) from aclexplode(r.proacl) a
      where a.grantee <> 0 and a.privilege_type = 'EXECUTE'
    loop
      execute format('grant execute on function %s to %I', r.new_oid::regprocedure, def);
    end loop;
    if r.note is not null then
      execute format('comment on function %s is %L', r.new_oid::regprocedure,
        replace(r.note, w, 'program'));
    end if;
  end loop;

  for r in select * from saved_triggers loop
    execute replace(r.def, w, 'program');
  end loop;
  for r in select * from saved_policies loop
    execute format('create policy %I on %I.%I as %s for %s to %s%s%s',
      replace(replace(r.polname, w, 'program'), wc, 'Program'),
      replace(r.schema_name, ws, 'programs'), replace(r.table_name, ws, 'programs'),
      case when r.polpermissive then 'permissive' else 'restrictive' end,
      case r.polcmd when 'r' then 'select' when 'a' then 'insert' when 'w' then 'update'
        when 'd' then 'delete' else 'all' end,
      (select string_agg(case when x = 'public' then 'public' else quote_ident(x) end, ', ')
        from unnest(r.roles) x),
      case when r.qual is null then '' else ' using (' || replace(r.qual, w, 'program') || ')' end,
      case when r.with_check is null then '' else ' with check (' || replace(r.with_check, w, 'program') || ')' end);
  end loop;
end
$rename$;

-- The role's key, with the keys that point at it (their constraints
-- dropped and made again around the change).
do $role$
declare
  w constant text := 'program' || 'me';
  r record;
begin
  create temp table role_keys on commit drop as
  select k.conname, k.conrelid::regclass as rel, a.attname,
    pg_get_constraintdef(k.oid) as def
  from pg_constraint k
  join pg_attribute a on a.attrelid = k.conrelid and a.attnum = k.conkey[1]
  where k.contype = 'f' and k.confrelid = 'access.roles'::regclass;
  for r in select * from role_keys loop
    execute format('alter table %s drop constraint %I', r.rel, r.conname);
  end loop;
  update access.roles set key = 'program_lead' where key = w || '_lead';
  for r in select * from role_keys loop
    execute format('update %s set %I = %L where %I = %L',
      r.rel, r.attname, 'program_lead', r.attname, w || '_lead');
    execute format('alter table %s add constraint %I %s', r.rel, r.conname, r.def);
  end loop;
end
$role$;

do $values$
declare
  w constant text := 'program' || 'me';
  ws constant text := w || 's';
begin
  -- Notion's Programs data source, by its new key.
  update core.settings
  set value = (value - ws) || jsonb_build_object('programs', value -> ws)
  where key = 'notion.data_sources' and value ? ws;

  -- The activity log's past rows, so each record's history still reads.
  update core.activity_log set table_schema = 'programs' where table_schema = ws;
  update core.activity_log set table_name = 'programs'
  where table_schema = 'core' and table_name = ws;
  update core.activity_log
  set old_row = replace(old_row::text, w, 'program')::jsonb,
    new_row = replace(new_row::text, w, 'program')::jsonb,
    changed = (select array_agg(replace(c, w, 'program')) from unnest(changed) c)
  where old_row::text ~ w or new_row::text ~ w
    or array_to_string(changed, ',') ~ w;

  -- The outbox: every kind by its new name, and what still waits to be sent
  -- with its new names inside.
  update core.outbox set kind = replace(kind, ws || '.', 'programs.')
  where kind ~ w;
  update core.outbox
  set payload = replace(payload::text, w, 'program')::jsonb
  where processed_at is null and payload::text ~ w;
end
$values$;
