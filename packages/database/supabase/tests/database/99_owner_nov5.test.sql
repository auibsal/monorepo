-- The design review, PR 4e (Nov 4, 2026): Open Pages prompt cards (A35).
begin;
-- <preamble>
-- Shared pgTAP preamble. Each test file includes a copy (pg_prove runs files
-- in isolation); keep them identical. `bun run --cwd packages/database db:test:sync` rewrites them.
create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;

create function pg_temp.login_as(uid uuid, extra jsonb default '{}')
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config(
    'request.jwt.claims',
    -- aal2 by default (two-step sign-in done); pass '{"aal":"aal1"}' to test without it.
    (jsonb_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal2') || extra)::text,
    true
  );
  perform set_config('role', 'authenticated', true);
end;
$$;

create function pg_temp.login_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end;
$$;

create function pg_temp.logout()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- A confirmed account. AUIB addresses are verified by the sign-up trigger.
create function pg_temp.make_user(uid uuid, email text, name text default 'Test User')
returns uuid
language sql
as $$
  insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, aud, role)
  values (uid, email, now(), jsonb_build_object('full_name_en', name), 'authenticated', 'authenticated')
  returning id;
$$;

create function pg_temp.grant_role(uid uuid, role_key text, kind text default 'global', scope uuid default null)
returns void
language sql
as $$
  insert into access.role_assignments (user_id, role, scope_type, scope_id)
  values (uid, role_key, kind, scope);
$$;

grant execute on all functions in schema pg_temp to public;

-- Semesters around today: older, previous, current.
insert into core.semesters (code, name_en, name_ar, starts_on, ends_on) values
  ('fall-2024', 'Older', 'أقدم', current_date - 420, current_date - 300),
  ('spring-2025', 'Previous', 'السابق', current_date - 200, current_date - 60),
  ('fall-2025', 'Current', 'الحالي', current_date - 30, current_date + 60);

-- Tests check the two-activity rule; the founding-voter tests turn the
-- first-100 rule back on themselves.
update core.settings set value = '0' where key = 'membership.founding_voters';

-- An adopted Council resolution, with its minutes: the Council's vote that
-- approves a partnership (decisions §10).
create function pg_temp.council_resolution(
  id uuid default '00000000-0000-0000-0000-0000000c0001',
  code text default 'R-2026-99'
)
returns uuid
language sql
as $$
  with m as (
    insert into governance.minutes (title_en, text_en, meeting_on, body, status, adopted_on)
    values ('Council meeting', '<p>Minutes.</p>', current_date - 1, 'council', 'approved', current_date)
    returning id
  )
  insert into governance.resolutions (id, code, title_en, text_en, body, status, adopted_on, minutes_id)
  select council_resolution.id, council_resolution.code, 'Approves the partnership', '<p>Resolved.</p>', 'council', 'adopted', current_date, m.id
  from m
  returning id;
$$;
-- </preamble>

-- The owner's decisions of Nov 5, 2026: the Council of six, no programs
-- (events, with event leads scoped to a series or one event), and the
-- Typewriter Tour under membership.
select plan(18);

select is(
  (select array_agg(key order by key) from access.roles where is_council),
  array['artistic_director', 'eic', 'events_director', 'general_secretary', 'media_director',
    'membership_director', 'partnerships_director', 'president', 'vice_president'],
  'The Council has nine seats: three officers and six directors (decisions.md)'
);
select ok(
  not exists (select 1 from access.roles
    where key in ('director', 'programs_director')),
  'No Director of Programs (the Directors of Events, Partnerships and Membership are back, Nov 7)'
);
select ok(
  not exists (select 1 from access.role_permissions where role = 'vice_president'
    and permission in ('events.manage', 'programs.manage', 'members.manage', 'productions.manage'))
  and exists (select 1 from access.role_permissions where role = 'vice_president' and permission = 'partners.manage'),
  'The Vice President owns partnerships, not events or membership'
);
select ok(
  not exists (select 1 from access.roles where key = 'acting_president')
  and exists (select 1 from pg_proc where proname = 'president_absent'),
  'No Acting President role: the Vice President acts while the President is recorded absent'
);
select ok(
  exists (select 1 from access.role_permissions where role = 'general_secretary' and permission = 'tour.run')
  and exists (select 1 from access.role_permissions where role = 'tour_lead' and permission = 'tour.run')
  and exists (select 1 from access.roles where key = 'tour_lead' and hiring_owner = 'membership'),
  'The Secretary and the Tour Lead run the Typewriter Tour'
);
select is(
  (select name_en || ' / ' || name_ar from access.roles where key = 'programme_lead'),
  'Event Lead / قائد الفعالية',
  'The Program Lead is now an event lead'
);
select hasnt_table('events', 'series_rules', 'The repeat rules are gone');

