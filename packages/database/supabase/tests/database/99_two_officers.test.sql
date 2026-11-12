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

-- Two officers approve (decisions.md, Documents and forms): a Council role,
-- a legal name and a list for Student Life wait for a second officer.

select plan(9);

-- TEMPORARY (20261113004400): the President needs no second officer for
-- now. This test checks the lasting rule, so the exemption is set aside
-- inside this test's transaction. Remove with the exemption.
create or replace function private.is_president() returns boolean
language sql stable set search_path = '' as $$ select false $$;

select pg_temp.make_user('00000000-0000-0000-0000-0000000f0001', 'pres-two@auib.edu.iq', 'President');
select pg_temp.make_user('00000000-0000-0000-0000-0000000f0002', 'vp-two@auib.edu.iq', 'Vice President');
select pg_temp.make_user('00000000-0000-0000-0000-0000000f0003', 'member-two@auib.edu.iq', 'Member Two');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000f0001', 'president');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000f0002', 'vice_president');

-- A Council role.
select pg_temp.login_as('00000000-0000-0000-0000-0000000f0001');
select is(access.assign_role('00000000-0000-0000-0000-0000000f0003', 'general_secretary'), null,
  'The President asks for a Council role');
select pg_temp.logout();
select ok(not exists (select 1 from access.role_assignments
  where user_id = '00000000-0000-0000-0000-0000000f0003' and role = 'general_secretary'),
  'and it waits');

select pg_temp.login_as('00000000-0000-0000-0000-0000000f0001');
select throws_ok(
  $$ select governance.decide_action((select id from governance.pending_actions where kind = 'council_role'), true) $$,
  '42501', 'second_officer_required', 'Whoever asked does not approve');

select pg_temp.login_as('00000000-0000-0000-0000-0000000f0002');
select is(governance.decide_action((select id from governance.pending_actions where kind = 'council_role'), true),
  'approved', 'The Vice President approves');
select pg_temp.logout();
select ok(exists (select 1 from access.role_assignments
  where user_id = '00000000-0000-0000-0000-0000000f0003' and role = 'general_secretary'),
  'and the role is assigned');

-- A legal name.
select pg_temp.login_as('00000000-0000-0000-0000-0000000f0001');
select lives_ok($$ select membership.correct_name('00000000-0000-0000-0000-0000000f0003',
  'Mariam', 'Tariq', 'Jabbar', null, 'مريم', 'طارق', 'جبار', null, 'Spelling on the ID') $$,
  'The President asks to correct a legal name');
select pg_temp.login_as('00000000-0000-0000-0000-0000000f0003');
select is(governance.decide_action((select id from governance.pending_actions where kind = 'legal_name'), true),
  'approved', 'The new Secretary, who also manages members, approves');

-- A list for Student Life.
select pg_temp.login_as('00000000-0000-0000-0000-0000000f0001');
select ok(governance.request_export('student-life-council') is not null, 'A list for Student Life is asked for');
select pg_temp.logout();
select is(private.spend_export('student-life-council', '{}', '00000000-0000-0000-0000-0000000f0001'), false,
  'and cannot be downloaded before a second officer approves');

select * from finish();
rollback;
