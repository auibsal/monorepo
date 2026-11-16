-- Event access: two settings on every event (decisions.md, Events: Access).
--
-- Who can come: any of the four classes (Members, Associate Members,
-- Honorary Members, Guests; all four is "Everyone"), or Invited only.
-- How: Open (walk in, no booking) or Booking required (RSVP, capacity and
-- a waitlist). `entry` keeps How and Invited only ('open', 'rsvp' or
-- 'invite'); `classes` holds the classes ticked. The "Members" entry and
-- the members-only flag derived from it are gone: an event's page is seen
-- by all, and anyone whose class isn't ticked sees whom it is for.
--
-- On campus, Guests always book, even for an Open event, and their
-- booking closes 14 days before the event, when their names go to
-- Security through Student Life. A Member's check-in at any event already
-- counts toward the two-event voting rule (private.check_in records it).

alter table events.events add column classes text[] not null
  default array['member', 'associate', 'honorary', 'guest'];
alter table events.events add constraint events_classes_check check (
  cardinality(classes) between 1 and 4
  and classes <@ array['member', 'associate', 'honorary', 'guest']
);
comment on column events.events.classes is
  'Who can come (decisions.md, Events: Access): the classes ticked; all four is Everyone. Not read for Invited only (entry = invite).';

-- Members → Members only, with the event's existing How (a members event
-- always took bookings).
update events.events set classes = array['member'], entry = 'rsvp' where entry = 'members';

-- "Ask for an accommodation" detail, after the access row: what step-free
-- and seated leave out ("Every seat is up steps; none at ground level.").
alter table events.events
  add column access_detail_en text check (char_length(access_detail_en) <= 200),
  add column access_detail_ar text check (char_length(access_detail_ar) <= 200);

-- ── Everything that read the flag reads the access ──────────────────────────

drop policy "Anyone reads published public events" on events.events;
drop policy "Signed-in users read the events they may see" on events.events;
drop function events.calendar(timestamptz, timestamptz);
drop function private.calendar(timestamptz, timestamptz);

-- Seeing an event: published (or canceled) for everyone, any state for
-- whoever manages it. Invited only stays with the invited (the restrictive
-- policy and private.can_see_event_id).
create function private.can_see_event(status text, programme_id uuid)
returns boolean
language sql
stable security definer
set search_path to ''
as $$
  select status in ('published', 'canceled')
    or access.has_permission('events.manage', 'programme', programme_id);
$$;
grant execute on function private.can_see_event(text, uuid) to anon, authenticated;

create or replace function private.can_see_event_id(event_id uuid)
returns boolean
language sql
stable security definer
set search_path to ''
as $$
  select exists (
    select 1 from events.events e
    where e.id = can_see_event_id.event_id
      and private.can_see_event(e.status, e.programme_id)
      and (e.entry <> 'invite' or private.invited(e.id, e.programme_id))
  );
$$;

create or replace function private.confirmed_count(event_id uuid)
returns integer
language sql
stable security definer
set search_path to ''
as $$
  select coalesce((
    select (
      select count(*)::integer
      from events.rsvps r
      where r.event_id = e.id and r.status = 'confirmed'
    ) + (
      select count(*)::integer
      from events.waitlist w
      where w.event_id = e.id
        and w.status = 'offered' and w.offered_until > now()
    )
    from events.events e
    where e.id = confirmed_count.event_id
      and private.can_see_event(e.status, e.programme_id)
  ), 0);
$$;

create policy "Anyone reads published events" on events.events
  for select to anon
  using (status in ('published', 'canceled'));
create policy "Signed-in users read the events they may see" on events.events
  for select to authenticated
  using (
    (select private.can_see_event(status, programme_id))
    or (select private.has_permission('events.manage', 'event', id))
  );

drop function private.can_see_event(text, boolean, uuid);

-- The calendar: every event the caller may see, Invited only for the
-- invited. Nothing is a teaser any more.
create function private.calendar(from_at timestamptz, to_at timestamptz)
returns table (
  id uuid, slug text, programme_id uuid, title_en text, title_ar text,
  summary_en text, summary_ar text, venue_en text, venue_ar text,
  starts_at timestamptz, ends_at timestamptz, classes text[], entry text,
  capacity integer, status text, image_path text
)
language sql
stable security definer
set search_path to ''
as $$
  select e.id, e.slug, e.programme_id, e.title_en, e.title_ar,
    e.summary_en, e.summary_ar, e.venue_en, e.venue_ar,
    e.starts_at, e.ends_at, e.classes, e.entry, e.capacity, e.status, e.image_path
  from events.events e
  where e.status in ('published', 'canceled')
    and e.starts_at >= calendar.from_at
    and e.starts_at < calendar.to_at
    and private.can_see_event(e.status, e.programme_id)
    and (e.entry <> 'invite' or private.invited(e.id, e.programme_id))
  order by e.starts_at
  limit 500;
