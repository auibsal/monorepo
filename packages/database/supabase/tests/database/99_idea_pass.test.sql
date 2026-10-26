-- The IDEA Pass links (migration 20261026000000).
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
select plan(12);

select pg_temp.make_user('00000000-0000-0000-0000-0000000000a1', 'student@auib.edu.iq', 'Student');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a2', 'guest@example.com', 'Guest');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a3', 'other@auib.edu.iq', 'Other');

-- Only the API (the secret key) can call these.
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$ select access.pass_account('pass-1', null, 'student@auib.edu.iq') $$,
  '42501', null, 'members cannot match a Pass themselves'
);
select throws_ok(
  $$ select access.pass_link('pass-1', '00000000-0000-0000-0000-0000000000a1') $$,
  '42501', null, 'members cannot link a Pass themselves'
);
select pg_temp.logout();

set local role service_role;
select is(
  access.pass_account('pass-1', 'someone@gmail.com', 'Student@AUIB.edu.iq'),
  '00000000-0000-0000-0000-0000000000a1'::uuid,
  'the AUIB address the Pass checked finds the member'
);
select is(
  access.pass_account('pass-1', null, null),
  '00000000-0000-0000-0000-0000000000a1'::uuid,
  'then the link finds them, whatever the addresses'
);
select is(
  access.pass_account('pass-2', 'guest@example.com', null),
  '00000000-0000-0000-0000-0000000000a2'::uuid,
  'the Pass''s verified address finds an account outside AUIB'
);
select is(
  access.pass_account('pass-3', 'new@gmail.com', null),
  null,
  'no account: nothing is made here'
);
select throws_ok(
  $$ select access.pass_account('pass-4', null, 'student@auib.edu.iq') $$,
  '23505', null, 'an account linked to one Pass is not taken by another'
);
select lives_ok(
  $$ select access.pass_link('pass-3', '00000000-0000-0000-0000-0000000000a3') $$,
  'a Pass links to an account signed in to the old way'
);
select throws_ok(
  $$ select access.pass_link('pass-3', '00000000-0000-0000-0000-0000000000a2') $$,
  '23505', null, 'a Pass links to one account only'
);
select is(
  (select count(*)::int from access.pass_links),
  3,
  'three links'
);
reset role;

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select is(
  (select array_agg(pass_sub) from access.pass_links),
  array['pass-1'],
  'a member reads only their own link'
);
select throws_ok(
  $$ insert into access.pass_links (user_id, pass_sub) values ('00000000-0000-0000-0000-0000000000a1', 'mine') $$,
  '42501', null, 'members cannot write links'
);
select pg_temp.logout();

select * from finish();
rollback;
