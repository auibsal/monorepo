-- Undo what is still the person's (decisions.md, Documents and forms): a
-- consent or release they signed is withdrawn for the future. The signed
-- record stays (what was agreed, and when), marked withdrawn; nothing made
-- under it before is undone. A trip's consent withdrawn gives the place
-- back, and booking the trip again asks for a new one.

alter table governance.form_submissions add column withdrawn_at timestamptz;

comment on column governance.form_submissions.withdrawn_at is
  'When the signer withdrew this consent or release for the future (media release, trip consent).';

create function private.withdraw_consent(submission_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  s governance.form_submissions;
begin
  select * into s from governance.form_submissions f
  where f.id = withdraw_consent.submission_id
  for update;
  if not found or s.submitted_by is distinct from auth.uid() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if s.form_key not in ('f15', 'f45') or s.signed_at is null then
    raise exception 'not_a_consent' using errcode = '22023';
  end if;
  if s.withdrawn_at is not null then
    return s.withdrawn_at;
  end if;
  update governance.form_submissions set withdrawn_at = now() where id = s.id;
  -- Without the trip's consent there is no place on the trip.
  if s.form_key = 'f45' and s.subject_id is not null then
    perform private.cancel_rsvp(s.subject_id);
  end if;
  return now();
end;
$$;

revoke all on function private.withdraw_consent(uuid) from public, anon;
grant execute on function private.withdraw_consent(uuid) to authenticated, service_role;

create function governance.withdraw_consent(submission_id uuid)
returns timestamptz
language sql
set search_path = ''
as $$ select private.withdraw_consent(submission_id) $$;

revoke all on function governance.withdraw_consent(uuid) from public, anon;
grant execute on function governance.withdraw_consent(uuid) to authenticated, service_role;

-- Booking a trip needs a consent still in force.
create or replace function private.rsvp(event_id uuid, answers jsonb DEFAULT '{}'::jsonb)
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
