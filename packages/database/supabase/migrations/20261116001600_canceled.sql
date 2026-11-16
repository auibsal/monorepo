-- American spelling, the last of it (AGENTS.md, Language and copy; the
-- owner, Nov 17, 2026): the RSVP's cancellation time is canceled_at (its
-- British form built below as `w`, so no line here spells it). Every
-- status value was already "canceled". The function bodies that name the
-- column are made again; the activity log's past rows follow, so a
-- record's history still reads.

do $canceled$
declare
  w constant text := 'cancel' || 'led';
  r record;
begin
  create temp table saved_functions on commit drop as
  select pg_get_functiondef(p.oid) as def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname not in ('pg_catalog', 'information_schema', 'api')
    and p.prokind = 'f'
    and p.prosrc ~ w;

  execute format('alter table events.rsvps rename column %I to canceled_at', w || '_at');

  perform set_config('check_function_bodies', 'off', true);
  for r in select * from saved_functions loop
    execute replace(r.def, w, 'canceled');
  end loop;

  update core.activity_log
  set old_row = replace(old_row::text, w, 'canceled')::jsonb,
    new_row = replace(new_row::text, w, 'canceled')::jsonb,
    changed = (select array_agg(replace(c, w, 'canceled')) from unnest(changed) c)
  where old_row::text ~ w or new_row::text ~ w
    or array_to_string(changed, ',') ~ w;
end
$canceled$;

select private.build_api();
