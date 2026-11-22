-- An event's address is its title, with no date (the owner, Nov 22, 2026):
-- a date in the address goes stale when the event moves, as the screening
-- on Wed Nov 25 still read 2026-11-22. A title that repeats takes the next
-- number, as most sites number repeated slugs: writing-workshop,
-- writing-workshop-2, writing-workshop-3. Published addresses that change
-- here keep a 308 from their old address in MOVED
-- (apps/web/lib/next-config/moved.ts).

-- ── 1. One rule for every maker ─────────────────────────────────────────────
-- The Diwan, the Notion import, the repeat rules, the content calendar and
-- the meetings all insert events; this trigger gives each of them the same
-- address: a trailing date dropped, then the first free number. It runs
-- after address_stays (triggers fire by name), so a published address still
-- refuses a change from the site, and before event_slug_free, which it
-- satisfies.
create function private.event_address()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text;
  candidate text;
  n integer := 1;
begin
  if tg_op = 'UPDATE' and new.slug is not distinct from old.slug then
    return new;
  end if;
  base := regexp_replace(coalesce(new.slug, ''), '-\d{4}-\d{2}-\d{2}$', '');
  if base = '' then
    base := 'event';
  end if;
  candidate := base;
  while private.reserved_event_slug(candidate)
    or exists (select 1 from core.programs p where p.slug = candidate)
    or exists (
      select 1 from events.events e
      where e.slug = candidate and e.id is distinct from new.id
    )
  loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  new.slug := candidate;
  return new;
end;
$$;

comment on function private.event_address() is
  'An event''s address: its title with no date, numbered when it repeats (the owner, Nov 22, 2026).';

revoke all on function private.event_address() from public, anon, authenticated;

create trigger event_address before insert or update of slug on events.events
  for each row execute function private.event_address();

-- ── 2. A meeting's event is named by its title ──────────────────────────────
create or replace function private.minutes_follow_meeting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.event_id is null then
    if new.meeting_on is null then
      raise exception 'A meeting needs its event' using errcode = '23502';
    end if;
    insert into events.events (slug, title_en, title_ar, starts_at, classes)
    values (
      coalesce(
        nullif(btrim(regexp_replace(lower(new.title_en), '[^a-z0-9]+', '-', 'g'), '-'), ''),
        'meeting'
      ),
      new.title_en,
      coalesce(new.title_ar, new.title_en),
      (new.meeting_on + time '18:00') at time zone 'Asia/Baghdad',
      case when new.body = 'council' then array['member'] else array['member', 'associate', 'honorary'] end
    )
    returning id into new.event_id;
  end if;
  select (e.starts_at at time zone 'Asia/Baghdad')::date
  into new.meeting_on
  from events.events e
  where e.id = new.event_id;
  return new;
end;
$$;

-- ── 3. The addresses already made ───────────────────────────────────────────
-- Each loses its date (and a meeting's id after it), in date order, so the
-- earliest of a title keeps the plain address and the trigger numbers the
-- rest. All are set aside first, so no row waits on another's old address.
create temporary table event_bases as
select
  e.id,
  e.starts_at,
  regexp_replace(e.slug, '-\d{4}-\d{2}-\d{2}(-[0-9a-f]{8})?$', '') as base
from events.events e
where e.slug ~ '-\d{4}-\d{2}-\d{2}(-[0-9a-f]{8})?$';

update events.events e
set slug = 'renaming-' || e.id::text
from event_bases b
where b.id = e.id;

do $$
declare
  r record;
begin
  for r in select b.id, b.base from event_bases b order by b.starts_at, b.id loop
    update events.events set slug = r.base where id = r.id;
  end loop;
end;
$$;

drop table event_bases;

select private.build_api();
