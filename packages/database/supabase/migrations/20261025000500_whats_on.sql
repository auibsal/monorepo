-- What's on (owner, 2026-10-25): programs and events in one calendar, each
-- with its way in.
--
-- * entry: 'open' (just come; members may ask to be reminded), 'rsvp'
--   (book a place; capacity and waitlist as before) or 'invite' (by
--   invitation: only the people invited, and the officers who run it, see
--   it at all). rsvp_enabled stays, kept in step, for older readers.
-- * Members-only events stay hidden from the public, but the calendar
--   (events.calendar) shows the public their title and time, marked for
--   members, with nothing else.
-- * events.reminders: "Remind me" for open events; the reminder the day
--   before goes to everyone booked and everyone who asked.

alter table events.events
  add column entry text not null default 'rsvp'
    check (entry in ('open', 'rsvp', 'invite'));

comment on column events.events.entry is
  'The way in: open (just come), rsvp (book a place) or invite (by invitation; invisible to anyone not invited).';

update events.events set entry = 'open' where not rsvp_enabled;

-- Older writers set rsvp_enabled; newer ones set entry. Keep them in step.
create function private.event_entry_sync()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if not new.rsvp_enabled and new.entry = 'rsvp' then
      new.entry := 'open';
    end if;
  elsif new.entry = old.entry and new.rsvp_enabled is distinct from old.rsvp_enabled then
    new.entry := case when new.rsvp_enabled then 'rsvp' else 'open' end;
  end if;
  new.rsvp_enabled := new.entry <> 'open';
  -- An invitation-only event is never public, so every public reader that
  -- leaves out members-only events (search, the newsletter, feeds) leaves
  -- it out too.
  if new.entry = 'invite' then
    new.members_only := true;
  end if;
  return new;
end;
$$;

create trigger event_entry_sync before insert or update on events.events
  for each row execute function private.event_entry_sync();

grant insert (entry), update (entry) on events.events to authenticated;

-- ── Invitations ─────────────────────────────────────────────────────────────

create table events.invitations (
  event_id uuid not null references events.events (id) on delete cascade,
  user_id uuid not null references core.profiles (id) on delete cascade,
  invited_by uuid references core.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

comment on table events.invitations is
  'Who is invited to an invitation-only event. Written by the event''s managers; each person reads their own.';

create index invitations_user_id_idx on events.invitations (user_id);
create index invitations_invited_by_idx on events.invitations (invited_by);

alter table events.invitations enable row level security;

create function private.manages_event(event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from events.events e
    where e.id = manages_event.event_id
      and private.has_permission('events.manage', 'programme', e.programme_id)
  );
$$;

create policy "Select by authenticated" on events.invitations
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.manages_event(event_id)));
create policy "Event managers invite" on events.invitations
  for insert to authenticated
  with check ((select private.manages_event(event_id)));
create policy "Event managers withdraw invitations" on events.invitations
  for delete to authenticated
  using ((select private.manages_event(event_id)));
create policy "Third-party apps reach only their areas" on events.invitations
  as restrictive for all to authenticated
  using ((select private.client_allows('events')))
  with check ((select private.client_allows('events')));

grant select, insert, delete on events.invitations to authenticated;
grant all on events.invitations to service_role;

-- Whether the signed-in person may see an invitation-only event.
create function private.invited(event_id uuid, programme_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
      select 1 from events.invitations i
      where i.event_id = invited.event_id and i.user_id = (select auth.uid())
    )
    or private.has_permission('events.manage', 'programme', invited.programme_id);
$$;

-- Invitation-only events are invisible to everyone else, whichever policy
-- let the row through.
create policy "Invitation-only events reach only the invited" on events.events
  as restrictive for select to anon, authenticated
  using (entry <> 'invite' or (select private.invited(id, programme_id)));

-- The one visibility check for SECURITY DEFINER code.
create function private.can_see_event_id(event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from events.events e
    where e.id = can_see_event_id.event_id
      and private.can_see_event(e.status, e.members_only, e.programme_id)
      and (e.entry <> 'invite' or private.invited(e.id, e.programme_id))
  );
$$;

-- ── Remind me ───────────────────────────────────────────────────────────────

create table events.reminders (
  event_id uuid not null references events.events (id) on delete cascade,
  user_id uuid not null references core.profiles (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

comment on table events.reminders is
  '"Remind me": a reminder the day before an event, for events without booking. Each person reads and writes their own.';

create index reminders_user_id_idx on events.reminders (user_id);

alter table events.reminders enable row level security;

create policy "People read their reminders" on events.reminders
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "People ask to be reminded of events they can see" on events.reminders
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.can_see_event_id(event_id)));
create policy "People drop their reminders" on events.reminders
  for delete to authenticated
  using (user_id = (select auth.uid()));
create policy "Third-party apps reach only their areas" on events.reminders
  as restrictive for all to authenticated
  using ((select private.client_allows('events')))
  with check ((select private.client_allows('events')));

grant select, insert, delete on events.reminders to authenticated;
grant all on events.reminders to service_role;

-- ── Booking: invitation-only events take bookings from the invited ─────────

create or replace function private.rsvp(event_id uuid, answers jsonb default '{}')
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  e events.events;
begin
  if not membership.is_member() then
    raise exception 'Only verified members can RSVP' using errcode = '42501';
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

  insert into events.waitlist (event_id, user_id, answers)
  values (e.id, auth.uid(), coalesce(rsvp.answers, '{}'));
  return 'waitlisted';
end;
$$;

