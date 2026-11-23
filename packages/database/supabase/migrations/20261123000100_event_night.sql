-- For the screening on Wed Nov 25 and every event after it (the owner,
-- Nov 22–23, 2026): "How was it?" from the start for who checked in, shifts
-- that move with their event, the image's alt text, the discussion
-- questions for the printed program, and a partner's white logo.

-- ── 1. "How was it?" ─────────────────────────────────────────────────────────
-- Open from the event's start until 14 days after its end (two hours after
-- the start when it has none), and only to someone checked in: the
-- program's code leads to the page during the event.
create or replace function private.feedback_open(event_id uuid)
returns boolean
language sql
stable security definer
set search_path to ''
as $$
  select exists (
    select 1 from events.events e
    where e.id = feedback_open.event_id
      and e.status = 'published'
      and e.starts_at <= now()
      and coalesce(e.ends_at, e.starts_at + interval '2 hours') + interval '14 days' > now()
      and exists (
        select 1 from events.check_ins c
        where c.event_id = e.id and c.user_id = (select auth.uid())
      )
  );
$$;
revoke all on function private.feedback_open(uuid) from public, anon;
grant execute on function private.feedback_open(uuid) to authenticated;

comment on function private.feedback_open(uuid) is
  'Whether the person may answer "How was it?": checked in, from the start to 14 days after the end.';

-- What the event's page asks before it shows the question.
create function events.my_feedback_open(event_id uuid)
returns boolean
language sql
stable security invoker
set search_path to ''
as $$ select private.feedback_open($1) $$;
revoke all on function events.my_feedback_open(uuid) from public, anon;
grant execute on function events.my_feedback_open(uuid) to authenticated;

-- ── 2. Shifts follow their event ─────────────────────────────────────────────
-- When an event's start or end moves, its shifts keep their offsets: a
-- shift's start moves with the event's start, and its end moves with the
-- event's end when it ran to (or past) the old end, else with the start.
create function private.shifts_follow_event()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  by_start interval := new.starts_at - old.starts_at;
  by_end interval := coalesce(new.ends_at - old.ends_at, new.starts_at - old.starts_at);
begin
  if new.starts_at is not distinct from old.starts_at
    and new.ends_at is not distinct from old.ends_at then
    return null;
  end if;
  update programs.shifts s
  set starts_at = s.starts_at + by_start,
    ends_at = case
      when s.ends_at is null then null
      when old.ends_at is not null and s.ends_at >= old.ends_at then s.ends_at + by_end
      else s.ends_at + by_start
    end
  where s.event_id = new.id;
  return null;
end;
$$;
revoke all on function private.shifts_follow_event() from public, anon, authenticated;

create trigger shifts_follow_event after update of starts_at, ends_at on events.events
  for each row execute function private.shifts_follow_event();

-- Shifts already left on an earlier day (the screening's five, still on
-- Sun Nov 22) move to their event's day, keeping their times.
update programs.shifts s
set starts_at = s.starts_at + make_interval(days => d.days),
  ends_at = s.ends_at + make_interval(days => d.days)
from (
  select s2.id,
    ((e.starts_at at time zone 'Asia/Baghdad')::date
      - (s2.starts_at at time zone 'Asia/Baghdad')::date) as days
  from programs.shifts s2
  join events.events e on e.id = s2.event_id
  where s2.starts_at is not null
) d
where d.id = s.id
  and d.days <> 0
  and s.starts_at > now() - interval '30 days';

-- ── 3. The event's image, described ──────────────────────────────────────────
-- Required in the Diwan's editor when an image is uploaded; used on the
-- page, in the link preview (og:image:alt) and in the promo kit.
alter table events.events
  add column image_alt_en text check (char_length(image_alt_en) <= 300),
  add column image_alt_ar text check (char_length(image_alt_ar) <= 300);

comment on column events.events.image_alt_en is
  'The event image''s text alternative (WCAG 1.1.1), in English.';
comment on column events.events.image_alt_ar is
  'The event image''s text alternative (WCAG 1.1.1), in Arabic.';