select pg_temp.make_user('00000000-0000-0000-0000-0000000f5001', 'lead.f5@auib.edu.iq', 'Event Lead');
select pg_temp.make_user('00000000-0000-0000-0000-0000000f5002', 'tour.f5@auib.edu.iq', 'Tour Lead');
select pg_temp.make_user('00000000-0000-0000-0000-0000000f5003', 'salon.f5@auib.edu.iq', 'Salon Lead');

insert into events.events (id, slug, programme_id, title_en, title_ar, starts_at, status, entry)
values
  ('00000000-0000-0000-0000-0000000f5101', 'one-off-f5', null,
   'A one-off', 'فعالية', now() + interval '7 days', 'draft', 'open'),
  ('00000000-0000-0000-0000-0000000f5102', 'another-f5', null,
   'Another', 'أخرى', now() + interval '14 days', 'draft', 'open');

select pg_temp.grant_role('00000000-0000-0000-0000-0000000f5001', 'programme_lead', 'event',
  '00000000-0000-0000-0000-0000000f5101');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000f5002', 'tour_lead');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000f5003', 'programme_lead', 'programme',
  (select id from core.programmes where slug = 'salon'));

select pg_temp.login_as('00000000-0000-0000-0000-0000000f5001');
select is((select count(*)::int from events.events where id in (
    '00000000-0000-0000-0000-0000000f5101', '00000000-0000-0000-0000-0000000f5102')), 1,
  'An event lead for one event sees that draft, not another');
update events.events set title_en = 'A one-off, renamed' where id = '00000000-0000-0000-0000-0000000f5101';
select ok(private.manages_event('00000000-0000-0000-0000-0000000f5101')
  and not private.manages_event('00000000-0000-0000-0000-0000000f5102'),
  'and runs it alone');
select ok(private.can_check_in('00000000-0000-0000-0000-0000000f5101'), 'and runs its door');
select pg_temp.logout();
select is((select title_en from events.events where id = '00000000-0000-0000-0000-0000000f5101'),
  'A one-off, renamed', 'The event lead edits their event');

select pg_temp.login_as('00000000-0000-0000-0000-0000000f5002');
select lives_ok(
  $$ select programmes.record_six_words('one two three four five six', 'en') $$,
  'The Tour Lead transcribes Six Words'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000f5003');
select throws_ok(
  $$ select programmes.record_six_words('seven eight nine ten eleven twelve', 'en') $$,
  '42501', null,
  'a series'' event lead does not: the Tour belongs to membership'
);
select pg_temp.logout();
select is(
  (select rhythm_en from core.programmes where slug = 'salon'),
  'Tuesdays, as the term calendar sets.',
  'Each series runs as the term calendar sets'
);

-- Standard events (decisions.md, later): an event's parts are its own.
select pg_temp.login_as('00000000-0000-0000-0000-0000000f5001');
select lives_ok(
  $$ insert into programmes.needs (event_id, item, quantity, needed_by, purpose)
     values ('00000000-0000-0000-0000-0000000f5101', 'Chairs', 20, current_date + 5, 'Seating') $$,
  'An event lead lists their event''s needs'
);
select throws_ok(
  $$ insert into programmes.shifts (event_id, role_en, role_ar, starts_at, ends_at)
     values ('00000000-0000-0000-0000-0000000f5102', 'Door', 'الباب', now() + interval '8 days',
       now() + interval '8 days 2 hours') $$,
  '42501', null,
  'but keeps no shifts for another event'
);
select pg_temp.logout();
select ok(
  not exists (select 1 from events.events e join core.programmes p on p.id = e.programme_id
    where p.slug in ('second-chapter', 'salon', 'book-circle', 'open-pages', 'listening-room', 'typewriter-tour')),
  'No event belongs to a series'
);

select pg_temp.login_anon();
select is(
  (select array_agg(seat order by sort) from governance.council_seats()),
  array['president', 'vice_president', 'general_secretary', 'eic', 'media_director',
    'artistic_director', 'events_director', 'partnerships_director', 'membership_director'],
  'The Council page lists the nine seats in order, held or open'
);

select * from finish();
rollback;
