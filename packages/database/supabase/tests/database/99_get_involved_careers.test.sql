-- The GetInvolved as the careers page: the Apprenticeship and First Ink
-- (migration 20261029000700), and the Director of Programs (20261029000800).
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
select plan(9);

-- Get involved lists open roles only (owner, Nov 7, 2026): team roles,
-- event teams and Qalam mentors, with the Company's auditions beside them.
select pg_temp.make_user('00000000-0000-0000-0000-0000000067a4', 'president-gi@auib.edu.iq', 'The President');
select pg_temp.make_user('00000000-0000-0000-0000-0000000067a5', 'eic-gi@auib.edu.iq', 'The Editor');
select pg_temp.make_user('00000000-0000-0000-0000-0000000067a6', 'member-gi@auib.edu.iq', 'A Member');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000067a4', 'president');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000067a5', 'eic');

insert into events.events (id, slug, title_en, title_ar, starts_at, status, members_only, entry)
values ('00000000-0000-0000-0000-0000000067e1', 'a-reading-gi', 'A reading', 'قراءة',
  now() + interval '10 days', 'published', false, 'open');

select ok(
  not exists (select 1 from pg_class where relname in ('placements', 'rotas') and relnamespace = 'programmes'::regnamespace),
  'No placements and no rotas: the Apprenticeship and First Ink are retired'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000067a4');
select lives_ok(
  $$ insert into programmes.openings (id, kind, owner, event_id, title_en, title_ar, places)
     values ('00000000-0000-0000-0000-0000000067b1', 'event_team', 'program',
       '00000000-0000-0000-0000-0000000067e1', 'Door team', 'فريق الباب', 3) $$,
  'The President posts a place on an event''s team'
);
select throws_ok(
  $$ insert into programmes.openings (kind, owner, title_en, title_ar)
     values ('event_team', 'program', 'No event', 'بلا فعالية') $$,
  '23514', null, 'An event team names its event'
);
select throws_ok(
  $$ insert into programmes.openings (kind, owner, title_en, title_ar)
     values ('apprenticeship', 'program', 'Old kind', 'نوع قديم') $$,
  '23514', null, 'The retired kinds are refused'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000067a5');
select lives_ok(
  $$ insert into programmes.openings (id, kind, owner, title_en, title_ar, places)
     values ('00000000-0000-0000-0000-0000000067b2', 'qalam_mentor', 'qirtas',
       'Qalam mentor', 'مرشد «قلم»', 4) $$,
  'The Editor-in-Chief posts Qalam mentor places'
);

select pg_temp.login_anon();
select is(
  (select array_agg(kind order by kind) from programmes.open_places()
   where id in ('00000000-0000-0000-0000-0000000067b1', '00000000-0000-0000-0000-0000000067b2')),
  array['event_team', 'qalam_mentor'],
  'Visitors read the open places on Get involved'
);
select is(
  (select event_slug from programmes.open_places() where id = '00000000-0000-0000-0000-0000000067b1'),
  'a-reading-gi',
  'An event team links to its event'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000067a6');
select lives_ok(
  $$ insert into programmes.opening_replies (opening_id, user_id)
     values ('00000000-0000-0000-0000-0000000067b1', auth.uid()) $$,
  'A member says they''re interested'
);
select ok(
  not exists (select 1 from access.role_permissions
    where role in ('eic', 'artistic_director', 'media_director', 'vice_president', 'general_secretary')
      and permission in ('programs.manage', 'events.manage')),
  'No other Council seat manages events'
);

select * from finish();
rollback;
