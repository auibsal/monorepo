-- Guest accounts (owner, Nov 7, 2026; migration 20261107000300): anyone may
-- make one to book open events; a guest is never a member.
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

select plan(4);

create function pg_temp.outside_user(uid uuid, email text, meta jsonb)
returns void language plpgsql as $$
begin
  insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, aud, role)
  values (uid, email, null, meta || jsonb_build_object(
    'first_name_en', 'Visitor', 'father_name_en', 'Guestly', 'grandfather_name_en', 'Outside', 'last_name_en', right(uid::text, 4),
    'first_name_ar', 'زائر', 'father_name_ar', 'ضيف', 'grandfather_name_ar', 'خارج', 'last_name_ar', right(uid::text, 4)),
    'authenticated', 'authenticated');
end;
$$;
grant execute on all functions in schema pg_temp to public;

-- The gate the sign-up service runs (private.sign_up_allowed).
select ok(
  not private.sign_up_allowed('visitor@gmail.com', '{}'),
  'An outside address can''t sign up as a member'
);
select ok(
  private.sign_up_allowed('guest@gmail.com', '{"guest":"true"}'),
  'but anyone may make a guest account'
);
select pg_temp.outside_user('00000000-0000-0000-0000-0000000f2a02', 'guest@gmail.com', '{"guest":"true"}');
update auth.users set email_confirmed_at = now() where id = '00000000-0000-0000-0000-0000000f2a02';
select ok(
  exists (select 1 from membership.guests where user_id = '00000000-0000-0000-0000-0000000f2a02'),
  'Confirming the address makes them a guest'
);
select ok(
  not exists (select 1 from membership.memberships where user_id = '00000000-0000-0000-0000-0000000f2a02'),
  'never a member'
);

select * from finish();
rollback;
