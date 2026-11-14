-- Names (decisions.md, Members): the legal name in parts and in its script,
-- locked by the member; the preferred name per language; the name shown.
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

select plan(18);

-- These test the action itself; the second officer's approval is given
-- (99_two_officers tests asking and approving).
select set_config('sal.second_officer', 'on', true);

select pg_temp.make_user('00000000-0000-0000-0000-00000000c0a1', 'names-a@auib.edu.iq', 'Signup Name');
select pg_temp.make_user('00000000-0000-0000-0000-00000000c0a2', 'names-officer@auib.edu.iq', 'Officer');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000c0a2', 'membership_director');

select is(
  (select full_name_en from core.profiles where id = '00000000-0000-0000-0000-00000000c0a1'),
  'Signup Name', 'Until the legal name is complete, the name given at sign-up shows');

-- Sign-up and Membership write the parts (here as the database).
select pg_temp.logout();
select throws_ok(
  $$ update core.profiles set first_name_en = 'عمر' where id = '00000000-0000-0000-0000-00000000c0a1' $$,
  '22023', 'name_script_en', 'An English part in Arabic letters is refused');
select throws_ok(
  $$ update core.profiles set first_name_ar = 'Omar' where id = '00000000-0000-0000-0000-00000000c0a1' $$,
  '22023', 'name_script_ar', 'An Arabic part in Latin letters is refused');
select isnt((select legal_name_locked_at from core.profiles where id = '00000000-0000-0000-0000-00000000c0a1'),
  null, 'The official name is locked from sign-up, complete or not');

select lives_ok(
  $$ update core.profiles set first_name_en = 'Omar', father_name_en = 'Ali',
       grandfather_name_en = 'Hassan', last_name_en = null,
       first_name_ar = 'عمر', father_name_ar = 'علي', grandfather_name_ar = 'حسن'
     where id = '00000000-0000-0000-0000-00000000c0a1' $$,
  'A name with no family name is complete');
select is(
  (select full_name_en || ' / ' || full_name_ar from core.profiles where id = '00000000-0000-0000-0000-00000000c0a1'),
  'Omar Ali / عمر علي', 'The short form is the given and father''s names, in each language');

select pg_temp.login_as('00000000-0000-0000-0000-00000000c0a1');
select lives_ok(
  $$ update core.profiles set short_name = 'fourth' where id = '00000000-0000-0000-0000-00000000c0a1' $$,
  'A member chooses the given and family names instead');
select is(
  (select full_name_en || ' / ' || full_name_ar from core.profiles where id = '00000000-0000-0000-0000-00000000c0a1'),
  'Omar Ali / عمر علي', 'and with no family name the father''s name stays');
select throws_ok(
  $$ update core.profiles set short_name = 'nickname' where id = '00000000-0000-0000-0000-00000000c0a1' $$,
  '23514', null, 'There is no other short form');
select hasnt_column('core', 'profiles', 'preferred_name_en', 'There is no preferred name: the official name only');
select throws_ok(
  $$ update core.profiles set father_name_en = 'Alee' where id = '00000000-0000-0000-0000-00000000c0a1' $$,
  '42501', 'legal_name_locked', 'The member cannot change the official name');
select throws_ok(
  $$ update core.profiles set credited_name_en = 'Omi' where id = '00000000-0000-0000-0000-00000000c0a1' $$,
  '42501', null, 'nor set a credited name');
select hasnt_function('membership', 'reset_preferred_name', 'There is no preferred name to reset');

select pg_temp.login_as('00000000-0000-0000-0000-00000000c0a2');
select throws_ok(
  $$ select membership.correct_name('00000000-0000-0000-0000-00000000c0a1',
       'Omar', 'Aly', 'Hassan', null, 'عمر', 'علي', 'حسن', null, '') $$,
  '22023', 'reason_required', 'A correction needs a reason');
select lives_ok(
  $$ select membership.correct_name('00000000-0000-0000-0000-00000000c0a1',
       'Omar', 'Aly', 'Hassan', null, 'عمر', 'علي', 'حسن', null, 'As on the passport') $$,
  'The Director of Membership corrects the official name');
select throws_ok(
  $$ select programmes.set_credited_name('00000000-0000-0000-0000-00000000c0a1', 'Omi', null) $$,
  '42501', null, 'A credited name is set by Media or the Artistic Director, not Membership');

select pg_temp.logout();
select is(
  (select full_name_en || ' / ' || full_name_ar from core.profiles where id = '00000000-0000-0000-0000-00000000c0a1'),
  'Omar Aly / عمر علي', 'The name shown follows the correction');
update core.profiles set birth_year = extract(year from now())::int - 16, birth_month = 1
where id = '00000000-0000-0000-0000-00000000c0a1';
select is(
  (select full_name_en || ' / ' || full_name_ar from core.profiles where id = '00000000-0000-0000-0000-00000000c0a1'),
  'Omar A. / عمر ع.', 'Under 18, the first name and the father''s initial');

select * from finish();
rollback;
