-- One kind of event, with add-ons (owner, Nov 5, 2026, evening): "Don't
-- keep event-specific things. All events have standard pages, we change
-- the details. People either RSVP or it's just an event for anyone to come
-- or it's a private event. All events will be made through this
-- dashboard, including council meetings, the AGM, Launch Night and every
-- other sort of event."
--
-- An event's details are the same for every event; what used to belong to
-- one named event becomes an add-on any event may take on its page in the
-- Diwan: needs, shifts, a partner's checklist, links, prompts, a book
-- vote, Second Chapter's collection (charity.campaigns.event_id), the
-- minutes and resolutions of a meeting (governance.minutes.event_id) and
-- Student Life's approval for an event off campus.

-- 1. Off campus, in place of the occasions: any event away from campus is
-- shown only once Student Life's written approval is recorded (the
-- General Secretary records it). The trip and the contest are ordinary
-- events.
alter table events.events
  add column off_campus boolean not null default false;

update events.events set off_campus = true where occasion = 'book_street_trip';

grant insert (off_campus), update (off_campus) on events.events to authenticated;

comment on column events.events.off_campus is
  'Away from campus: published only once Student Life''s written approval is recorded (student_life_approved_on, by governance.manage).';
comment on column events.events.student_life_approved_on is
  'When Student Life approved an off-campus event in writing; recorded by governance.manage (events.record_approval). Published only with it.';

create or replace function private.trip_needs_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only the record_approval function writes the approval.
  if new.student_life_approved_on is distinct from
      (case when tg_op = 'UPDATE' then old.student_life_approved_on end)
    and coalesce(current_setting('sal.recording_approval', true), '') <> 'on'
  then
    raise exception 'approval_by_general_secretary' using errcode = '42501';
  end if;
  -- An event stays off campus unless the General Secretary changes it.
  if tg_op = 'UPDATE'
    and old.off_campus
    and not new.off_campus
    and auth.uid() is not null
    and not access.has_permission('governance.manage', 'global', null)
  then
    raise exception 'approval_by_general_secretary' using errcode = '42501';
  end if;
  if new.off_campus
    and new.status = 'published'
    and new.student_life_approved_on is null
  then
    raise exception 'trip_needs_approval' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.record_approval(event_id uuid, approved_on date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  e events.events;
begin
  if not access.has_permission('governance.manage', 'global', null) then
    raise exception 'approval_by_general_secretary' using errcode = '42501';
  end if;
  select * into e from events.events where id = record_approval.event_id;
  if not found or not e.off_campus then
    raise exception 'not_a_trip' using errcode = '22023';
  end if;
  if approved_on is null and e.status = 'published' then
    raise exception 'unpublish_first' using errcode = '22023';
  end if;
  if approved_on > (now() at time zone 'Asia/Baghdad')::date then
    raise exception 'approval_in_future' using errcode = '22023';
  end if;
  perform set_config('sal.recording_approval', 'on', true);
  update events.events
  set student_life_approved_on = record_approval.approved_on
  where id = record_approval.event_id;
  perform set_config('sal.recording_approval', 'off', true);
end;
$$;

drop index if exists events.events_occasion_idx;
alter table events.events drop column occasion;

-- 2. A meeting is an event (made in What's on, private); its minutes and
-- resolutions stay governance records and point at it. Minutes kept from
-- Notion without an event keep their own date.
alter table governance.minutes
  add column event_id uuid references events.events (id) on delete set null;

create index minutes_event_id_idx on governance.minutes (event_id);

grant insert (event_id), update (event_id) on governance.minutes to authenticated;

comment on column governance.minutes.event_id is
  'The meeting, an event made in What''s on (owner, Nov 5, 2026); its day sets meeting_on.';

create function private.minutes_follow_meeting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.event_id is not null then
    select (e.starts_at at time zone 'Asia/Baghdad')::date
    into new.meeting_on
    from events.events e
    where e.id = new.event_id;
  end if;
  return new;
end;
$$;

revoke all on function private.minutes_follow_meeting() from public, anon, authenticated;

create trigger minutes_follow_meeting
  before insert or update of event_id, meeting_on on governance.minutes
  for each row execute function private.minutes_follow_meeting();