-- ── 4. "For the conversation" ────────────────────────────────────────────────
-- The discussion questions on the back of the printed program: a list of
-- { "en": …, "ar": … }.
alter table events.events
  add column discussion jsonb not null default '[]'::jsonb
    check (jsonb_typeof(discussion) = 'array' and jsonb_array_length(discussion) <= 8);

comment on column events.events.discussion is
  'The event''s discussion questions, for the printed program: [{"en": …, "ar": …}].';

grant select (image_alt_en, image_alt_ar, discussion) on events.events to anon, authenticated;
grant insert (image_alt_en, image_alt_ar, discussion) on events.events to authenticated;
grant update (image_alt_en, image_alt_ar, discussion) on events.events to authenticated;

-- ── 5. A partner's white logo ────────────────────────────────────────────────
-- Optional: the version that sits on ink along the foot of the kit's
-- pictures. Without it, the partner is named in words there.
alter table governance.partners
  add column logo_white_path text check (char_length(logo_white_path) <= 500);

comment on column governance.partners.logo_white_path is
  'The partner''s logo in white, for the promo kit''s pictures on ink; optional.';

-- ── 6. A late booking is scanned in at once ──────────────────────────────────
-- Places not claimed 10 minutes before the start are released for the
-- door; a booking made after that (a walk-in at 2:25 for 2:30) is the door's
-- own, so it is never released. And a released ticket that is scanned in
-- (its holder came late, or a device offline sent it later) still checks
-- in while a place is free: its place is given back to it.
create or replace function private.release_unclaimed()
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
      and r.created_at < e.starts_at - interval '10 minutes'
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

create or replace function private.check_in(event_id uuid, ticket_code text default null, target_user uuid default null)
returns table (user_id uuid, full_name_en text, full_name_ar text, already boolean)
language plpgsql
security definer
set search_path to ''
as $$
declare
  attendee uuid;
  ticket events.rsvps;
  e events.events;
  inserted boolean;
begin
  if not private.can_check_in(check_in.event_id) then
    raise exception 'events.checkin is required for this event' using errcode = '42501';
  end if;

  select * into e from events.events where id = check_in.event_id for update;

  if check_in.ticket_code is not null then
    select * into ticket from events.rsvps r
    where r.ticket_code = check_in.ticket_code
      and r.event_id = check_in.event_id
      and r.status in ('confirmed', 'released');
    if not found then
      raise exception 'Ticket not valid for this event' using errcode = 'P0002';
    end if;
    -- A released place comes back to its holder while one is free.
    if ticket.status = 'released' then
      if e.capacity is not null and (
        select count(*) from events.rsvps r
        where r.event_id = e.id and r.status = 'confirmed'
      ) >= e.capacity then
        raise exception 'Ticket not valid for this event' using errcode = 'P0002',
          detail = 'released_full';
      end if;
      update events.rsvps set status = 'confirmed' where id = ticket.id;
    end if;
    attendee := ticket.user_id;
  elsif target_user is not null then
    attendee := target_user;
    select * into ticket from events.rsvps r
    where r.event_id = check_in.event_id and r.user_id = attendee and r.status = 'confirmed';
  else
    raise exception 'Give a ticket code or a member' using errcode = '22023';
  end if;

  insert into events.check_ins (event_id, user_id, rsvp_id, method, checked_in_by)
  values (
    check_in.event_id, attendee, ticket.id,
    case when check_in.ticket_code is null then 'manual' else 'qr' end,
    auth.uid()
  )
  on conflict on constraint check_ins_event_id_user_id_key do nothing;
  inserted := found;

  if inserted then
    insert into membership.activity_records (user_id, kind, occurred_at, event_id, recorded_by)
    values (attendee, 'check_in', least(now(), e.starts_at + interval '1 day'), check_in.event_id, auth.uid())
    on conflict do nothing;
  end if;

  return query
    select p.id, p.full_name_en, p.full_name_ar, not inserted
    from core.profiles p where p.id = attendee;
end;
$$;

select private.build_api();
