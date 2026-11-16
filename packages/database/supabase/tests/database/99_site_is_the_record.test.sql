-- The site is the system of record (Nov 16, 2026): leads, default shifts, needs
-- for productions and Editions, Student Life's weeks, the document scan and
-- the web team's alerts.
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

select plan(14);

select pg_temp.make_user('00000000-0000-0000-0000-00000016e001', 'events.e16@auib.edu.iq', 'Events Director');
select pg_temp.grant_role('00000000-0000-0000-0000-00000016e001', 'events_director');
select pg_temp.make_user('00000000-0000-0000-0000-00000016e002', 'web.e16@auib.edu.iq', 'Web Lead');
select pg_temp.grant_role('00000000-0000-0000-0000-00000016e002', 'web_lead');
select pg_temp.make_user('00000000-0000-0000-0000-00000016e003', 'member.e16@auib.edu.iq', 'Member');

-- Default shifts.
insert into events.events (id, slug, title_en, title_ar, starts_at, status, entry, serves_food)
values ('00000000-0000-0000-0000-00000016e101', 'e16-reading', 'A reading', 'قراءة',
  now() + interval '10 days', 'draft', 'rsvp', false);
select is(
  (select array_agg(role_en || ':' || capacity order by role_en) from programs.shifts
    where event_id = '00000000-0000-0000-0000-00000016e101'),
  array['Check-in:2', 'Membership table:1'],
  'a new event gets check-in for two and the membership table for one');
update events.events set serves_food = true where id = '00000000-0000-0000-0000-00000016e101';
select is(
  (select count(*)::integer from programs.shifts
    where event_id = '00000000-0000-0000-0000-00000016e101' and role_en = 'Refreshments' and capacity = 2),
  1, 'serving food adds refreshments for two');
update events.events set serves_food = false where id = '00000000-0000-0000-0000-00000016e101';
update events.events set serves_food = true where id = '00000000-0000-0000-0000-00000016e101';
select is(
  (select count(*)::integer from programs.shifts
    where event_id = '00000000-0000-0000-0000-00000016e101' and role_en = 'Refreshments'),
  1, 'and only once');

-- Publishing needs a lead and a place.
select pg_temp.login_as('00000000-0000-0000-0000-00000016e001');
select throws_ok(
  $$ update events.events set status = 'published' where id = '00000000-0000-0000-0000-00000016e101' $$,
  '23514', 'event_needs_lead_and_place',
  'an event without a lead or a place is not published');
update events.events
  set lead_id = '00000000-0000-0000-0000-00000016e003', venue_en = 'Room 101'
  where id = '00000000-0000-0000-0000-00000016e101';
select lives_ok(
  $$ update events.events set status = 'published' where id = '00000000-0000-0000-0000-00000016e101' $$,
  'with a lead and a place it is');
select lives_ok(
  $$ insert into events.events (slug, title_en, title_ar, starts_at, status, entry)
     values ('e16-new', 'New', 'جديد', now() + interval '20 days', 'draft', 'open') $$,
  'Events makes a new event in the Diwan');
select pg_temp.logout();

-- Needs for an Edition.
insert into journal.issues (id, slug, volume, status)
values ('00000000-0000-0000-0000-00000016e201', 'e16-edition', 1, 'draft');
select pg_temp.login_as('00000000-0000-0000-0000-00000016e003');
select throws_ok(
  $$ insert into programs.needs (issue_id, item, quantity)
     values ('00000000-0000-0000-0000-00000016e201', 'Paper', 10) $$,
  '42501', null, 'a member lists no needs for an Edition');
select pg_temp.logout();

-- Student Life's weeks.
insert into events.student_life_weeks (id, week_of, token_hash)
values ('00000000-0000-0000-0000-00000016e301', current_date, 'e16-hash');
insert into events.student_life_week_events (week_id, event_id)
values ('00000000-0000-0000-0000-00000016e301', '00000000-0000-0000-0000-00000016e101');
select pg_temp.login_as('00000000-0000-0000-0000-00000016e001');
select is((select count(*)::integer from events.student_life_week_events), 1,
  'Events reads what Student Life included');
select throws_ok($$ select token_hash from events.student_life_weeks $$, '42501', null,
  'the link''s hash is never read by a client');
select pg_temp.login_as('00000000-0000-0000-0000-00000016e003');
select is((select count(*)::integer from events.student_life_weeks), 0,
  'a member reads no week');
select pg_temp.logout();

-- The document scan.
insert into core.document_scan_hits (notion_page_id, title, url, keeper, kind, found)
values ('e16page', 'Constitution', 'https://www.notion.so/e16page', 'Director of Events', 'term', 'themed call');
select pg_temp.login_as('00000000-0000-0000-0000-00000016e001');
select is((select count(*)::integer from core.document_scan_hits), 1,
  'the keeper reads the findings on their document');
select pg_temp.login_as('00000000-0000-0000-0000-00000016e003');
select is((select count(*)::integer from core.document_scan_hits), 0,
  'a member reads none');
select pg_temp.logout();

-- The web team's alerts.
insert into core.staff_alerts (team, text_en, text_ar) values ('web', 'Deploy failed', 'فشل النشر');
select pg_temp.login_as('00000000-0000-0000-0000-00000016e002');
select is((select count(*)::integer from core.staff_alerts where team = 'web'), 1,
  'the web lead reads the web team''s alerts');
select pg_temp.login_as('00000000-0000-0000-0000-00000016e001');
select is((select count(*)::integer from core.staff_alerts where team = 'web'), 0,
  'other officers do not');
select pg_temp.logout();

select * from finish();
rollback;
