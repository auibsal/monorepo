-- After an event, the program, and the shifts (decisions.md, Events).

-- ── "How was it?" and "Thanks for coming" ───────────────────────────────────

-- One answer per person: five choices, "Not for me" (1) to "Loved it" (5),
-- and an optional comment. Open from the event's end for 14 days to anyone
-- signed in who may see the event. The event's managers read the count,
-- the average and the comments, never who wrote them
-- (events.feedback_summary); each person reads only their own.
create table events.feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events.events (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);
comment on table events.feedback is
  'After an event (decisions.md, Events): "How was it?", one answer per person, read by the event''s managers only as counts and unnamed comments.';
create index feedback_user_id_idx on events.feedback (user_id);

alter table events.feedback enable row level security;
revoke all on events.feedback from anon, authenticated;
grant select on events.feedback to authenticated;
grant insert (event_id, rating, comment) on events.feedback to authenticated;
grant all on events.feedback to service_role;

create policy "No third-party apps" on events.feedback
  as restrictive for all to authenticated
  using ((select private.client_allows('events')))
  with check ((select private.client_allows('events')));

-- The 14 days after the event's end (two hours after the start when it
-- has no end), for an event the person may see.
create function private.feedback_open(event_id uuid)
returns boolean
language sql
stable security definer
set search_path to ''
as $$
  select exists (
    select 1 from events.events e
    where e.id = feedback_open.event_id
      and e.status = 'published'
      and coalesce(e.ends_at, e.starts_at + interval '2 hours') <= now()
      and coalesce(e.ends_at, e.starts_at + interval '2 hours') + interval '14 days' > now()
      and private.can_see_event_id(e.id)
  );
$$;
grant execute on function private.feedback_open(uuid) to anon, authenticated;

create policy "People read their own answer" on events.feedback
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "People answer once, while it is open" on events.feedback
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select private.feedback_open(event_id))
  );