$$;

create function events.calendar(from_at timestamptz, to_at timestamptz)
returns table (
  id uuid, slug text, programme_id uuid, title_en text, title_ar text,
  summary_en text, summary_ar text, venue_en text, venue_ar text,
  starts_at timestamptz, ends_at timestamptz, classes text[], entry text,
  capacity integer, status text, image_path text
)
language sql
stable
set search_path to ''
as $$ select * from private.calendar($1, $2) $$;
grant execute on function private.calendar(timestamptz, timestamptz) to anon, authenticated;
grant execute on function events.calendar(timestamptz, timestamptz) to anon, authenticated;

create or replace function private.event_organizations(event_slug text)
returns table (
  line text, name_en text, name_ar text, slug text, url text, logo_path text,
  logo_static text, logo_width numeric, logo_shows_name boolean
)
language sql
stable security definer
set search_path to ''
as $$
  select o.line, p.name_en, p.name_ar, p.slug, p.url, p.logo_path,
    p.logo_static, p.logo_width, p.logo_shows_name
  from events.events e
  join events.event_organizations o on o.event_id = e.id
  join governance.partners p on p.id = o.partner_id
  where e.slug = event_slug
    and e.status in ('published', 'canceled')
    and e.entry <> 'invite'
    and p.status = 'active'
    and p.is_listed
  order by o.line, p.name_en;
$$;

create or replace function private.open_places()
returns table (
  id uuid, kind text, owner text, role text, title_en text, title_ar text,
  body_en text, body_ar text, eligibility_en text, eligibility_ar text,
  closes_at timestamptz, places integer, event_slug text, created_at timestamptz
)
language sql
stable security definer
set search_path to ''
as $$
  select * from (
    select o.id, o.kind, o.owner, o.role, o.title_en, o.title_ar, o.body_en, o.body_ar,
      o.eligibility_en, o.eligibility_ar, o.closes_at, o.places, e.slug, o.created_at
    from programmes.openings o
    left join events.events e on e.id = o.event_id
    where o.is_open and (o.closes_at is null or o.closes_at > now())
      and (o.event_id is null or (e.status = 'published' and e.entry <> 'invite'))
    union all
    select a.id, 'audition', 'program', null, pr.title_en, pr.title_ar,
      a.prepare_en, a.prepare_ar, null, null, a.starts_at, a.capacity, null, a.created_at
    from programmes.auditions a
    join programmes.productions pr on pr.id = a.production_id
    where pr.is_public and pr.stage = 'auditions' and a.starts_at > now()
  ) places
  order by places.closes_at nulls last, places.created_at desc;
$$;

create or replace function private.public_production_events(production_id uuid)
returns table (
  slug text, title_en text, title_ar text, starts_at timestamptz,
  venue_en text, venue_ar text
)
language sql
stable security definer
set search_path to ''
as $$
  select e.slug, e.title_en, e.title_ar, e.starts_at, e.venue_en, e.venue_ar
  from programmes.production_events pe
  join programmes.productions p on p.id = pe.production_id
  join events.events e on e.id = pe.event_id
  where pe.production_id = public_production_events.production_id
    and p.is_public and p.rights_status = 'cleared'
    and e.status = 'published' and e.entry <> 'invite'
  order by e.starts_at;
$$;

create or replace function private.society_numbers()
returns table (members integer, events integer, pieces integer, editions integer)
language sql
stable security definer
set search_path to ''
as $$
  select
    (select count(*)::integer from membership.memberships),
    (select count(*)::integer from events.events e
      where e.status = 'published' and e.entry <> 'invite' and e.starts_at <= now()),
    (select count(*)::integer from journal.pieces p
      where p.status = 'published' and p.published_at <= now()),
    (select count(*)::integer from journal.issues i where i.status = 'published');
$$;

