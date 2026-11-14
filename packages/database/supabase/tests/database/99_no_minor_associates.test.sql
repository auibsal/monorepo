-- Associate Members are 18 or older: the class refuses someone under 18,
-- and so does a sign-up that would make one.
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

-- A student under 18.
select pg_temp.make_user('a1000000-0000-0000-0000-000000000001', '1250101@auib.edu.iq', 'Young');
update core.profiles
set birth_month = 1, birth_year = extract(year from now())::smallint - 16
where id = 'a1000000-0000-0000-0000-000000000001';

select throws_ok(
  $$ update membership.memberships set tier = 'associate'
     where user_id = 'a1000000-0000-0000-0000-000000000001' $$,
  '22023', 'minor_associate', 'Under 18, no one is an Associate Member');

select pg_temp.login_as('a1000000-0000-0000-0000-000000000001');
select is(core.report_leaving(true), 'associate',
  'The one exception: a student who leaves AUIB under 18 becomes an Associate');
select pg_temp.logout();
select ok(private.is_minor('a1000000-0000-0000-0000-000000000001'),
  'and the under-18 rules stay on');

-- An adult becomes one as before.
select pg_temp.make_user('a1000000-0000-0000-0000-000000000002', '1250102@auib.edu.iq', 'Adult');
select lives_ok(
  $$ update membership.memberships set tier = 'associate'
     where user_id = 'a1000000-0000-0000-0000-000000000002' $$,
  'An adult can be an Associate Member');

-- Sign-ups under 18.
select throws_ok(
  $$ insert into auth.users (id, email, raw_user_meta_data, aud, role)
     values ('a1000000-0000-0000-0000-000000000003', 'staff.young@auib.edu.iq',
       '{"adult":"false"}', 'authenticated', 'authenticated') $$,
  '42501', 'minor_associate', 'Under 18, not with a staff address');
select throws_ok(
  $$ insert into auth.users (id, email, raw_user_meta_data, aud, role)
     values ('a1000000-0000-0000-0000-000000000004', 'young@example.com',
       '{"adult":"false"}', 'authenticated', 'authenticated') $$,
  '42501', 'minor_associate', 'nor with another address and no invitation');
select lives_ok(
  $$ insert into auth.users (id, email, raw_user_meta_data, aud, role)
     values ('a1000000-0000-0000-0000-000000000005', '2560105@auib.edu.iq',
       '{"adult":"false"}', 'authenticated', 'authenticated') $$,
  'A student under 18 signs up with their AUIB address');
select lives_ok(
  $$ insert into auth.users (id, email, raw_user_meta_data, aud, role)
     values ('a1000000-0000-0000-0000-000000000006', 'grown@example.com',
       '{}', 'authenticated', 'authenticated') $$,
  'An adult signs up with any address');

select * from finish();
rollback;
