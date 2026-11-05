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

select plan(4);

select ok(
  (select is_council and requires_mfa from access.roles where key = 'eic'),
  'the Editor-in-Chief sits on the Council, with two-step sign-in'
);
select is_empty(
  $$ select 1 from access.role_assignments
     where role = 'director' and title_en = 'Editor of Qirtas'
       and (ends_at is null or ends_at > now()) $$,
  'nobody holds the retired Editor of Qirtas seat'
);

select pg_temp.make_user('00000000-0000-0000-0000-0000000e7001', 'chief.e7@auib.edu.iq', 'Chief');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000e7001', 'eic');
select ok(
  exists (select 1 from governance.council_members() c
          where 'Editor-in-Chief' = any(c.titles_en)),
  'the Council page names the Editor-in-Chief'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000e7001', '{"aal":"aal1"}');
select ok(
  not (select access.has_permission('journal.publish')),
  'and the seat counts only after two-step sign-in'
);

select * from finish();
rollback;