create or replace function private.search(query text, max_results integer default 30)
returns table (
  kind text, id uuid, slug text, title_en text, title_ar text, snippet text,
  occurred_at timestamptz, rank real
)
language sql
stable security definer
set search_path to ''
as $$
  with q as (
    select websearch_to_tsquery('simple'::regconfig, left(coalesce(query, ''), 200)) as tsq
  )
  select * from (
    select 'event'::text, e.id, e.slug, e.title_en, e.title_ar,
      coalesce(e.summary_en, e.summary_ar), e.starts_at, ts_rank(e.search, q.tsq)
    from events.events e, q
    where e.search @@ q.tsq and e.status = 'published' and e.entry <> 'invite'
    union all
    select 'piece', p.id, p.slug, p.title_en, p.title_ar,
      null, p.published_at, ts_rank(p.search, q.tsq)
    from journal.pieces p, q
    where p.search @@ q.tsq and p.status = 'published' and p.published_at <= now()
    union all
    select 'production', p.id, p.slug, p.title_en, p.title_ar,
      coalesce(p.summary_en, p.summary_ar), p.created_at,
      ts_rank(to_tsvector('simple'::regconfig, concat_ws(' ', p.title_en, p.title_ar,
        p.summary_en, p.summary_ar, p.playwright)), q.tsq)
    from programmes.productions p, q
    where p.is_public and p.stage not in ('proposal', 'canceled')
      and to_tsvector('simple'::regconfig, concat_ws(' ', p.title_en, p.title_ar,
        p.summary_en, p.summary_ar, p.playwright)) @@ q.tsq
  ) results (kind, id, slug, title_en, title_ar, snippet, occurred_at, rank)
  where char_length(btrim(coalesce(query, ''))) >= 2
  order by rank desc, occurred_at desc nulls last
  limit least(greatest(max_results, 1), 50);
$$;

