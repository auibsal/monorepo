-- Events (decisions.md, Events), the third prompt's part 5:
--   1. Each event page states its access plainly: step-free or not, the
--      seating, and when food is served, its main allergens.
--   2. A released waitlist place is held for the next person for 12 hours
--      (or until two hours before the start), and they claim it; an
--      unclaimed hold passes on to the next.
--   3. A trip's emergency contacts (F-45) are deleted a week after the trip.

-- ── 1. Access ───────────────────────────────────────────────────────────────

alter table events.events
  add column step_free boolean,
  add column seating text check (seating in ('seated', 'standing', 'mixed')),
  add column allergens text[] not null default '{}' check (
    allergens <@ array[
      'gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soy', 'milk',
      'tree_nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin',
      'molluscs'
    ]::text[]
  );

comment on column events.events.step_free is
  'Whether the way in and the room are step-free; null until the lead says (decisions.md, Events: each page states its access).';
comment on column events.events.seating is
  'seated, standing or mixed; null until the lead says.';
comment on column events.events.allergens is
  'The main allergens in the food served (the fourteen named by law in most of Europe); empty when no food or none.';

-- ── 2. The 12-hour hold ─────────────────────────────────────────────────────

alter table events.waitlist drop constraint waitlist_status_check;
alter table events.waitlist add constraint waitlist_status_check
  check (status in ('waiting', 'offered', 'promoted', 'expired', 'left'));
alter table events.waitlist add column offered_until timestamptz;
alter table events.waitlist add constraint waitlist_offer_has_end
  check (status <> 'offered' or offered_until is not null);

comment on column events.waitlist.status is
  'waiting; offered (a released place held for them until offered_until); promoted (they claimed it); expired (the hold passed unclaimed); left.';
comment on column events.waitlist.offered_until is
  'The end of the hold: 12 hours after the offer, or two hours before the start if sooner (decisions.md, Events).';

-- One place in line per person, waiting or holding an offer.
drop index events.waitlist_one_waiting_idx;
create unique index waitlist_one_active_idx on events.waitlist (event_id, user_id)
  where status in ('waiting', 'offered');
create index waitlist_offers_idx on events.waitlist (offered_until)
  where status = 'offered';

-- Places taken: confirmed bookings and places held for someone, so a new
-- booking can't take a held place.
create or replace function private.confirmed_count(event_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
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
      and private.can_see_event(e.status, e.members_only, e.programme_id)
  ), 0);
$$;

