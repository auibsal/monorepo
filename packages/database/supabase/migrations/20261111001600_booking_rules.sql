-- Booking (decisions.md, Events): RSVPs ask only about accessibility needs,
-- and diet when food is served. A released place goes to the next on the
-- waitlist by email until two hours before the start; after that, places
-- are filled at the door. Unclaimed places are released 10 minutes before
-- the start.

-- ── The two questions ───────────────────────────────────────────────────────

alter table events.events add column serves_food boolean not null default false;

comment on column events.events.serves_food is
  'Food is served: the booking also asks about diet (decisions.md, Events).';

-- The questions are the site's, never typed: accessibility needs always,
-- diet when food is served.
create function private.standard_questions(serves_food boolean)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_array(jsonb_build_object(
      'id', 'access', 'required', false,
      'label_en', 'Accessibility needs (optional)',
      'label_ar', 'احتياجات إمكانية الوصول (اختياري)'))
    || case when serves_food then jsonb_build_array(jsonb_build_object(
      'id', 'diet', 'required', false,
      'label_en', 'Dietary needs (optional)',
      'label_ar', 'احتياجات غذائية (اختياري)'))
    else '[]'::jsonb end;
$$;

create function private.event_questions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.questions := private.standard_questions(new.serves_food);
  return new;
end;
$$;

revoke all on function private.event_questions() from public, anon, authenticated;

create trigger event_questions before insert or update of questions, serves_food
  on events.events
  for each row execute function private.event_questions();

update events.events set questions = private.standard_questions(serves_food);

-- A booking keeps only those answers.
create or replace function private.booking_answers(event_id uuid, answers jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'access', nullif(left(btrim(coalesce(answers ->> 'access', '')), 500), ''),
    'diet', case when e.serves_food
      then nullif(left(btrim(coalesce(answers ->> 'diet', '')), 500), '') end))
  from events.events e
  where e.id = booking_answers.event_id;
$$;

revoke all on function private.booking_answers(uuid, jsonb) from public, anon;
grant execute on function private.booking_answers(uuid, jsonb) to authenticated, service_role;

create function private.keep_booking_answers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.answers := coalesce(private.booking_answers(new.event_id, new.answers), '{}'::jsonb);
  return new;
end;
$$;

revoke all on function private.keep_booking_answers() from public, anon, authenticated;

create trigger keep_booking_answers before insert or update of answers
  on events.rsvps
  for each row execute function private.keep_booking_answers();
create trigger keep_booking_answers before insert or update of answers
  on events.waitlist
  for each row execute function private.keep_booking_answers();

-- ── The waitlist moves by email until two hours before ─────────────────────

create or replace function private.promote_waitlist(event_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  e events.events;
  next_in_line events.waitlist;
  promoted integer := 0;
begin
  select * into e from events.events where id = promote_waitlist.event_id for update;
  -- From two hours before the start, places are filled at the door.
  if not found or e.starts_at - interval '2 hours' <= now() then
    return 0;
  end if;

  loop
    exit when e.capacity is not null and events.confirmed_count(e.id) >= e.capacity;

    select * into next_in_line from events.waitlist w
    where w.event_id = e.id and w.status = 'waiting'
    order by w.created_at
    limit 1
    for update skip locked;

    exit when not found;

    update events.waitlist set status = 'promoted' where id = next_in_line.id;
    insert into events.rsvps (event_id, user_id, answers, from_waitlist)
    values (e.id, next_in_line.user_id, next_in_line.answers, true);
    perform private.enqueue('events.waitlist_promoted',
      jsonb_build_object('event_id', e.id, 'user_id', next_in_line.user_id));
    promoted := promoted + 1;
  end loop;

  return promoted;
end;
$$;

-- ── Unclaimed places are released 10 minutes before ────────────────────────

alter table events.rsvps drop constraint rsvps_status_check;
alter table events.rsvps add constraint rsvps_status_check
  check (status in ('confirmed', 'canceled', 'released'));

comment on column events.rsvps.status is
  'confirmed, canceled by the member, or released: not checked in 10 minutes before the start, the place given at the door (decisions.md, Events).';

-- Every booked place at a capped event not claimed (checked in) by 10
-- minutes before the start is released for the door. Run by the publish
-- job every 10 minutes, and safe to run again.
create function private.release_unclaimed()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  released integer;
begin
  with gone as (
    update events.rsvps r
    set status = 'released'
    from events.events e
    where e.id = r.event_id
      and r.status = 'confirmed'
      and e.capacity is not null
      and e.starts_at - interval '10 minutes' <= now()
      and coalesce(e.ends_at, e.starts_at + interval '3 hours') > now()
      and not exists (
        select 1 from events.check_ins c
        where c.event_id = r.event_id and c.user_id = r.user_id
      )
    returning r.id
  )
  select count(*) into released from gone;
  return released;
end;
$$;

revoke all on function private.release_unclaimed() from public, anon, authenticated;
grant execute on function private.release_unclaimed() to service_role;

select cron.schedule('sal-release-unclaimed', '*/5 * * * *', $$ select private.release_unclaimed() $$);

-- From two hours before, a full event takes no more names on the waitlist:
-- places are filled at the door.
create or replace function private.rsvp(event_id uuid, answers jsonb default '{}'::jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  e events.events;
begin
  if not (membership.is_member() or private.is_guest((select auth.uid()))) then
    raise exception 'Only members and guests can book' using errcode = '42501';
  end if;

  -- Lock the event so concurrent RSVPs can't overfill it.
  select * into e from events.events where id = rsvp.event_id for update;

  if not found or e.status <> 'published' or not private.can_see_event_id(e.id) then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;
  if e.entry = 'open' then
    raise exception 'This event does not take RSVPs' using errcode = '22023';
  end if;
  if coalesce(e.ends_at, e.starts_at) < now() then
    raise exception 'This event has ended' using errcode = '22023';
  end if;
  if e.off_campus and not exists (
    select 1 from governance.form_submissions s
    where s.form_key = 'f45' and s.subject_id = e.id
      and s.submitted_by = auth.uid() and s.signed_at is not null
  ) then
    raise exception 'trip_consent_required' using errcode = '23514';
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

  insert into events.waitlist (event_id, user_id, answers)
  values (e.id, auth.uid(), coalesce(rsvp.answers, '{}'));
  return 'waitlisted';
end;
$$;