create or replace function core.telegram_events(
  telegram_id bigint, event_id uuid default null, max_rows integer default 6
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  uid uuid := private.telegram_become(telegram_id);
begin
  return coalesce((
    select jsonb_agg(row_to_json(x) order by x.starts_at)
    from (
      select e.id, e.slug, e.title_en, e.title_ar, e.summary_en, e.summary_ar,
        e.venue_en, e.venue_ar, e.starts_at, e.ends_at, e.classes,
        e.capacity, e.rsvp_enabled,
        events.confirmed_count(e.id) as confirmed,
        case
          when uid is null then null
          when exists (select 1 from events.rsvps r where r.event_id = e.id
            and r.user_id = uid and r.status = 'confirmed') then 'confirmed'
          when exists (select 1 from events.waitlist w where w.event_id = e.id
            and w.user_id = uid and w.status = 'waiting') then 'waitlisted'
        end as mine
      from events.events e
      where e.status = 'published'
        and coalesce(e.ends_at, e.starts_at) > now()
        and (telegram_events.event_id is null or e.id = telegram_events.event_id)
        and private.can_see_event_id(e.id)
      order by e.starts_at
      limit least(greatest(max_rows, 1), 20)
    ) x
  ), '[]'::jsonb);
end;
$$;

drop index events.events_public_idx;
alter table events.events drop column members_only;
create index events_public_idx on events.events (status, starts_at);

alter table events.events drop constraint events_entry_check;
alter table events.events add constraint events_entry_check
  check (entry in ('open', 'rsvp', 'invite'));

-- ── Who books ───────────────────────────────────────────────────────────────

-- The class a person comes as: their membership's tier, or 'guest'.
create function private.event_class(uid uuid)
returns text
language sql
stable security definer
set search_path to ''
as $$
  select case
    when private.is_member(uid) then
      (select m.tier::text from membership.memberships m where m.user_id = uid)
    when private.is_guest(uid) then 'guest'
  end;
$$;
revoke all on function private.event_class(uuid) from public, anon, authenticated;

-- When a Guest's booking closes for an event on campus: 14 days before.
create function private.guests_book_by(e events.events)
returns timestamptz
language sql
immutable
set search_path to ''
as $$
  select case when not coalesce(e.off_campus, false) then e.starts_at - interval '14 days' end;
$$;

-- What the event's page needs for the person reading it: their class,
-- whether they may come, whether they book, and the Guests' last day.
create function private.booking_terms(event_id uuid)
returns jsonb
language sql
stable security definer
set search_path to ''
as $$
  select jsonb_build_object(
    'class', c.cls,
    'eligible', e.entry = 'invite' or c.cls = any (e.classes),
    'books', e.entry <> 'open' or (c.cls = 'guest' and not e.off_campus),
    'guests_by', private.guests_book_by(e),
    'guests_closed', c.cls = 'guest' and private.guests_book_by(e) <= now()
  )
  from events.events e
  cross join lateral (select private.event_class((select auth.uid())) as cls) c
  where e.id = booking_terms.event_id
    and private.can_see_event_id(e.id);
$$;

create function events.booking_terms(event_id uuid)
returns jsonb
language sql
stable
set search_path to ''
as $$ select private.booking_terms($1) $$;
revoke all on function events.booking_terms(uuid) from public, anon;
grant execute on function events.booking_terms(uuid) to authenticated;
revoke all on function private.booking_terms(uuid) from public, anon;
grant execute on function private.booking_terms(uuid) to authenticated;

create or replace function private.rsvp(event_id uuid, answers jsonb default '{}'::jsonb)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare
  e events.events;
  held events.waitlist;
  cls text := private.event_class((select auth.uid()));
begin
  if cls is null then
    raise exception 'Only members and guests can book' using errcode = '42501';
  end if;

  -- Lock the event so concurrent RSVPs can't overfill it.
  select * into e from events.events where id = rsvp.event_id for update;

  if not found or e.status <> 'published' or not private.can_see_event_id(e.id) then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;
  -- Who can come: the classes ticked, or the invited (checked above).
  if e.entry <> 'invite' and not cls = any (e.classes) then
    raise exception 'not_for_your_class' using errcode = '42501';
  end if;
  -- How: an Open event takes no booking, except from a Guest on campus.
  if e.entry = 'open' and not (cls = 'guest' and not e.off_campus) then
    raise exception 'This event does not take RSVPs' using errcode = '22023';
  end if;
  if coalesce(e.ends_at, e.starts_at) < now() then
    raise exception 'This event has ended' using errcode = '22023';
  end if;
  -- On campus, a Guest's booking closes 14 days before: the names go to
  -- Security through Student Life.
  if cls = 'guest' and private.guests_book_by(e) <= now() then
    raise exception 'guests_book_by' using errcode = '22023';
  end if;
  if e.off_campus and not exists (
    select 1 from governance.form_submissions s
    where s.form_key = 'trip-consent' and s.subject_id = e.id
      and s.submitted_by = auth.uid() and s.signed_at is not null
      and s.withdrawn_at is null
  ) then
    raise exception 'trip_consent_required' using errcode = '23514';
  end if;

  -- A place held for them: claiming it books it.
  select * into held from events.waitlist w
  where w.event_id = e.id and w.user_id = auth.uid()
    and w.status = 'offered' and w.offered_until > now()
  for update;
  if found then
    update events.waitlist set status = 'promoted' where id = held.id;
    insert into events.rsvps (event_id, user_id, answers, from_waitlist)
    values (e.id, auth.uid(), held.answers, true);
    perform private.enqueue('events.rsvp_confirmed',
      jsonb_build_object('event_id', e.id, 'user_id', auth.uid()));
    return 'confirmed';
  end if;

  if exists (
    select 1 from events.rsvps r
    where r.event_id = e.id and r.user_id = auth.uid() and r.status = 'confirmed'
  ) or exists (
    select 1 from events.waitlist w
    where w.event_id = e.id and w.user_id = auth.uid() and w.status = 'waiting'
  ) then
    return 'already';
  end if;

  if e.capacity is null or events.confirmed_count(e.id) < e.capacity then
    insert into events.rsvps (event_id, user_id, answers)
    values (e.id, auth.uid(), coalesce(rsvp.answers, '{}'));
    perform private.enqueue('events.rsvp_confirmed',
      jsonb_build_object('event_id', e.id, 'user_id', auth.uid()));
    return 'confirmed';
  end if;

  if e.starts_at - interval '2 hours' <= now() then
    raise exception 'full_at_the_door' using errcode = '22023';
  end if;

  -- An earlier, lapsed hold doesn't stop them joining the line again.
  insert into events.waitlist (event_id, user_id, answers)
  values (e.id, auth.uid(), coalesce(rsvp.answers, '{}'));
  return 'waitlisted';
end;
$$;

-- The screening on Sun Nov 22 (decisions.md, Events): Everyone, Booking
-- required, with its access detail. Under 14 days away, so Guests can no
-- longer book it.
update events.events
set classes = array['member', 'associate', 'honorary', 'guest'],
  entry = 'rsvp',
  access_detail_en = 'Every seat is up steps; none at ground level.',
  access_detail_ar = 'كل المقاعد فوق الدرج، ولا مقاعد في المستوى الأرضي.'
where slug = 'iraqi-short-films-screening-2026-11-22';
