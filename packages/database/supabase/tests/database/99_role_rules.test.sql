-- Role rules: one Council seat (Constitution 6.6, B9.8), the Faculty
-- Advisor holds no other role (9.1), no duplicates, and two roles with one
-- Council seat at most unless the Council agreed an exception; no other cap.
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
select plan(13);

-- These test the action itself; the second officer's approval is given
-- (99_two_officers tests asking and approving).
select set_config('sal.second_officer', 'on', true);

-- f1 assigns roles (President); a1 to a4 receive them.
select pg_temp.make_user('00000000-0000-0000-0000-0000000000f1', 'pres-rr@auib.edu.iq', 'The President');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a1', 'one-rr@auib.edu.iq', 'Officer One');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a2', 'two-rr@auib.edu.iq', 'Member Two');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a3', 'adv-rr@auib.edu.iq', 'Advisor Three');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000000f1', 'president');

-- A resolution belongs to a meeting (its minutes).
insert into governance.minutes (id, body, meeting_on, title_en, text_en, status)
values ('00000000-0000-0000-0000-00000000e0ff', 'council', current_date, 'Council meeting', 'Minutes.', 'draft');
insert into governance.resolutions (id, code, title_en, text_en, status, adopted_on, minutes_id) values
  ('00000000-0000-0000-0000-00000000e001', 'R-2026-90', 'Founding-term exception', 'Agreed.', 'adopted', current_date, '00000000-0000-0000-0000-00000000e0ff'),
  ('00000000-0000-0000-0000-00000000e002', 'R-2026-91', 'A draft', 'Not yet.', 'draft', null, '00000000-0000-0000-0000-00000000e0ff');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000f1');

select lives_ok(
  $$ select access.assign_role('00000000-0000-0000-0000-0000000000a1', 'general_secretary') $$,
  'A Council seat is assigned'
);
select throws_ok(
  $$ select access.assign_role('00000000-0000-0000-0000-0000000000a1', 'vice_president') $$,
  '23P01', 'one_council_seat',
  'No person holds more than one Council seat (Constitution 6.6)'
);
select throws_ok(
  $$ select access.assign_role('00000000-0000-0000-0000-0000000000f1', 'general_secretary') $$,
  '23P01', 'one_council_seat',
  'so the President is never also the Secretary'
);
select access.end_role_assignment(
  (select id from access.role_assignments where user_id = '00000000-0000-0000-0000-0000000000a1'),
  now() + interval '1 day');
select lives_ok(
  $$ select access.assign_role('00000000-0000-0000-0000-0000000000a1', 'vice_president',
       starts_at => now() + interval '2 days') $$,
  'A seat that starts after the first one ends is allowed'
);
select lives_ok(
  $$ select access.assign_role('00000000-0000-0000-0000-0000000000a1', 'reader') $$,
  'A seat holder also takes a team or scoped role: no cap but one seat'
);

select lives_ok(
  $$ select access.assign_role('00000000-0000-0000-0000-0000000000a2', 'reader') $$,
  'A member takes a role'
);
select throws_ok(
  $$ select access.assign_role('00000000-0000-0000-0000-0000000000a2', 'reader') $$,
  '23P01', 'already_holds_role',
  'and cannot be given the same role twice'
);
select lives_ok(
  $$ select access.assign_role('00000000-0000-0000-0000-0000000000a2', 'copy_editor') $$,
  'Two roles are allowed'
);
select lives_ok(
  $$ select access.assign_role('00000000-0000-0000-0000-0000000000a2', 'photographer') $$,
  'and a third: the roles standard has no cap on team roles'
);
select throws_ok(
  $$ select access.assign_role('00000000-0000-0000-0000-0000000000a1', 'media_director',
       exception_resolution => '00000000-0000-0000-0000-00000000e002') $$,
  '23P01', 'exception_needs_adopted_resolution',
  'A second seat needs an exception the Council adopted (a draft is not enough)'
);

select lives_ok(
  $$ select access.assign_role('00000000-0000-0000-0000-0000000000a3', 'faculty_advisor') $$,
  'The Faculty Advisor is assigned'
);
select throws_ok(
  $$ select access.assign_role('00000000-0000-0000-0000-0000000000a3', 'reader') $$,
  '23P01', 'advisor_holds_no_other_role',
  'and holds no other role (Constitution 9.1)'
);

select pg_temp.logout();
select pg_temp.grant_role('00000000-0000-0000-0000-0000000000f1', 'president');
select is((select count(*)::int from governance.council_members() where full_name_en = 'The President'), 1,
  'The Council lists a person once, however often their office was assigned');

select * from finish();
rollback;
