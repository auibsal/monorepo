-- The Diwan, rebuilt (owner, Oct 30, 2026): terms come from the AUIB
-- calendar, a role runs for the Society's year unless ended, feature
-- switches and the Site section are gone, pledge versions are private.
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

delete from core.semesters;
insert into core.semesters (code, name_en, name_ar, starts_on, ends_on) values
  ('fall-2090', 'Fall 2090', 'خريف ٢٠٩٠', current_date - 30, current_date + 60),
  ('spring-2091', 'Spring 2091', 'ربيع ٢٠٩١', current_date + 90, current_date + 200);

select is((select code from core.current_term()), 'fall-2090', 'Today''s term comes from the semesters');
select is(private.year_end(),
  ((current_date + 201)::timestamp at time zone 'Asia/Baghdad'),
  'The Society''s year ends with the Spring semester');

select pg_temp.make_user('00000000-0000-0000-0000-0000000000d1', 'term1@auib.edu.iq');
insert into access.role_assignments (user_id, role) values ('00000000-0000-0000-0000-0000000000d1', 'photographer');
select is((select ends_at from access.role_assignments where user_id = '00000000-0000-0000-0000-0000000000d1'),
  private.year_end(), 'A role with no end runs to the end of the year');

insert into access.role_assignments (user_id, role, ends_at)
values ('00000000-0000-0000-0000-0000000000d1', 'communications_lead', now() + interval '10 days');
select ok((select ends_at < private.year_end() from access.role_assignments
  where user_id = '00000000-0000-0000-0000-0000000000d1' and role = 'communications_lead'),
  'An end given on purpose is kept');

select pg_temp.make_user('00000000-0000-0000-0000-0000000000d2', 'advisor@auib.edu.iq');
insert into access.role_assignments (user_id, role) values ('00000000-0000-0000-0000-0000000000d2', 'faculty_advisor');
select ok((select ends_at is null from access.role_assignments where user_id = '00000000-0000-0000-0000-0000000000d2'),
  'The Faculty Advisor serves until the role is ended');

select ok(exists (select 1 from governance.council_members() where 'Faculty Advisor' = any(titles_en)),
  'The Faculty Advisor is named with the Council, from the role');
select is((select count(*) from core.settings where key like 'society.faculty_advisor%')::integer, 0,
  'The advisor is not typed into a setting');

set local role service_role;
select lives_ok(
  $$ insert into access.role_assignments (user_id, role) values ('00000000-0000-0000-0000-0000000000d2', 'photographer') $$,
  'The platform assigns a role without reaching the private schema');
reset role;

select ok(private.elections_enabled(), 'Online elections are simply on');
select is((select count(*) from core.settings where key like 'features.elections')::integer, 0,
  'No elections switch is kept');

select pg_temp.login_anon();
select throws_ok($$ select * from core.pledge_versions() $$, '42501', null,
  'Visitors do not read pledge versions');
select pg_temp.login_as('00000000-0000-0000-0000-0000000000d1');
select is((select count(*) from core.pledge_versions())::integer, 3,
  'Members read the versions they are asked to accept');

select * from finish();
rollback;
