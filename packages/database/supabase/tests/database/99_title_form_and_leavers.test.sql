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

-- Arabic titles agree with the holder (decisions §13), and a student who
-- leaves AUIB becomes a guest; a graduate, an Associate (§12).

select plan(15);

select pg_temp.make_user('00000000-0000-0000-0000-0000000071f1', 'vp@auib.edu.iq', 'Vice President');
select pg_temp.make_user('00000000-0000-0000-0000-0000000071f2', 'director@auib.edu.iq', 'Membership Director');
select pg_temp.make_user('00000000-0000-0000-0000-0000000071f3', 'leaver@auib.edu.iq', 'Student Leaver');
select pg_temp.make_user('00000000-0000-0000-0000-0000000071f4', 'graduate@auib.edu.iq', 'Student Graduate');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000071f1', 'vice_president');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000071f2', 'membership_director');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000071f3', 'reporter');

-- Titles
select is((select role_ar from private.card_role('00000000-0000-0000-0000-0000000071f1')), 'نائب الرئيس',
  'Unset, the card keeps the glossary''s form');
select pg_temp.login_as('00000000-0000-0000-0000-0000000071f1');
update core.profiles set title_form = 'feminine' where id = '00000000-0000-0000-0000-0000000071f1';
select pg_temp.logout();
select is((select title_form from core.profiles where id = '00000000-0000-0000-0000-0000000071f1'), 'feminine',
  'The holder sets the form herself');
select is((select role_ar from private.card_role('00000000-0000-0000-0000-0000000071f1')), 'نائبة الرئيس',
  'The card''s role line follows it');
select is((select role_en from private.card_role('00000000-0000-0000-0000-0000000071f1')), 'Vice President',
  'English is unchanged');
select is((select feminine from governance.council_seats() where seat = 'vice_president'), true,
  'The Council page names the seat as she holds it');
select is((select feminine from governance.council_seats() where seat = 'president'), false,
  'An open seat keeps the glossary''s form');
select is((select count(*)::integer from access.roles where name_ar_feminine is null and key not in ('advisory_board_member', 'elections_committee', 'event_staff')), 0,
  'Every title naming a person has its feminine form');

-- Leaving AUIB
select pg_temp.login_as('00000000-0000-0000-0000-0000000071f3');
select throws_ok($$ select membership.record_departure('00000000-0000-0000-0000-0000000071f4', false) $$,
  '42501', null, 'Only Membership records who left');
select pg_temp.logout();
create temp table before_number on commit drop as
  select number from membership.cards where user_id = '00000000-0000-0000-0000-0000000071f3';

select pg_temp.login_as('00000000-0000-0000-0000-0000000071f2');
select is(membership.record_departure('00000000-0000-0000-0000-0000000071f3', false), 'associate',
  'A student who leaves without graduating becomes an Associate Member too (fourth prompt, 7k)');
select is(membership.record_departure('00000000-0000-0000-0000-0000000071f4', true), 'associate',
  'A graduate becomes an Associate Member');
select throws_ok($$ select membership.record_departure('00000000-0000-0000-0000-0000000071f4', true) $$,
  'P0002', 'not_a_student_member', 'Only a student Member is recorded leaving');
select pg_temp.logout();

select is((select tier::text from membership.memberships where user_id = '00000000-0000-0000-0000-0000000071f3'), 'associate',
  'The leaver''s account is an Associate account');
select is((select number from membership.cards where user_id = '00000000-0000-0000-0000-0000000071f3'),
  (select number from before_number), 'with the same number');
select is((select count(*)::integer from access.role_assignments
  where user_id = '00000000-0000-0000-0000-0000000071f3' and (ends_at is null or ends_at > now())), 0,
  'and no role');
select is((select tier::text from membership.memberships where user_id = '00000000-0000-0000-0000-0000000071f4'), 'associate',
  'The graduate keeps the account, as an Associate Member');

select * from finish();
rollback;
