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

-- The forms register and F-04, the new role holder's checklist
-- (decisions.md, Forms).

select plan(10);

select is((select count(*)::integer from governance.form_types), 42,
  'Agreements and consents: 42 kinds, by name');
select is((select count(*)::integer from governance.form_types where legacy_number in ('F-08', 'F-22', 'F-31', 'F-44')), 0,
  'The numbers retired before have no kind');
select is((select title_en from governance.form_types where key = 'role-holder-checklist'), 'New role holder’s checklist',
  'The role holder''s checklist goes by its name');

select pg_temp.make_user('00000000-0000-0000-0000-0000000c4101', 'new@auib.edu.iq', 'New Holder');
select pg_temp.make_user('00000000-0000-0000-0000-0000000c4102', 'other@auib.edu.iq', 'Someone Else');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000c4101', 'design_lead');

select pg_temp.login_as('00000000-0000-0000-0000-0000000c4101');
select is((select count(*)::integer from access.my_role_checklist()), 7,
  'A team role''s checklist has seven steps (no seat mailbox or Notion step)');
select ok((select done from access.my_role_checklist() where step = 'email'),
  'The role email is done when the role is given');
select ok(not (select done from access.my_role_checklist() where step = 'handover'),
  'The handover waits for the holder');
select ok(access.tick_role_step((select assignment_id from access.my_role_checklist() limit 1), 'handover'),
  'The holder ticks the handover');
select ok((select done from access.my_role_checklist() where step = 'handover'), 'and it shows as done');
select throws_ok(
  $$ select access.tick_role_step((select assignment_id from access.my_role_checklist() limit 1), 'two_step') $$,
  '22023', null, 'Steps the site sees are never ticked by hand'
);

create temp table mine as select assignment_id from access.my_role_checklist() limit 1;
grant select on mine to authenticated;
select pg_temp.login_as('00000000-0000-0000-0000-0000000c4102');
select throws_ok($$ select access.tick_role_step((select assignment_id from mine), 'pages') $$,
  '42501', null, 'No one else ticks a holder''s steps');

select * from finish();
rollback;
