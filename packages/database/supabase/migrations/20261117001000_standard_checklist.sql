-- The accessible-event (ADA) and green-event checklists on every event
-- (decisions.md, Frameworks followed; Sustainability): added when the event
-- is made, whether or not it starts from a preset or comes from Notion, and
-- to every event already there. A preset adds its own items before them.

create function private.add_standard_checklist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  n integer := 1000;
begin
  for item in select * from jsonb_array_elements(private.standard_checklist()) loop
    n := n + 1;
    insert into events.checklist_items (event_id, phase, source, label_en, label_ar, sort)
    values (new.id, item->>'phase', item->>'source', item->>'en', item->>'ar', n);
  end loop;
  return new;
end;
$$;
revoke all on function private.add_standard_checklist() from public, anon, authenticated;

create trigger add_standard_checklist after insert on events.events
  for each row execute function private.add_standard_checklist();

create or replace function private.apply_event_preset(event uuid, preset text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p jsonb;
  e events.events;
  item jsonb;
  n integer := 0;
begin
  select * into e from events.events where id = event;
  if not found or not private.leads_event('events.manage', e.id, e.program_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select fields into p from core.presets where kind = 'event' and key = preset;
  if p is null then
    raise exception 'no_preset' using errcode = 'P0002';
  end if;
  update events.events set
    ends_at = coalesce(ends_at, starts_at + make_interval(mins => (p->>'duration_minutes')::integer)),
    entry = coalesce(p->>'entry', entry),
    classes = coalesce(
      (select array_agg(c) from jsonb_array_elements_text(p->'classes') c), classes),
    seating = coalesce(seating, p->>'seating'),
    format = coalesce(format, p->>'format'),
    run_of_show = case when run_of_show = '[]'::jsonb then coalesce(p->'run_of_show', '[]'::jsonb) else run_of_show end,
    promo_layout = coalesce(promo_layout, p->>'promo_layout'),
    preset_key = preset
  where id = event;
  select * into e from events.events where id = event;
  for item in select * from jsonb_array_elements(coalesce(p->'shifts', '[]'::jsonb)) loop
    insert into programs.shifts (event_id, role_en, role_ar, starts_at, ends_at, capacity)
    values (event, item->>'en', item->>'ar',
      e.starts_at - interval '30 minutes', coalesce(e.ends_at, e.starts_at + interval '90 minutes'),
      coalesce((item->>'capacity')::integer, 1));
  end loop;
  for item in select * from jsonb_array_elements(coalesce(p->'checklist', '[]'::jsonb)) loop
    n := n + 1;
    insert into events.checklist_items (event_id, phase, source, label_en, label_ar, sort)
    values (event, item->>'phase', coalesce(item->>'source', 'manual'), item->>'en', item->>'ar', n);
  end loop;
  -- Every event's checklist carries the accessible-event and green-event
  -- checklists, whatever its preset (decisions.md, Frameworks followed).
  -- The standard items came with the event (private.add_standard_checklist);
  -- they follow the preset's own.
  update events.checklist_items c set sort = c.sort + n
  where c.event_id = event and c.source in ('access', 'green');
end;
$$;

-- Every event already made gets the items it lacks.
insert into events.checklist_items (event_id, phase, source, label_en, label_ar, sort)
select e.id, i->>'phase', i->>'source', i->>'en', i->>'ar', 1000 + o
from events.events e
cross join lateral jsonb_array_elements(private.standard_checklist()) with ordinality as x(i, o)
where not exists (
  select 1 from events.checklist_items c
  where c.event_id = e.id and c.source = i->>'source' and c.label_en = i->>'en'
);

select private.build_api();
