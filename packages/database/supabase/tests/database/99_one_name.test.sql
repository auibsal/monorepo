-- One person, one name, and the public forms' rate limit
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
-- </preamble>

select plan(7);

select pg_temp.make_user('00000000-0000-0000-0000-00000000b1a1', 'one-a@auib.edu.iq', 'One A');
select pg_temp.make_user('00000000-0000-0000-0000-00000000b1a2', 'one-b@auib.edu.iq', 'One B');

select pg_temp.login_as('00000000-0000-0000-0000-00000000b1a1');
select lives_ok(
  $$ update core.profiles set first_name_en = 'Shaheen', father_name_en = 'Karam',
       grandfather_name_en = 'Muwafaq', last_name_en = 'Farjo'
     where id = '00000000-0000-0000-0000-00000000b1a1' $$,
  'A member gives their full name');

select pg_temp.login_as('00000000-0000-0000-0000-00000000b1a2');
select throws_ok(
  $$ update core.profiles set first_name_en = ' shaheen ', father_name_en = 'Karam',
       grandfather_name_en = 'Muwafaq', last_name_en = 'FARJO'
     where id = '00000000-0000-0000-0000-00000000b1a2' $$,
  '23505', 'name_taken',
  'Another account cannot take the same four parts, whatever the case or spacing');
select lives_ok(
  $$ update core.profiles set first_name_en = 'Shaheen', father_name_en = 'Karam',
       grandfather_name_en = 'Muwafaq', last_name_en = 'Farjo-Ali'
     where id = '00000000-0000-0000-0000-00000000b1a2' $$,
  'A different fourth name is another person');

select pg_temp.login_as('00000000-0000-0000-0000-00000000b1a1');
select lives_ok(
  $$ update core.profiles set camera_shy = true where id = '00000000-0000-0000-0000-00000000b1a1' $$,
  'Saving anything else never trips the rule');

-- A name shared before the rule stays, and can still save other things.
select pg_temp.logout();
alter table core.profiles disable trigger one_person_one_name;
update core.profiles set first_name_en = 'Shaheen', father_name_en = 'Karam',
  grandfather_name_en = 'Muwafaq', last_name_en = 'Farjo'
  where id = '00000000-0000-0000-0000-00000000b1a2';
alter table core.profiles enable trigger one_person_one_name;
select pg_temp.login_as('00000000-0000-0000-0000-00000000b1a2');
select lives_ok(
  $$ update core.profiles set first_name_en = 'Shaheen', camera_shy = true
     where id = '00000000-0000-0000-0000-00000000b1a2' $$,
  'An older shared name can still save the rest');

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
