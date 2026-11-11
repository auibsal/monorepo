-- Names may be shared, preferred names, and the public forms' rate limit
-- (migration 20261101001500).
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

select plan(6);

select pg_temp.make_user('00000000-0000-0000-0000-00000000b1a1', 'one-a@auib.edu.iq', 'One A');
select pg_temp.make_user('00000000-0000-0000-0000-00000000b1a2', 'one-b@auib.edu.iq', 'One B');

select pg_temp.login_as('00000000-0000-0000-0000-00000000b1a1');
select lives_ok(
  $$ update core.profiles set first_name_en = 'Omar', father_name_en = 'Ali',
       grandfather_name_en = 'Hassan', last_name_en = 'Kareem'
     where id = '00000000-0000-0000-0000-00000000b1a1' $$,
  'A member gives their full name');

-- Two people may share a name (decisions.md, Members): no uniqueness rule.
select pg_temp.login_as('00000000-0000-0000-0000-00000000b1a2');
select lives_ok(
  $$ update core.profiles set first_name_en = 'Omar', father_name_en = 'Ali',
       grandfather_name_en = 'Hassan', last_name_en = 'Kareem'
     where id = '00000000-0000-0000-0000-00000000b1a2' $$,
  'Another account may have the same four parts');

-- A preferred name is the one shown.
select lives_ok(
  $$ update core.profiles set preferred_name_en = 'Omi Kareem'
     where id = '00000000-0000-0000-0000-00000000b1a2' $$,
  'A member gives a preferred name');
select is(
  (select full_name_en from core.profiles where id = '00000000-0000-0000-0000-00000000b1a2'),
  'Omi Kareem', 'and it is the name shown');

-- The public forms' rate limit (service role only).
select pg_temp.logout();
select is(
  (select array_agg(core.take_rate('test-bucket', 2, 600) order by n) from generate_series(1, 3) n),
  array[true, true, false],
  'The rate limit lets two through and refuses the third');
select pg_temp.login_anon();
select throws_ok($$ select core.take_rate('x', 1, 60) $$, '42501', null,
  'Visitors cannot call the rate limit');

select * from finish();
rollback;
