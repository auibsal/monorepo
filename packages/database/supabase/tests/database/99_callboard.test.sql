-- The Callboard: openings, replies, and skills on shifts.
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

select pg_temp.make_user('00000000-0000-0000-0000-0000000070a1', 'volunteer@auib.edu.iq', 'Volunteer');
select pg_temp.make_user('00000000-0000-0000-0000-0000000070a2', 'stage.lead@auib.edu.iq', 'Stage Lead');
select pg_temp.make_user('00000000-0000-0000-0000-0000000070a3', 'outsider@example.com', 'Outsider');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000070a2', 'programme_lead', 'programme',
  (select id from core.programmes where slug = 'company'));

-- Openings
select pg_temp.login_as('00000000-0000-0000-0000-0000000070a1');
select throws_ok(
  $$ insert into programmes.openings (programme_id, title_en, title_ar)
     values ((select id from core.programmes where slug = 'company'), 'Photographer', 'مصوّر') $$,
  '42501', null, 'Members do not post openings'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000070a2');
select lives_ok(
  $$ insert into programmes.openings (id, programme_id, title_en, title_ar, skills)
     values ('0be00000-0000-0000-0000-0000000070b1', (select id from core.programmes where slug = 'company'),
       'Photographer', 'مصوّر', array['photography']) $$,
  'A program''s managers post openings'
);
select throws_ok(
  $$ insert into programmes.openings (programme_id, title_en, title_ar, skills)
     values ((select id from core.programmes where slug = 'company'), 'Juggler', 'مهرّج', array['juggling']) $$,
  '23514', null, 'Skills come from the Profile list'
);
select throws_ok(
  $$ insert into programmes.openings (programme_id, title_en, title_ar)
     values ((select id from core.programmes where slug = 'majlis'), 'Host', 'مضيف') $$,
  '42501', null, 'but only for their own program'
);
insert into programmes.openings (id, programme_id, title_en, title_ar, is_open)
values ('0be00000-0000-0000-0000-0000000070b2', (select id from core.programmes where slug = 'company'),
  'Closed role', 'دور مغلق', false);

select pg_temp.login_as('00000000-0000-0000-0000-0000000070a1');
select is((select count(*)::integer from programmes.openings), 1, 'Members see open openings only');
select lives_ok(
  $$ insert into programmes.opening_replies (opening_id, note)
     values ('0be00000-0000-0000-0000-0000000070b1', 'I have a camera') $$,
  'A member says they are interested'
);
select throws_ok(
  $$ insert into programmes.opening_replies (opening_id) values ('0be00000-0000-0000-0000-0000000070b2') $$,
  '42501', null, 'but not in a closed opening'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000070a3', '{"aal":"aal1"}');
select is((select count(*)::integer from programmes.openings), 0, 'Accounts that are not members see no openings');

select pg_temp.login_as('00000000-0000-0000-0000-0000000070a2');
select is((select note from programmes.opening_replies), 'I have a camera', 'The program''s managers read the replies');

select pg_temp.logout();
select ok(
  exists (select 1 from core.outbox o where o.kind = 'programmes.opening_reply'
    and o.payload->>'opening_id' = '0be00000-0000-0000-0000-0000000070b1'),
  'and are told of each one'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000070a1');
select lives_ok(
  $$ delete from programmes.opening_replies where opening_id = '0be00000-0000-0000-0000-0000000070b1' $$,
  'A member takes their reply back'
);

-- Skills on shifts
select pg_temp.logout();
insert into programmes.rotas (id, programme_id, title_en, title_ar)
values ('0be00000-0000-0000-0000-0000000070c1', (select id from core.programmes where slug = 'company'),
  'Door rota', 'مناوبة الباب');
select throws_ok(
  $$ insert into programmes.shifts (rota_id, role_en, role_ar, starts_at, ends_at, skills)
     values ('0be00000-0000-0000-0000-0000000070c1', 'Door', 'الباب', now() + interval '1 day',
       now() + interval '1 day 2 hours', array['nonsense']) $$,
  '23514', null, 'Shifts take skills from the same list'
);

select * from finish();
rollback;
