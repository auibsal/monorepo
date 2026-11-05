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
-- </preamble>

select plan(11);

select pg_temp.make_user('00000000-0000-0000-0000-0000000e7001', 'host.e7@auib.edu.iq', 'Host');
select pg_temp.make_user('00000000-0000-0000-0000-0000000e7002', 'gs.e7@auib.edu.iq', 'Secretary');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000e7001', 'programme_lead', 'programme',
  (select id from core.programmes where slug = 'book-circle'));
select pg_temp.grant_role('00000000-0000-0000-0000-0000000e7002', 'general_secretary');

insert into events.events (id, slug, programme_id, title_en, title_ar, starts_at, status, members_only, entry)
values ('00000000-0000-0000-0000-0000000e7101', 'bc-e7-trip',
  (select id from core.programmes where slug = 'book-circle'),
  'Book Circle on al-Mutanabbi Street', 'حلقة الكتاب في شارع المتنبي',
  now() + interval '30 days', 'draft', false, 'rsvp');

select is(
  (select count(*)::int from events.events
   where occasion = 'book_street_trip' and slug like 'book-circle-2027-04-%'),
  2, 'the two Fridays on record are trips');

select pg_temp.login_as('00000000-0000-0000-0000-0000000e7001');
select lives_ok(
  $$ update events.events set occasion = 'book_street_trip' where id = '00000000-0000-0000-0000-0000000e7101' $$,
  'the host marks the event a trip');
select throws_ok(
  $$ update events.events set status = 'published' where id = '00000000-0000-0000-0000-0000000e7101' $$,
  '23514', 'trip_needs_approval', 'a trip is not published before Student Life approves it');
select throws_ok(
  $$ update events.events set student_life_approved_on = current_date where id = '00000000-0000-0000-0000-0000000e7101' $$,
  '42501', null, 'nobody writes the approval directly');
select throws_ok(
  $$ select events.record_approval('00000000-0000-0000-0000-0000000e7101', current_date) $$,
  '42501', 'approval_by_general_secretary', 'the host does not record it');
select throws_ok(
  $$ update events.events set occasion = null where id = '00000000-0000-0000-0000-0000000e7101' $$,
  '42501', 'approval_by_general_secretary', 'nor stops it being a trip');

select pg_temp.login_as('00000000-0000-0000-0000-0000000e7002');
select throws_ok(
  $$ select events.record_approval('00000000-0000-0000-0000-0000000e7101', current_date + 3) $$,
  '22023', 'approval_in_future', 'an approval is not dated ahead');
select lives_ok(
  $$ select events.record_approval('00000000-0000-0000-0000-0000000e7101', current_date) $$,
  'the General Secretary records it');

select pg_temp.login_as('00000000-0000-0000-0000-0000000e7001');
select lives_ok(
  $$ update events.events set status = 'published' where id = '00000000-0000-0000-0000-0000000e7101' $$,
  'then the host publishes the trip');

select pg_temp.login_as('00000000-0000-0000-0000-0000000e7002');
select throws_ok(
  $$ select events.record_approval('00000000-0000-0000-0000-0000000e7101', null) $$,
  '22023', 'unpublish_first', 'a published trip keeps its approval');

select pg_temp.login_anon();
select is(
  (select student_life_approved_on from events.events where id = '00000000-0000-0000-0000-0000000e7101'),
  current_date, 'a visitor reads when it was approved');

select * from finish();
rollback;
