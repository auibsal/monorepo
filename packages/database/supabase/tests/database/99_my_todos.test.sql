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
select plan(9);

-- decisions.md, To-dos: worked out from state, cleared when done, never
-- twice, and the count is the list.
select pg_temp.make_user('00000000-0000-0000-0000-0000000ac001', 'holder@auib.edu.iq', 'Role Holder');
update core.profiles set first_name_en = null, father_name_en = null, grandfather_name_en = null,
  last_name_en = null where id = '00000000-0000-0000-0000-0000000ac001';
insert into access.role_assignments (id, user_id, role, scope_type)
values ('00000000-0000-0000-0000-0000000ac0a1', '00000000-0000-0000-0000-0000000ac001', 'web_lead', 'global');

select pg_temp.login_as('00000000-0000-0000-0000-0000000ac001');
select ok(exists (select 1 from core.my_todos() where kind = 'name'),
  'A name not yet in four parts is a to-do');
select ok(exists (select 1 from core.my_todos() where kind = 'arabic_form'),
  'So is the Arabic form of address');
select ok(exists (select 1 from access.my_role_checklist() where step = 'pledge' and not done),
  'A new role''s agreement is a step of its first steps');
select is((select count(*)::int from core.my_todos() where kind = 'role_steps'
  and ref = '00000000-0000-0000-0000-0000000ac0a1'), 1,
  'A role''s first steps are one to-do');
select is(
  (select count(*)::int from (select distinct kind, ref from core.my_todos()) d),
  (select count(*)::int from core.my_todos()),
  'No to-do appears twice'
);

select pg_temp.logout();
update core.profiles set first_name_en = 'Rana', father_name_en = 'Ali', grandfather_name_en = 'Hasan',
  first_name_ar = 'رنا', father_name_ar = 'علي', grandfather_name_ar = 'حسن'
  where id = '00000000-0000-0000-0000-0000000ac001';
select pg_temp.login_as('00000000-0000-0000-0000-0000000ac001');
select ok(not exists (select 1 from core.my_todos() where kind = 'name'),
  'The name to-do clears once the name is complete');

select core.update_my_profile('{"title_form": "feminine"}'::jsonb);
select ok(not exists (select 1 from core.my_todos() where kind = 'arabic_form'),
  'The form-of-address to-do clears once chosen');

select access.sign_role_agreement('00000000-0000-0000-0000-0000000ac0a1');
select ok(not exists (select 1 from access.my_role_checklist() where step = 'pledge' and not done),
  'The signing step clears once signed');
-- A role held before the agreement was introduced: its own to-do, once.
select pg_temp.logout();
insert into access.role_assignments (id, user_id, role, scope_type, starts_at)
values ('00000000-0000-0000-0000-0000000ac0a2', '00000000-0000-0000-0000-0000000ac001', 'events_director', 'global',
  now() - interval '200 days');
select pg_temp.login_as('00000000-0000-0000-0000-0000000ac001');
select ok(exists (select 1 from core.my_todos() where kind = 'role_agreement'
  and ref = '00000000-0000-0000-0000-0000000ac0a2'), 'An older role''s agreement is its own to-do, once');

select * from finish();
rollback;
