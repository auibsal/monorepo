-- The Callboard as the careers page: the Apprenticeship and First Ink
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
select plan(13);

-- Qirtas's own program row is unpublished, so its id is read here.
create temp table qirtas on commit drop as select id from core.programmes where slug = 'waraq';
grant select on qirtas to public;

select pg_temp.make_user('00000000-0000-0000-0000-0000000067a1', 'qirtas.lead@auib.edu.iq', 'Qirtas Lead');
select pg_temp.make_user('00000000-0000-0000-0000-0000000067a2', 'apprentice@auib.edu.iq', 'Apprentice');
select pg_temp.make_user('00000000-0000-0000-0000-0000000067a3', 'second@auib.edu.iq', 'Second');
select pg_temp.make_user('00000000-0000-0000-0000-0000000067a4', 'programs@auib.edu.iq', 'Programs Director');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000067a1', 'programme_lead', 'programme',
  (select id from qirtas));
select pg_temp.grant_role('00000000-0000-0000-0000-0000000067a4', 'programs_director');

insert into governance.partners (id, slug, name_en, kind, status)
values ('00000000-0000-0000-0000-0000000067f1', 'a-high-school', 'A High School', 'other', 'active');

select pg_temp.login_as('00000000-0000-0000-0000-0000000067a1');
select lives_ok(
  $$ insert into programmes.openings (id, kind, programme_id, desk, title_en, title_ar, places, term_from, term_to)
     values ('00000000-0000-0000-0000-0000000067b1', 'apprenticeship',
       (select id from qirtas), 'news',
       'News apprentice', 'متدرّب في الأخبار', 1, current_date - 100, current_date + 20) $$,
  'A Qirtas section posts a one-term apprenticeship'
);
select throws_ok(
  $$ insert into programmes.openings (kind, programme_id, title_en, title_ar, term_from, term_to)
     values ('apprenticeship', (select id from qirtas),
       'Too long', 'طويل', current_date, current_date + 365) $$,
  '23514', null, 'An apprenticeship lasts one term'
);
select throws_ok(
  $$ insert into programmes.openings (kind, programme_id, title_en, title_ar)
     values ('first_ink', (select id from qirtas), 'Mentor', 'مرشد') $$,
  '23514', null, 'First Ink runs through a partner school'
);
select lives_ok(
  $$ insert into programmes.placements (id, opening_id, user_id, started_on)
     values ('00000000-0000-0000-0000-0000000067c1', '00000000-0000-0000-0000-0000000067b1',
       '00000000-0000-0000-0000-0000000067a2', current_date - 100) $$,
  'The section''s lead gives the place'
);
select throws_ok(
  $$ insert into programmes.placements (opening_id, user_id)
     values ('00000000-0000-0000-0000-0000000067b1', '00000000-0000-0000-0000-0000000067a3') $$,
  '23514', 'placements_full', 'No more places than offered'
);

-- A session, logged as a shift on the apprenticeship's rota.
insert into programmes.rotas (id, programme_id, opening_id, title_en, title_ar)
values ('00000000-0000-0000-0000-0000000067d1', (select id from qirtas),
  '00000000-0000-0000-0000-0000000067b1', 'Newsroom sessions', 'جلسات غرفة الأخبار');
select pg_temp.logout();
insert into programmes.shifts (id, rota_id, role_en, role_ar, starts_at, ends_at, capacity)
values ('00000000-0000-0000-0000-0000000067e1', '00000000-0000-0000-0000-0000000067d1', 'Session', 'جلسة',
  now() - interval '3 days', now() - interval '3 days' + interval '2 hours', 1);
insert into programmes.shift_signups (shift_id, user_id)
values ('00000000-0000-0000-0000-0000000067e1', '00000000-0000-0000-0000-0000000067a2');

select pg_temp.login_as('00000000-0000-0000-0000-0000000067a1');
select lives_ok(
  $$ select membership.record_shift_service('00000000-0000-0000-0000-0000000067e1',
       '00000000-0000-0000-0000-0000000067a2') $$,
  'The session counts as service'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000067a2');
select is((select status from programmes.placements where id = '00000000-0000-0000-0000-0000000067c1'),
  'active', 'The apprentice sees their place');
select throws_ok(
  $$ select programmes.complete_apprenticeship('00000000-0000-0000-0000-0000000067c1') $$,
  '42501', null, 'but does not complete it'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000067a1');
create temp table done on commit drop as
  select programmes.complete_apprenticeship('00000000-0000-0000-0000-0000000067c1') as certificate;
grant select on done to public;
select pg_temp.logout();
select is(
  (select kind || ' ' || role_en || ' ' || hours::text from membership.certificates
   where id = (select certificate from done)),
  'apprenticeship News apprentice 2.00',
  'At the end a certificate is drafted, with the hours given'
);
select is((select status from membership.certificates where id = (select certificate from done)),
  'draft', 'to be signed as every certificate');

-- First Ink
select pg_temp.login_as('00000000-0000-0000-0000-0000000067a4');
select lives_ok(
  $$ insert into programmes.openings (kind, programme_id, partner_id, title_en, title_ar)
     values ('first_ink', (select id from core.programmes where slug = 'open-pages'),
       '00000000-0000-0000-0000-0000000067f1', 'First Ink mentor', 'مرشد «الحبر الأول»') $$,
  'The Director of Programs posts a First Ink place for any program'
);
select ok(
  access.has_permission('programmes.manage', 'programme', (select id from core.programmes where slug = 'salon'))
  and access.has_permission('events.manage', 'programme', (select id from core.programmes where slug = 'company')),
  'and holds the program permissions for every program'
);
select ok(
  not exists (select 1 from access.role_permissions
    where role = 'director' and permission in ('programmes.manage', 'events.manage')),
  'Other directors do not manage programs'
);

select * from finish();
rollback;
