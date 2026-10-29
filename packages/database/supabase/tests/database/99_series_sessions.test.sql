-- Programs as series in What's on (migration 20261025001100).
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

select pg_temp.make_user('00000000-0000-0000-0000-0000000000f1', 'founder@auib.edu.iq', 'Founder');
select access.bootstrap_founder('founder@auib.edu.iq');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a1', 'member@auib.edu.iq', 'Member');

select ok(
  exists (select 1 from core.programmes where slug = 'next-stop')
    and not exists (select 1 from core.programmes where slug = 'side-quest'),
  'Programs are addressed by the names people see');

select throws_ok(
  $$ insert into events.events (slug, title_en, title_ar, starts_at)
     values ('salon', 'X', 'س', now() + interval '1 day') $$,
  '23505', null, 'An event cannot take a program''s address');
select throws_ok(
  $$ insert into events.events (slug, title_en, title_ar, starts_at)
     values ('book', 'X', 'س', now() + interval '1 day') $$,
  '23505', null, 'nor the members'' calendar');

insert into events.events (slug, title_en, title_ar, starts_at)
  values ('poetry-at-dusk', 'X', 'س', now() + interval '1 day');
select throws_ok(
  $$ update core.programmes set slug = 'poetry-at-dusk' where slug = 'salon' $$,
  '23505', null, 'and a program cannot take an event''s');

-- A weekly rule, starting next week on today's weekday (Baghdad).
insert into events.series_rules (programme_id, first_on, start_time, venue_en, venue_ar)
select id, (now() at time zone 'Asia/Baghdad')::date + 7, '18:00', 'Library', 'المكتبة'
from core.programmes where slug = 'salon';

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select is((select count(*)::int from events.series_rules), 0,
  'Members do not see repeat rules');
select throws_ok(
  $$ select events.add_series_sessions(
       (select id from core.programmes where slug = 'salon'),
       ((now() at time zone 'Asia/Baghdad')::date + 35)) $$,
  '42501', null, 'nor add sessions');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000f1');
select is(
  events.add_series_sessions(
    (select id from core.programmes where slug = 'salon'),
    ((now() at time zone 'Asia/Baghdad')::date + 35)),
  5, 'Event managers add a session each week up to the date');
select is(
  (select count(*)::int from events.events e
   join core.programmes p on p.id = e.programme_id
   where p.slug = 'salon' and e.status = 'published' and e.entry = 'open'
     and e.venue_en = 'Library' and e.title_en = p.name_en
     and to_char(e.starts_at at time zone 'Asia/Baghdad', 'HH24:MI') = '18:00'),
  5, 'named after the program, at 6:00 PM Baghdad, in the library, open');
select is(
  events.add_series_sessions(
    (select id from core.programmes where slug = 'salon'),
    ((now() at time zone 'Asia/Baghdad')::date + 35)),
  0, 'Running it again adds nothing twice');

update events.series_rules set every_weeks = 2
where programme_id = (select id from core.programmes where slug = 'salon');
select is(
  events.add_series_sessions(
    (select id from core.programmes where slug = 'salon'),
    ((now() at time zone 'Asia/Baghdad')::date + 63)),
  2, 'Every other week, only the new dates are added');

select throws_ok(
  $$ select events.add_series_sessions(
       (select id from core.programmes where slug = 'open-pages'),
       ((now() at time zone 'Asia/Baghdad')::date + 35)) $$,
  'P0002', null, 'A program without a rule has nothing to add');
select throws_ok(
  $$ select events.add_series_sessions(
       (select id from core.programmes where slug = 'salon'),
       ((now() at time zone 'Asia/Baghdad')::date + 400)) $$,
  '22023', null, 'and at most a year at a time');

select * from finish();
rollback;
