-- Two-step from Nov 22 and passkeys (migration 20261113000200).
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

select plan(7);

select is(
  (select requires_mfa_from from access.roles where key = 'tour_lead'),
  '2026-11-22 00:00:00+03'::timestamptz,
  'A role that sees personal data needs two-step from Sunday, November 22'
);
select is(
  (select requires_mfa_from from access.roles where key = 'actor'),
  null,
  'A role that sees no personal data keeps it optional'
);

select pg_temp.make_user('00000000-0000-0000-0000-0000000075a1', 'ts-a@auib.edu.iq');

select pg_temp.login_as('00000000-0000-0000-0000-0000000075a1',
  '{"aal":"aal1","amr":[{"method":"password","timestamp":1}]}');
select is(private.session_two_step(), false, 'A password alone is one step');

select pg_temp.login_as('00000000-0000-0000-0000-0000000075a1',
  '{"aal":"aal1","amr":[{"method":"passkey","timestamp":1}]}');
select is(private.session_two_step(), true, 'A passkey sign-in is two steps on its own');
select pg_temp.logout();

-- A role whose date is ahead: the person is told when.
update access.roles set requires_mfa = false, requires_mfa_from = now() + interval '3 days'
where key = 'tour_lead';
select pg_temp.grant_role('00000000-0000-0000-0000-0000000075a1', 'tour_lead');
select pg_temp.login_as('00000000-0000-0000-0000-0000000075a1', '{"aal":"aal1"}');
select ok(access.two_step_from() > now(), 'Settings learns the date it starts');
select is(access.needs_two_step(), false, 'Not needed before the date');
select pg_temp.logout();

-- The date passes: the hourly job turns the requirement on.
update access.roles set requires_mfa_from = now() - interval '1 minute' where key = 'tour_lead';
select private.start_two_step_requirements();
select is((select requires_mfa from access.roles where key = 'tour_lead'), true,
  'From the date, the role needs two-step');

select * from finish();
rollback;
