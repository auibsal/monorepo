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

-- An officer who manages members corrects a member's name to the one on
-- their papers (decisions.md); the member's own edits are unchanged.

select plan(9);

select pg_temp.make_user('00000000-0000-0000-0000-0000000072a1', 'director@auib.edu.iq', 'Membership Director');
select pg_temp.make_user('00000000-0000-0000-0000-0000000072a2', 'member@auib.edu.iq', 'Some Member');
update core.profiles set name_confirmed_at = now() where id = '00000000-0000-0000-0000-0000000072a2';
select pg_temp.make_user('00000000-0000-0000-0000-0000000072a3', 'other@auib.edu.iq', 'Other Member');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000072a1', 'membership_director');

-- Not someone without members.manage, even a member themselves.
select pg_temp.login_as('00000000-0000-0000-0000-0000000072a3');
select throws_ok($$ select membership.correct_name('00000000-0000-0000-0000-0000000072a2',
  'A', 'B', 'C', 'D', 'أ', 'ب', 'ج', 'د', 'Papers') $$,
  '42501', null, 'Only an officer who manages members corrects a name');
select pg_temp.logout();

select pg_temp.login_as('00000000-0000-0000-0000-0000000072a1');
select throws_ok($$ select membership.correct_name('00000000-0000-0000-0000-0000000072a2',
  'Mariam', 'Tariq', ' ', 'Jabbir', 'مريم', 'طارق', 'زياد', 'جابر', 'Papers') $$,
  '22023', 'name_parts_required', 'Every part is required');
select lives_ok($$ select membership.correct_name('00000000-0000-0000-0000-0000000072a2',
  ' Mariam ', 'Tariq', 'Ziyad', 'Jabbir', 'مريم', 'طارق', 'زياد', 'جابر', 'As on the passport') $$,
  'The officer corrects the name');
select pg_temp.logout();

select is((select first_name_en || ' ' || last_name_en from core.profiles where id = '00000000-0000-0000-0000-0000000072a2'),
  'Mariam Jabbir', 'The parts are saved, trimmed');
select is((select full_name_en from core.profiles where id = '00000000-0000-0000-0000-0000000072a2'),
  'Mariam Tariq', 'The name shown follows: given and father''s');
select is((select full_name_ar from core.profiles where id = '00000000-0000-0000-0000-0000000072a2'),
  'مريم طارق', 'in Arabic too');
select ok((select changed @> array['last_name_en', 'first_name_ar'] from core.activity_log
  where table_name = 'profiles' and row_id = '00000000-0000-0000-0000-0000000072a2'
  order by id desc limit 1), 'The activity log keeps which parts changed');
select ok((select not (new_row::text like '%Jabbir%' or old_row::text like '%Some%' or new_row->>'reason' <> 'As on the passport') from core.activity_log
  where table_name = 'profiles' and row_id = '00000000-0000-0000-0000-0000000072a2'
  order by id desc limit 1), 'and the reason, never the names');
select throws_ok($$ select private.correct_member_name('00000000-0000-0000-0000-0000000072a2',
  'A', 'B', 'C', 'D', 'أ', 'ب', 'ج', 'د', 'Papers') $$,
  '42501', null, 'No one signed in corrects anything');

select * from finish();
rollback;