-- ── The calendar ────────────────────────────────────────────────────────────
-- Everything the caller may see between two times, plus members-only events
-- as teasers (title, time, program; nothing else) for those who may not.
-- Invitation-only events appear only to the invited.

create function private.calendar(from_at timestamptz, to_at timestamptz)
returns table (
  id uuid, slug text, programme_id uuid, title_en text, title_ar text,
  summary_en text, summary_ar text, venue_en text, venue_ar text,
  starts_at timestamptz, ends_at timestamptz, members_only boolean,
  entry text, capacity integer, status text, image_path text, teaser boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.slug, e.programme_id, e.title_en, e.title_ar,
    case when v.full then e.summary_en end, case when v.full then e.summary_ar end,
    case when v.full then e.venue_en end, case when v.full then e.venue_ar end,
    e.starts_at, e.ends_at, e.members_only, e.entry,
    case when v.full then e.capacity end, e.status,
    case when v.full then e.image_path end, not v.full
  from events.events e
  cross join lateral (
    select private.can_see_event(e.status, e.members_only, e.programme_id)
      and (e.entry <> 'invite' or private.invited(e.id, e.programme_id)) as full
  ) v
  where e.status in ('published', 'cancelled')
    and e.starts_at >= calendar.from_at
    and e.starts_at < calendar.to_at
    and (v.full or (e.members_only and e.entry <> 'invite'))
  order by e.starts_at
  limit 500;
$$;

create function events.calendar(from_at timestamptz, to_at timestamptz)
returns table (
  id uuid, slug text, programme_id uuid, title_en text, title_ar text,
  summary_en text, summary_ar text, venue_en text, venue_ar text,
  starts_at timestamptz, ends_at timestamptz, members_only boolean,
  entry text, capacity integer, status text, image_path text, teaser boolean
)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.calendar($1, $2) $$;

revoke all on function private.event_entry_sync(), private.manages_event(uuid),
  private.invited(uuid, uuid), private.can_see_event_id(uuid),
  private.calendar(timestamptz, timestamptz) from public;
grant execute on function private.manages_event(uuid), private.invited(uuid, uuid),
  private.can_see_event_id(uuid), private.calendar(timestamptz, timestamptz)
  to anon, authenticated, service_role;
revoke all on function events.calendar(timestamptz, timestamptz) from public;
grant execute on function events.calendar(timestamptz, timestamptz)
  to anon, authenticated, service_role;

-- ── Hudhud lists only what the member may see ───────────────────────────────

create or replace function core.telegram_events(telegram_id bigint, event_id uuid DEFAULT NULL::uuid, max_rows integer DEFAULT 6)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid uuid := private.telegram_become(telegram_id);
begin
  return coalesce((
    select jsonb_agg(row_to_json(x) order by x.starts_at)
    from (
      select e.id, e.slug, e.title_en, e.title_ar, e.summary_en, e.summary_ar,
        e.venue_en, e.venue_ar, e.starts_at, e.ends_at, e.members_only,
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
$function$;

-- ── The reminder the day before ─────────────────────────────────────────────

create or replace function private.daily_notices()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  queued integer := 0;
  r record;
begin
  -- Events tomorrow (Baghdad): a reminder to everyone booked, and to
  -- everyone who asked to be reminded ("Remind me").
  for r in
    select e.id as event_id, v.user_id
    from events.events e
    join (
      select x.event_id, x.user_id from events.rsvps x where x.status = 'confirmed'
      union
      select m.event_id, m.user_id from events.reminders m
    ) v on v.event_id = e.id
    where e.status = 'published'
      and (e.starts_at at time zone 'Asia/Baghdad')::date
        = (now() at time zone 'Asia/Baghdad')::date + 1
  loop
    if private.enqueue_once('events.reminder',
         jsonb_build_object('event_id', r.event_id, 'user_id', r.user_id), interval '2 days') then
      queued := queued + 1;
    end if;
  end loop;

  -- Accepted work with no signed agreement after three days: weekly reminder.
  for r in
    select s.id as submission_id, s.author_id as user_id
    from journal.submissions s
    join journal.blind_keys k on k.submission_id = s.id
    join journal.decisions d on d.blind_entry_id = k.blind_entry_id
    where s.status = 'accepted'
      and d.decided_at < now() - interval '3 days'
      and not exists (select 1 from journal.agreements a where a.submission_id = s.id)
  loop
    if private.enqueue_once('journal.agreement_reminder',
         jsonb_build_object('submission_id', r.submission_id, 'user_id', r.user_id), interval '7 days') then
      queued := queued + 1;
    end if;
  end loop;

  -- Roles ending within seven days: one notice.
  for r in
    select a.id as assignment_id, a.user_id
    from access.role_assignments a
    where a.ends_at between now() and now() + interval '7 days'
  loop
    if private.enqueue_once('access.role_ending',
         jsonb_build_object('assignment_id', r.assignment_id, 'user_id', r.user_id), interval '30 days') then
      queued := queued + 1;
    end if;
  end loop;

  -- Removal requests past their 24 hours: tell the managers again, daily.
  for r in
    select q.id as request_id, q.programme_id
    from programmes.removal_requests q
    where q.status in ('open', 'in_progress') and q.due_at < now()
  loop
    if private.enqueue_once('programmes.removal_overdue',
         jsonb_build_object('request_id', r.request_id, 'programme_id', r.programme_id), interval '20 hours') then
      queued := queued + 1;
    end if;
  end loop;

  return queued;
end;
$function$;