-- What the event's managers see: the count, the average and the comments,
-- with no names.
create function private.feedback_summary(event_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $$
declare
  e events.events;
begin
  select * into e from events.events where id = feedback_summary.event_id;
  if not found or not private.leads_event('events.manage', e.id, e.programme_id) then
    raise exception 'events.manage is required for this event' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'count', (select count(*) from events.feedback f where f.event_id = e.id),
    'average', (select round(avg(f.rating), 1) from events.feedback f where f.event_id = e.id),
    'ratings', (
      select jsonb_object_agg(r::text, (select count(*) from events.feedback f
        where f.event_id = e.id and f.rating = r))
      from generate_series(1, 5) r
    ),
    'comments', coalesce((
      select jsonb_agg(jsonb_build_object('rating', f.rating, 'comment', f.comment)
        order by f.created_at)
      from events.feedback f
      where f.event_id = e.id and nullif(btrim(f.comment), '') is not null
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function private.feedback_summary(uuid) from public, anon;
grant execute on function private.feedback_summary(uuid) to authenticated;

create function events.feedback_summary(event_id uuid)
returns jsonb
language sql
stable
set search_path to ''
as $$ select private.feedback_summary($1) $$;
revoke all on function events.feedback_summary(uuid) from public, anon;
grant execute on function events.feedback_summary(uuid) to authenticated;

-- "Thanks for coming" at 9:00 a.m. Baghdad time the next day, to everyone
-- who checked in (not those who booked and didn't come), through the
-- outbox, one email each.
create function private.thanks_for_coming()
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  queued integer := 0;
  yesterday date := (now() at time zone 'Asia/Baghdad')::date - 1;
  r record;
begin
  for r in
    select c.event_id, c.user_id
    from events.check_ins c
    join events.events e on e.id = c.event_id
    where e.status = 'published'
      and (e.starts_at at time zone 'Asia/Baghdad')::date = yesterday
  loop
    if private.enqueue_once('events.thanks',
         jsonb_build_object('event_id', r.event_id, 'user_id', r.user_id), interval '3 days') then
      queued := queued + 1;
    end if;
  end loop;
  return queued;
end;
$$;
revoke all on function private.thanks_for_coming() from public, anon, authenticated;

select cron.schedule('sal-thanks-for-coming', '0 6 * * *', $$ select private.thanks_for_coming() $$);

-- ── The program (screenings, readings, performances) ────────────────────────

-- What the event shows, in order: each item's title in both languages, its
-- credit (an outside work's credit line, cited as a bibliography cites a
-- work: a film's director, a book's author), year, length, one line in
-- both languages, an award and a still. The promo kit draws a card for
-- each. Anyone from the Society is picked from the site's people, never
-- typed here.
create table events.program_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events.events (id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  title_en text not null default '' check (char_length(title_en) <= 200),
  title_ar text not null default '' check (char_length(title_ar) <= 200),
  credit text check (char_length(credit) <= 200),
  year integer check (year between 1850 and 2100),
  length_minutes integer check (length_minutes between 1 and 600),
  line_en text check (char_length(line_en) <= 200),
  line_ar text check (char_length(line_ar) <= 200),
  award_en text check (char_length(award_en) <= 200),
  award_ar text check (char_length(award_ar) <= 200),
  still_path text check (char_length(still_path) <= 500),
  created_at timestamptz not null default now(),
  constraint program_items_titled check (title_en <> '' or title_ar <> '')
);
comment on table events.program_items is
  'An event''s program (decisions.md, Events): the works it shows, cited by their credit lines; the promo kit draws a card for each.';
create index program_items_event_idx on events.program_items (event_id, position);

alter table events.program_items enable row level security;
revoke all on events.program_items from anon, authenticated;
grant select on events.program_items to anon, authenticated;
grant insert (event_id, position, title_en, title_ar, credit, year, length_minutes,
  line_en, line_ar, award_en, award_ar, still_path) on events.program_items to authenticated;
grant update (position, title_en, title_ar, credit, year, length_minutes,
  line_en, line_ar, award_en, award_ar, still_path) on events.program_items to authenticated;
grant delete on events.program_items to authenticated;
grant all on events.program_items to service_role;

create policy "No third-party apps" on events.program_items
  as restrictive for all to authenticated
  using ((select private.client_allows('events')))
  with check ((select private.client_allows('events')));
create policy "Anyone who sees the event reads its program" on events.program_items
  for select to anon, authenticated
  using ((select private.can_see_event_id(event_id)));
create policy "Event managers add to the program" on events.program_items
  for insert to authenticated
  with check (exists (
    select 1 from events.events e
    where e.id = event_id
      and (select private.leads_event('events.manage', e.id, e.programme_id))
  ));
create policy "Event managers edit the program" on events.program_items
  for update to authenticated
  using (exists (
    select 1 from events.events e
    where e.id = event_id
      and (select private.leads_event('events.manage', e.id, e.programme_id))
  ));
create policy "Event managers remove from the program" on events.program_items
  for delete to authenticated
  using (exists (
    select 1 from events.events e
    where e.id = event_id
      and (select private.leads_event('events.manage', e.id, e.programme_id))
  ));

create trigger log_activity
  after insert or update or delete on events.program_items
  for each row execute function private.log_activity();
create trigger revalidate
  after insert or update or delete on events.program_items
  for each statement execute function private.queue_revalidation('events');

-- ── Screenings and performances, and their shifts ───────────────────────────

-- A screening or a performance (or neither): it adds two shifts, one
-- person each, "Projection and sound" and "Photos" (for Media), beside the
-- standard ones (decisions.md, Events).
alter table events.events add column format text
  check (format in ('screening', 'performance'));
comment on column events.events.format is
  'A screening or a performance, which adds the Projection and sound and the Photos shifts; null for any other event.';

create or replace function private.default_shifts()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.add_shift(new, 'Check-in', 'تسجيل الحضور', 2, true);
    perform private.add_shift(new, 'Membership table', 'طاولة العضوية', 1, false);
  end if;
  if new.serves_food and (tg_op = 'INSERT' or not old.serves_food) then
    perform private.add_shift(new, 'Refreshments', 'الضيافة', 2, false);
  end if;
  if new.format is not null and (tg_op = 'INSERT' or old.format is null) then
    perform private.add_shift(new, 'Projection and sound', 'العرض والصوت', 1, false);
    perform private.add_shift(new, 'Photos', 'التصوير', 1, false);
  end if;
  return null;
end;
$$;

drop trigger default_shifts on events.events;
create trigger default_shifts
  after insert or update of serves_food, format on events.events
  for each row execute function private.default_shifts();

-- The screening on Sun Nov 22 gets both now.
update events.events set format = 'screening'
where slug = 'iraqi-short-films-screening-2026-11-22';

-- ── The daily brief flags empty shifts ──────────────────────────────────────

-- Hudhud's brief to the Diwan group adds every event within five days
-- that still has a shift with a place nobody has taken.
create or replace function core.telegram_staff_brief(at timestamptz default now())
returns jsonb
language sql
stable security definer
set search_path to ''
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
    'empty_shifts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', x.slug,
        'title_en', x.title_en,
        'title_ar', x.title_ar,
        'starts_at', x.starts_at,
        'shifts', x.shifts
      ) order by x.starts_at)
      from (
        select e.slug, e.title_en, e.title_ar, e.starts_at,
          jsonb_agg(jsonb_build_object('role_en', s.role_en, 'role_ar', s.role_ar,
            'open', s.capacity - (
              select count(*) from programmes.shift_signups g
              where g.shift_id = s.id and g.status in ('signed_up', 'confirmed')
            )) order by s.starts_at, s.role_en) as shifts
        from events.events e
        join programmes.shifts s on s.event_id = e.id
        where e.status = 'published'
          and e.starts_at > at
          and e.starts_at <= at + interval '5 days'
          and s.capacity > (
            select count(*) from programmes.shift_signups g
            where g.shift_id = s.id and g.status in ('signed_up', 'confirmed')
          )
        group by e.id
      ) x
    ), '[]'::jsonb),
    'waiting', jsonb_build_object(
      'partner_applications', (select count(*) from governance.partner_applications() pa),
      'grants_asked', (
        select count(*) from governance.partner_agreements a
        where a.asked_grants is not null and a.status = 'signed'
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
