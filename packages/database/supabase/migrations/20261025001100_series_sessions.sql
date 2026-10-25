-- Programs and events as one (owner, 2026-10-25): every program is a series
-- in What's on at /events/<program>, and its sessions come from a repeat
-- rule instead of being entered one by one.
--
-- 1. Programs are addressed by the names people see (the code keeps the
--    rest of its names): Next Stop, Open Stage, Munazara, Mutanabbi Friday.
-- 2. Programs and events share one set of addresses under /events, so a
--    slug belongs to one or the other (and never to /events/book, the
--    members' calendar).
-- 3. events.series_rules: weekday, time, place, way in, and how often; an
--    officer adds the sessions up to a date (the term's end) with
--    events.add_series_sessions, then edits or cancels single dates as
--    events. Dates that already have a session of the program are skipped,
--    so it can be run again after the rule changes.

-- ── 1. The names people see ─────────────────────────────────────────────────

update core.programmes set slug = 'next-stop' where slug = 'side-quest';
update core.programmes set slug = 'open-stage' where slug = 'scratch-night';
update core.programmes set slug = 'munazara' where slug = 'motion-night';
update core.programmes set slug = 'mutanabbi-friday' where slug = 'mutanabbi-walk';

-- ── 2. One set of addresses ─────────────────────────────────────────────────

-- Addresses under /events that are pages of their own.
create function private.reserved_event_slug(slug text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select slug in ('book');
$$;

-- An event that already took a program's address (or a reserved one) moves
-- aside; nothing has linked to the program there yet.
update events.events e
set slug = e.slug || '-event'
where private.reserved_event_slug(e.slug)
  or exists (select 1 from core.programmes p where p.slug = e.slug);

create function private.event_slug_free()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.reserved_event_slug(new.slug)
    or exists (select 1 from core.programmes p where p.slug = new.slug) then
    raise exception 'The address /events/% belongs to a program', new.slug
      using errcode = '23505';
  end if;
  return new;
end;
$$;

create trigger event_slug_free before insert or update of slug on events.events
  for each row execute function private.event_slug_free();

create function private.programme_slug_free()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.reserved_event_slug(new.slug)
    or exists (select 1 from events.events e where e.slug = new.slug) then
    raise exception 'The address /events/% belongs to an event', new.slug
      using errcode = '23505';
  end if;
  return new;
end;
$$;

create trigger programme_slug_free before insert or update of slug on core.programmes
  for each row execute function private.programme_slug_free();

revoke all on function private.event_slug_free(), private.programme_slug_free()
  from public, anon, authenticated;

-- ── 3. Repeat rules ─────────────────────────────────────────────────────────

create table events.series_rules (
  programme_id uuid primary key references core.programmes (id) on delete cascade,
  -- The first session; later ones fall every `every_weeks` weeks after it,
  -- on the same weekday, at the same Baghdad time.
  first_on date not null,
  start_time time not null,
  minutes integer not null default 120 check (minutes between 15 and 720),
  every_weeks smallint not null default 1 check (every_weeks between 1 and 8),
  venue_en text check (char_length(venue_en) <= 200),
  venue_ar text check (char_length(venue_ar) <= 200),
  entry text not null default 'open' check (entry in ('open', 'rsvp')),
  capacity integer check (capacity > 0),
  members_only boolean not null default false,
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table events.series_rules is
  'How a program repeats (What''s on). events.add_series_sessions turns it into dated events, which are then edited one by one.';

create index series_rules_updated_by_idx on events.series_rules (updated_by);

create trigger set_updated_at before update on events.series_rules
  for each row execute function private.set_updated_at();
create trigger log_activity after insert or update or delete on events.series_rules
  for each row execute function private.log_activity();

alter table events.series_rules enable row level security;

create policy "Event managers read repeat rules"
  on events.series_rules as permissive for select to authenticated
  using ((select access.has_permission('events.manage', 'programme', programme_id)));
create policy "Event managers write repeat rules"
  on events.series_rules as permissive for insert to authenticated
  with check ((select access.has_permission('events.manage', 'programme', programme_id)));
create policy "Event managers change repeat rules"
  on events.series_rules as permissive for update to authenticated
  using ((select access.has_permission('events.manage', 'programme', programme_id)))
  with check ((select access.has_permission('events.manage', 'programme', programme_id)));
create policy "Event managers remove repeat rules"
  on events.series_rules as permissive for delete to authenticated
  using ((select access.has_permission('events.manage', 'programme', programme_id)));
create policy "Third-party apps reach only their areas"
  on events.series_rules as restrictive for all to authenticated
  using ((select private.client_allows('events')))
  with check ((select private.client_allows('events')));

revoke all on events.series_rules from anon, authenticated;
grant select, insert, update, delete on events.series_rules to authenticated;
grant all on events.series_rules to service_role;

-- The sessions of a program from today (Baghdad) to `until`, as published
-- events named after the program. Returns how many were added.
create function private.add_series_sessions(programme uuid, until date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  rule events.series_rules;
  p core.programmes;
  today date := (now() at time zone 'Asia/Baghdad')::date;
  day date;
  starts timestamptz;
  added integer := 0;
  inserted integer;
begin
  if not access.has_permission('events.manage', 'programme', programme) then
    raise exception 'events.manage is required for this program'
      using errcode = '42501';
  end if;
  select * into rule from events.series_rules r where r.programme_id = programme;
  if rule.programme_id is null then
    raise exception 'This program has no repeat rule' using errcode = 'P0002';
  end if;
  if until > today + 366 then
    raise exception 'Add at most a year of sessions at a time'
      using errcode = '22023';
  end if;
  select * into p from core.programmes c where c.id = programme;

  day := rule.first_on;
  while day <= until loop
    if day >= today and not exists (
      select 1 from events.events e
      where e.programme_id = programme
        and (e.starts_at at time zone 'Asia/Baghdad')::date = day
    ) then
      starts := (day + rule.start_time) at time zone 'Asia/Baghdad';
      insert into events.events (
        slug, programme_id, title_en, title_ar, summary_en, summary_ar,
        venue_en, venue_ar, starts_at, ends_at, entry, capacity,
        members_only, status, published_at
      ) values (
        p.slug || '-' || to_char(day, 'YYYY-MM-DD'), programme,
        p.name_en, p.name_ar, p.summary_en, p.summary_ar,
        rule.venue_en, rule.venue_ar, starts,
        starts + make_interval(mins => rule.minutes), rule.entry,
        case when rule.entry = 'rsvp' then rule.capacity end,
        rule.members_only, 'published', now()
      )
      on conflict (slug) do nothing;
      get diagnostics inserted = row_count;
      added := added + inserted;
    end if;
    day := day + 7 * rule.every_weeks;
  end loop;
  return added;
end;
$$;

revoke all on function private.add_series_sessions(uuid, date) from public, anon;
grant execute on function private.add_series_sessions(uuid, date) to authenticated;

create function events.add_series_sessions(programme uuid, until date)
returns integer
language sql
security invoker
set search_path = ''
as $$ select private.add_series_sessions(programme, until) $$;

revoke all on function events.add_series_sessions(uuid, date) from public, anon;
grant execute on function events.add_series_sessions(uuid, date) to authenticated, service_role;
