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
    values ('Council meeting', '<p>Minutes.</p>', current_date - 1, 'council', 'adopted', current_date)
    returning id
  )
  insert into governance.resolutions (id, code, title_en, text_en, body, status, adopted_on, minutes_id)
  select council_resolution.id, council_resolution.code, 'Approves the partnership', '<p>Resolved.</p>', 'council', 'adopted', current_date, m.id
  from m
  returning id;
$$;
-- </preamble>

select plan(11);

select pg_temp.make_user('00000000-0000-0000-0000-0000000e7001', 'host.e7@auib.edu.iq', 'Host');
select pg_temp.make_user('00000000-0000-0000-0000-0000000e7002', 'gs.e7@auib.edu.iq', 'Secretary');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000e7002', 'general_secretary');

insert into events.events (id, slug, title_en, title_ar, starts_at, status, entry)
values ('00000000-0000-0000-0000-0000000e7101', 'bc-e7-trip',
  'Book Circle on al-Mutanabbi Street', 'حلقة الكتاب في شارع المتنبي',
  now() + interval '30 days', 'draft', 'rsvp');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000e7001', 'programme_lead', 'event',
  '00000000-0000-0000-0000-0000000e7101');

select is(
  (select count(*)::int from events.events
   where off_campus and slug like 'trip-to-al-mutanabbi-street-2027-04-%'),
  1, 'the Earth Day trip (April 23) is off campus; the April 9 trip was canceled (owner, Nov 7, 2026)');

select pg_temp.login_as('00000000-0000-0000-0000-0000000e7001');
select lives_ok(
  $$ update events.events set off_campus = true where id = '00000000-0000-0000-0000-0000000e7101' $$,
  'the event lead marks the event off campus');
select throws_ok(
  $$ update events.events set status = 'published' where id = '00000000-0000-0000-0000-0000000e7101' $$,
  '23514', 'trip_needs_approval', 'a trip is not published before Student Life approves it');
select throws_ok(
  $$ update events.events set student_life_approved_on = current_date where id = '00000000-0000-0000-0000-0000000e7101' $$,
  '42501', null, 'nobody writes the approval directly');
select throws_ok(
  $$ select events.record_approval('00000000-0000-0000-0000-0000000e7101', current_date, 'Student Life') $$,
  '42501', 'approval_by_general_secretary', 'the host does not record it');
select throws_ok(
  $$ update events.events set off_campus = false where id = '00000000-0000-0000-0000-0000000e7101' $$,
  '42501', 'approval_by_general_secretary', 'nor brings it back on campus');

select pg_temp.login_as('00000000-0000-0000-0000-0000000e7002');
select throws_ok(
  $$ select events.record_approval('00000000-0000-0000-0000-0000000e7101', current_date + 3, 'Student Life') $$,
  '22023', 'approval_in_future', 'an approval is not dated ahead');
select lives_ok(
  $$ select events.record_approval('00000000-0000-0000-0000-0000000e7101', current_date, 'Student Life') $$,
  'the General Secretary records it');

select pg_temp.login_as('00000000-0000-0000-0000-0000000e7001');
select lives_ok(
  $$ update events.events set status = 'published' where id = '00000000-0000-0000-0000-0000000e7101' $$,
  'then the host publishes the trip');

select pg_temp.login_as('00000000-0000-0000-0000-0000000e7002');
select throws_ok(
  $$ select events.record_approval('00000000-0000-0000-0000-0000000e7101', null, null) $$,
  '22023', 'unpublish_first', 'a published trip keeps its approval');

select pg_temp.login_anon();
select is(
  (select student_life_approved_on from events.events where id = '00000000-0000-0000-0000-0000000e7101'),
  current_date, 'a visitor reads when it was approved');

select * from finish();
rollback;
