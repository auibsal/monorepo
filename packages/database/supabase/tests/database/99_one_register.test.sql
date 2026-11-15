-- One register for every organization, and who an event is with:
-- co-sponsors and sponsors in kind picked from it.
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

select plan(11);

select pg_temp.make_user('00000000-0000-0000-0000-00000000f5a1', 'partners-s@auib.edu.iq', 'Partners');
select pg_temp.make_user('00000000-0000-0000-0000-00000000f5a2', 'member-s@auib.edu.iq', 'Member');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000f5a1', 'partnerships_director');

select is((select count(*)::integer from governance.partners where relation = 'campus'), 6,
  'The five offices and the American Space are campus partners');
select is((select relation from governance.partners where slug = 'iraqi-independent-film-centre'), 'sponsor',
  'The Iraqi Independent Film Centre is a sponsor in kind');

select pg_temp.login_anon();
select is((select count(*)::integer from governance.public_partners() where relation = 'campus'), 6,
  'Visitors see the campus partners on the partners page');
select is((select count(*)::integer from governance.public_partners() where relation = 'sponsor'), 0,
  'but not sponsors in kind, who appear on their events only');

select pg_temp.login_as('00000000-0000-0000-0000-00000000f5a2');
select is_empty(
  $$ update governance.partners set name_en = 'Changed' where slug = 'auib-library' returning 1 $$,
  'Members do not edit the register');
select pg_temp.logout();
select is((select name_en from governance.partners where slug = 'auib-library'), 'AUIB Library',
  'and the entry stays as it was');

select pg_temp.login_as('00000000-0000-0000-0000-00000000f5a1');
select lives_ok(
  $$ update governance.partners set name_en = 'AUIB Library and Archives', description_en = 'Books.'
     where slug = 'auib-library' $$,
  'Partnerships edits any entry');

-- An event, and who it is with.
select pg_temp.logout();
insert into events.events (id, slug, title_en, title_ar, starts_at, status)
values ('00000000-0000-0000-0000-00000000f5e1', 'register-test-event', 'Test', 'تجربة', now() + interval '3 days', 'published');
insert into events.event_organizations (event_id, partner_id, line)
select '00000000-0000-0000-0000-00000000f5e1', id, 'cosponsor' from governance.partners where slug = 'office-of-student-life';
insert into events.event_organizations (event_id, partner_id, line)
select '00000000-0000-0000-0000-00000000f5e1', id, 'thanks' from governance.partners where slug = 'iraqi-independent-film-centre';

select throws_ok(
  $$ insert into events.event_organizations (event_id, partner_id, line)
     select '00000000-0000-0000-0000-00000000f5e1', id, 'thanks' from governance.partners where slug = 'auib' $$,
  '22023', 'wrong_line', 'A campus partner is a co-sponsor, never thanked as a sponsor in kind');

select pg_temp.login_anon();
select results_eq(
  $$ select line, slug from events.event_organizations('register-test-event') $$,
  $$ values ('cosponsor', 'office-of-student-life'), ('thanks', 'iraqi-independent-film-centre') $$,
  'The event page shows its co-sponsors and its sponsors in kind');

select pg_temp.login_as('00000000-0000-0000-0000-00000000f5a2');
select is_empty(
  $$ delete from events.event_organizations where event_id = '00000000-0000-0000-0000-00000000f5e1' returning 1 $$,
  'Only the event''s managers change who it is with');

select pg_temp.logout();
select is((select count(*)::integer from events.event_organizations where event_id = '00000000-0000-0000-0000-00000000f5e1'), 2,
  'and nothing was removed');

select * from finish();
rollback;
