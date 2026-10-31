-- Hiring (migration 20261030000300): Membership runs every role's
-- applications; the owner of the role picks the person.
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

select plan(16);

select pg_temp.make_user('00000000-0000-0000-0000-00000000d1a1', 'gs-h@auib.edu.iq', 'General Secretary');
select pg_temp.make_user('00000000-0000-0000-0000-00000000d1a2', 'editor-h@auib.edu.iq', 'Editor');
select pg_temp.make_user('00000000-0000-0000-0000-00000000d1a3', 'applicant-h@auib.edu.iq', 'Applicant');
select pg_temp.make_user('00000000-0000-0000-0000-00000000d1a4', 'lead-h@auib.edu.iq', 'Salon Lead');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000d1a1', 'general_secretary');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000d1a2', 'eic');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000d1a4', 'programme_lead', 'programme',
  (select id from core.programmes where slug = 'salon'));

select pg_temp.logout();
select set_eq(
  $$ select title_en from programmes.openings where owner = 'qirtas' $$,
  $$ values ('News Editor'), ('Voices Editor'), ('Video Editor'), ('Games Editor'),
     ('Producer, Next Stop'), ('Awards Coordinator') $$,
  'The open masthead seats are on the Callboard'
);
create function pg_temp.seat(t text) returns uuid language sql as $$
  select id from programmes.openings where title_en = t;
$$;
grant execute on function pg_temp.seat(text) to public;

select pg_temp.login_as('00000000-0000-0000-0000-00000000d1a3');
select lives_ok(
  $$ insert into programmes.opening_replies (opening_id) values (pg_temp.seat('Games Editor')) $$,
  'A member applies'
);
update programmes.opening_replies set status = 'picked' where opening_id = pg_temp.seat('Games Editor');
select is(
  (select status from programmes.opening_replies where opening_id = pg_temp.seat('Games Editor')),
  'new', 'and cannot move their own application'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000d1a4');
select is(
  (select count(*)::integer from programmes.opening_replies where opening_id = pg_temp.seat('Games Editor')),
  0, 'Another owner does not see the application'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000d1a2');
select throws_ok(
  $$ update programmes.opening_replies set status = 'talking', talk_at = now() + interval '1 day'
     where opening_id = pg_temp.seat('Games Editor') $$,
  '42501', null, 'The owner does not schedule: Membership does'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000d1a1');
select lives_ok(
  $$ update programmes.opening_replies set status = 'talking', talk_at = now() + interval '1 day'
     where opening_id = pg_temp.seat('Games Editor') $$,
  'Membership schedules the conversation'
);
select throws_ok(
  $$ update programmes.opening_replies set status = 'offered' where opening_id = pg_temp.seat('Games Editor') $$,
  '22023', null, 'No offer before the owner picks'
);
select throws_ok(
  $$ update programmes.opening_replies set status = 'picked' where opening_id = pg_temp.seat('Games Editor') $$,
  '42501', null, 'Membership does not pick for the masthead'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000d1a2');
select lives_ok(
  $$ update programmes.opening_replies set status = 'picked' where opening_id = pg_temp.seat('Games Editor') $$,
  'The Editor picks the masthead'
);
select is(
  (select picked_by from programmes.opening_replies where opening_id = pg_temp.seat('Games Editor')),
  '00000000-0000-0000-0000-00000000d1a2'::uuid, 'and the pick is signed'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000d1a1');
select lives_ok(
  $$ update programmes.opening_replies set status = 'offered' where opening_id = pg_temp.seat('Games Editor') $$,
  'Membership makes the offer'
);
select lives_ok(
  $$ insert into programmes.openings (kind, role, title_en, title_ar) values ('role', 'photo_video_lead', '', '') $$,
  'Membership posts a role for any owner'
);

-- Every Society role (owner, Oct 31, 2026): an opening names its role,
-- the role decides who picks, and whoever is onboarded holds it.
select is(
  (select role from programmes.openings where title_en = 'Games Editor'),
  'games_editor', 'The masthead seats already posted name their role'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000d1a1');
insert into programmes.openings (id, kind, role, title_en, title_ar)
values ('00000000-0000-0000-0000-00000000d1b9', 'role', 'onboarding_lead', '', '');
select is(
  (select owner || ' / ' || title_en from programmes.openings where id = '00000000-0000-0000-0000-00000000d1b9'),
  'membership / Onboarding Lead', 'A role opening takes its owner and title from the role'
);
select throws_ok(
  $$ insert into programmes.openings (kind, role, title_en, title_ar) values ('role', 'president', '', '') $$,
  '22023', null, 'Elected roles are not posted on the Callboard'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000d1a3');
insert into programmes.opening_replies (opening_id) values ('00000000-0000-0000-0000-00000000d1b9');
select pg_temp.login_as('00000000-0000-0000-0000-00000000d1a1');
update programmes.opening_replies set status = 'picked'
where opening_id = '00000000-0000-0000-0000-00000000d1b9';
update programmes.opening_replies set status = 'offered'
where opening_id = '00000000-0000-0000-0000-00000000d1b9';
update programmes.opening_replies set status = 'onboarded'
where opening_id = '00000000-0000-0000-0000-00000000d1b9';
select pg_temp.logout();
select ok(
  exists (select 1 from access.role_assignments
    where user_id = '00000000-0000-0000-0000-00000000d1a3' and role = 'onboarding_lead'),
  'Whoever is onboarded holds the role'
);

select * from finish();
rollback;
