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

select plan(8);

select pg_temp.make_user('00000000-0000-0000-0000-0000000f2001', 'org.f2@example.org', 'Applicant');
select pg_temp.make_user('00000000-0000-0000-0000-0000000f2002', 'other.f2@example.org', 'Someone Else');
select pg_temp.make_user('00000000-0000-0000-0000-0000000f2003', 'alum.f2@example.com', 'An Alum');
insert into membership.associate_requests (full_name, email, relation)
values ('An Alum', 'alum.f2@example.com', 'alumni');

-- The partner application's draft is the applicant's alone.
select pg_temp.login_as('00000000-0000-0000-0000-0000000f2001');
select lives_ok(
  $$ insert into governance.partner_application_drafts (content) values ('{"nameEn": "A Club"}') $$,
  'an applicant saves their draft on the site');
select lives_ok(
  $$ update governance.partner_application_drafts set content = '{"nameEn": "A Better Club"}' $$,
  'and keeps it as they go');
select is((select content ->> 'nameEn' from governance.partner_application_drafts), 'A Better Club',
  'reading it back on another device');
select throws_ok(
  $$ insert into governance.partner_application_drafts (content) values ('{}') $$,
  '23505', null, 'one draft per person');

select pg_temp.login_as('00000000-0000-0000-0000-0000000f2002');
select is_empty($$ select * from governance.partner_application_drafts $$,
  'nobody else reads it');
select pg_temp.login_anon();
select throws_ok($$ select * from governance.partner_application_drafts $$,
  '42501', null, 'nor does a visitor');

-- An alum sees their own request for Associate membership, by their address.
select pg_temp.login_as('00000000-0000-0000-0000-0000000f2003');
select is((select status from membership.my_associate_request()), 'pending',
  'an alum sees their request waiting for the Director of Membership');
select pg_temp.login_as('00000000-0000-0000-0000-0000000f2002');
select is_empty($$ select * from membership.my_associate_request() $$,
  'and nobody sees another''s');

select * from finish();
rollback;
