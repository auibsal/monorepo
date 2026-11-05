-- The design review, PR 5b's last two (A34, A36; owner, Nov 5, 2026: "as
-- you see fit").
--
-- An event may be one of the Society's occasions, each with its own page:
-- Book Circle's Friday on al-Mutanabbi Street (`book_street_trip`,
-- /events/book-circle/mutanabbi-street) and Open Pages' worst-poem contest
-- (`worst_poem_contest`, /events/open-pages/worst-poem). Event managers
-- set it on the event's page in the Diwan.
--
-- A34: the trip leaves campus, so it is shown only once Student Life's
-- written approval is recorded. The General Secretary sends requests to
-- Student Life (governance.manage), so they record the approval, by its
-- date, on the event's page (events.record_approval). Until then the trip
-- cannot be published, from the Diwan or from Notion's sync, and a trip
-- once approved stays a trip unless governance.manage says otherwise.

alter table events.events
  add column occasion text
    check (occasion in ('book_street_trip', 'worst_poem_contest')),
  add column student_life_approved_on date;

grant insert (occasion), update (occasion) on events.events to authenticated;

comment on column events.events.occasion is
  'One of the Society''s occasions, each with its own page: the Friday on al-Mutanabbi Street (book_street_trip) or the worst-poem contest (worst_poem_contest).';
comment on column events.events.student_life_approved_on is
  'When Student Life approved the trip in writing; recorded by governance.manage (events.record_approval). A trip is published only with it.';

create index events_occasion_idx on events.events (occasion) where occasion is not null;

create function private.trip_needs_approval()
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
  -- A trip stays a trip unless the General Secretary changes it.
  if tg_op = 'UPDATE'
    and old.occasion = 'book_street_trip'
    and new.occasion is distinct from old.occasion
    and auth.uid() is not null
    and not access.has_permission('governance.manage', 'global', null)
  then
    raise exception 'approval_by_general_secretary' using errcode = '42501';
  end if;
  if new.occasion = 'book_street_trip'
    and new.status = 'published'
    and new.student_life_approved_on is null
  then
    raise exception 'trip_needs_approval' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.trip_needs_approval() from public, anon, authenticated;

create trigger trip_needs_approval
  before insert or update on events.events
  for each row execute function private.trip_needs_approval();

-- Record (or, before it is published, clear) Student Life's approval.
create function private.record_approval(event_id uuid, approved_on date)
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
  if not found or e.occasion is distinct from 'book_street_trip' then
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

revoke all on function private.record_approval(uuid, date) from public;
grant execute on function private.record_approval(uuid, date) to authenticated;

create function events.record_approval(event_id uuid, approved_on date)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.record_approval(event_id, approved_on);
$$;

revoke all on function events.record_approval(uuid, date) from public;
grant execute on function events.record_approval(uuid, date) to authenticated;

-- The occasions on record (Oct 30, 2026): the worst-poem contest on March
-- 30, and the two Fridays on al-Mutanabbi Street (drafts until approved).
update events.events set occasion = 'worst_poem_contest'
where slug = 'open-pages-2027-03-30';
update events.events set occasion = 'book_street_trip'
where slug in ('book-circle-2027-04-09', 'book-circle-2027-04-23')
  and status <> 'published';