-- A released place is offered to the next in line, held until the earlier
-- of 12 hours and two hours before the start; from two hours before, places
-- are filled at the door.
create or replace function private.promote_waitlist(event_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  e events.events;
  next_in_line events.waitlist;
  held_until timestamptz;
  offered integer := 0;
begin
  select * into e from events.events where id = promote_waitlist.event_id for update;
  if not found or e.starts_at - interval '2 hours' <= now() then
    return 0;
  end if;
  held_until := least(now() + interval '12 hours', e.starts_at - interval '2 hours');

  loop
    exit when e.capacity is not null and events.confirmed_count(e.id) >= e.capacity;

    select * into next_in_line from events.waitlist w
    where w.event_id = e.id and w.status = 'waiting'
    order by w.created_at
    limit 1
    for update skip locked;

    exit when not found;

    update events.waitlist
    set status = 'offered', offered_until = held_until
    where id = next_in_line.id;
    perform private.enqueue('events.waitlist_offered',
      jsonb_build_object('event_id', e.id, 'user_id', next_in_line.user_id,
        'until', held_until));
    offered := offered + 1;
  end loop;

  return offered;
end;
$$;

-- Booking: someone holding an offer claims it; otherwise as before.
create or replace function private.rsvp(event_id uuid, answers jsonb default '{}'::jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  e events.events;
  held events.waitlist;
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

-- Giving a place back, leaving the line or declining a held place: the
-- place goes to the next in line.
create or replace function private.cancel_rsvp(event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  freed boolean;
begin
  -- Declining a live hold frees a place.
  freed := exists (
    select 1 from events.waitlist w
    where w.event_id = cancel_rsvp.event_id and w.user_id = auth.uid()
      and w.status = 'offered' and w.offered_until > now()
  );
  update events.waitlist w set status = 'left'
  where w.event_id = cancel_rsvp.event_id and w.user_id = auth.uid()
    and w.status in ('waiting', 'offered');

  update events.rsvps r set status = 'canceled', cancelled_at = now()
  where r.event_id = cancel_rsvp.event_id and r.user_id = auth.uid() and r.status = 'confirmed';

  if found or freed then
    perform private.promote_waitlist(cancel_rsvp.event_id);
  end if;
end;
$$;

-- Holds that ran out pass to the next in line. Run with the release of
-- unclaimed places (every five minutes), and safe to run again.
create function private.expire_offers()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  ev uuid;
  expired integer := 0;
begin
  for ev in
    with gone as (
      update events.waitlist w set status = 'expired'
      where w.status = 'offered' and w.offered_until <= now()
      returning w.event_id
    )
    select distinct g.event_id from gone g
  loop
    expired := expired + 1;
    perform private.promote_waitlist(ev);
  end loop;
  return expired;
end;
$$;

revoke all on function private.expire_offers() from public, anon, authenticated;
grant execute on function private.expire_offers() to service_role;

select cron.alter_job(
  (select jobid from cron.job where jobname = 'sal-release-unclaimed'),
  command := $$ select private.release_unclaimed(); select private.expire_offers() $$
);

-- ── 3. A trip's emergency contacts ─────────────────────────────────────────

-- F-45's emergency contact and health notes go a week after the trip; the
-- signed consent itself stays (who signed, when, the acknowledgment).
create function private.purge_trip_contacts()
returns integer
language sql
security definer
set search_path = ''
as $$
  with gone as (
    update governance.form_submissions s
    set data = s.data - 'emergency_contact' - 'health'
    from events.events e
    where s.form_key = 'f45'
      and s.subject_id = e.id
      and coalesce(e.ends_at, e.starts_at) < now() - interval '7 days'
      and (s.data ? 'emergency_contact' or s.data ? 'health')
    returning 1
  )
  select count(*)::integer from gone;
$$;

revoke all on function private.purge_trip_contacts() from public, anon, authenticated;
grant execute on function private.purge_trip_contacts() to service_role;

create or replace function private.retention_schedule()
returns table (rule text, keeps text, runs text)
language sql
immutable
set search_path = ''
as $$
  values
    ('Unpublished Write for Qirtas submissions and their files', '12 months after the decision', null),
    ('Write for Qirtas drafts', '12 months after the last change', 'private.purge_stale_drafts'),
    ('Blind copies, assignments, scores and decisions of deleted submissions', '12 months', 'private.purge_blind_entries'),
    ('Invitation lists', '30 days after the list is sent', 'private.purge_tour_lists'),
    ('Unclaimed spring 2026 Tour pages', 'until the spring 2027 Tour (tour.unclaimed_until)', 'private.purge_unclaimed_tour_pages'),
    ('Associate membership requests', '1 year after the decision', 'private.purge_associate_requests'),
    ('Qalam consent forms (F-38, F-39) and the roster with attendance', '3 years after the program year', 'private.purge_qalam_records'),
    ('Incident records (F-16)', '7 years', 'private.purge_incident_records'),
    ('Ballots, ballot receipts and voter lists', '1 year after the vote closes', 'private.purge_expired_ballots'),
    ('Who voted for the Prize', '1 year after the vote closes', 'private.purge_prize_vote_receipts'),
    ('Get involved replies', '12 months after the last change', 'private.purge_opening_replies'),
    ('Removal requests', '2 years after closing', 'private.purge_removal_requests'),
    ('Unconfirmed Sunday Paper sign-ups', 'until the confirmation window closes', 'private.purge_unconfirmed_subscribers'),
    ('Unconfirmed personal email requests', '7 days', 'private.purge_personal_email_requests'),
    ('Push subscriptions and calendar feed addresses', '12 months without a sign-in', 'private.purge_idle_devices'),
    ('Guest accounts', '2 years without a sign-in, holding no role', null),
    ('Accounts their owners deleted', '30 days after the request, unless they sign in again', null),
    ('The activity log', '12 months', 'private.purge_activity_log'),
    ('Sent emails in the outbox', '30 days after sending', 'private.prune_outbox'),
    ('Problem reports', '1 year', 'private.purge_problem_reports'),
    ('Trip emergency contacts and health notes (F-45)', '7 days after the trip', 'private.purge_trip_contacts');
$$;
