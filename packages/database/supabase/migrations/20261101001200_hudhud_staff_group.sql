-- Owner, Oct 31, 2026: Hudhud in the staff group.
--   1. A connected group is for members (the main group) or for staff (the
--      Diwan group). A staff group lets in only linked accounts that hold a
--      Society role; anyone else waits for the group's admins.
--   2. A morning brief in the staff group: today's events and what waits
--      in the Diwan, as counts.
--   3. An event-day summary in the staff group after each event: booked,
--      checked in, walk-ins, waitlist.
-- The functions are for the bot's server code only (the secret key): no
-- member or visitor may call them.

alter table core.telegram_groups
  add column audience text not null default 'members'
    check (audience in ('members', 'staff'));

comment on column core.telegram_groups.audience is
  'members: the Society''s main group; staff: officers only (the Diwan group).';

alter table core.telegram_posts
  drop constraint telegram_posts_kind_check,
  add constraint telegram_posts_kind_check
    check (kind in ('event', 'event_soon', 'piece', 'word', 'brief', 'event_summary'));

-- ── Who may join a staff group ──────────────────────────────────────────────
create function core.telegram_is_staff(telegram_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select private.is_staff(a.user_id)
    from core.telegram_accounts a
    where a.telegram_id = telegram_is_staff.telegram_id
  ), false);
$$;
revoke all on function core.telegram_is_staff(bigint) from public, anon, authenticated;
grant execute on function core.telegram_is_staff(bigint) to service_role;

-- ── The morning brief ───────────────────────────────────────────────────────
-- Today in Baghdad: every event (members-only and invitation events too;
-- the group is officers only), with bookings, and the counts of what waits
-- in the Diwan. No names of members, only titles and numbers.
create function core.telegram_staff_brief(at timestamptz default now())
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with bounds as (
    select
      (date_trunc('day', at at time zone 'Asia/Baghdad') at time zone 'Asia/Baghdad') as day_start,
      ((date_trunc('day', at at time zone 'Asia/Baghdad') + interval '1 day') at time zone 'Asia/Baghdad') as day_end
  )
  select jsonb_build_object(
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'slug', e.slug,
        'title_en', e.title_en,
        'title_ar', e.title_ar,
        'starts_at', e.starts_at,
        'venue_en', e.venue_en,
        'venue_ar', e.venue_ar,
        'entry', e.entry,
        'capacity', e.capacity,
        'booked', private.confirmed_count(e.id),
        'waitlisted', (select count(*) from events.waitlist w where w.event_id = e.id and w.status = 'waiting')
      ) order by e.starts_at)
      from events.events e, bounds b
      where e.status = 'published' and e.starts_at >= b.day_start and e.starts_at < b.day_end
    ), '[]'::jsonb),
    'waiting', jsonb_build_object(
      'partner_applications', (select count(*) from governance.partner_applications() pa),
      'grants_asked', (
        select count(*) from governance.partner_agreements a
        where a.asked_grants is not null and a.status = 'signed'
      ),
      'perks_waiting', (
        select count(*) from governance.member_offers o
        where o.submitted_at is not null and not o.is_published
      ),
      'submissions_new', (
        select count(*) from journal.submissions s
        where s.status in ('received', 'intake_check')
      ),
      'hiring_new', (
        select count(*) from programmes.opening_replies r where r.status = 'new'
      ),
      'requests_open', (
        select count(*) from governance.form_submissions f
        where f.status in ('submitted', 'acknowledged')
      )
    )
  );
$$;
revoke all on function core.telegram_staff_brief(timestamptz) from public, anon, authenticated;
grant execute on function core.telegram_staff_brief(timestamptz) to service_role;

-- ── After each event ────────────────────────────────────────────────────────
-- Events that ended between `since` and `until` (an event without an end
-- counts as ending three hours after it starts), with what the door saw.
create function core.telegram_event_summaries(since timestamptz, until timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id,
    'slug', e.slug,
    'title_en', e.title_en,
    'title_ar', e.title_ar,
    'starts_at', e.starts_at,
    'entry', e.entry,
    'capacity', e.capacity,
    'booked', (select count(*) from events.rsvps r where r.event_id = e.id and r.status = 'confirmed'),
    'checked_in', (select count(distinct c.user_id) from events.check_ins c where c.event_id = e.id),
    'booked_and_came', (
      select count(distinct c.user_id) from events.check_ins c
      join events.rsvps r on r.event_id = c.event_id and r.user_id = c.user_id and r.status = 'confirmed'
      where c.event_id = e.id
    ),
    'waitlisted', (select count(*) from events.waitlist w where w.event_id = e.id and w.status = 'waiting')
  ) order by e.starts_at), '[]'::jsonb)
  from events.events e
  where e.status = 'published'
    and coalesce(e.ends_at, e.starts_at + interval '3 hours') > since
    and coalesce(e.ends_at, e.starts_at + interval '3 hours') <= until;
$$;
revoke all on function core.telegram_event_summaries(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function core.telegram_event_summaries(timestamptz, timestamptz) to service_role;
