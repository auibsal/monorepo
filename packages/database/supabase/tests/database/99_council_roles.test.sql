-- Council roles (migration 20261030000800): a second Council role only with
-- an adopted Council resolution; the Artistic Director sits on the Council.
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
select plan(7);

select pg_temp.make_user('00000000-0000-0000-0000-0000000000f1', 'pres-cr@auib.edu.iq', 'The President');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a1', 'ad-cr@auib.edu.iq', 'The Artistic Director');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000000f1', 'president');

-- A resolution belongs to a meeting (its minutes).
insert into governance.minutes (id, body, meeting_on, title_en, text_en, status)
values ('00000000-0000-0000-0000-00000000e1ff', 'council', current_date, 'Council meeting', 'Minutes.', 'draft');
insert into governance.resolutions (id, code, title_en, text_en, status, adopted_on, minutes_id) values
  ('00000000-0000-0000-0000-00000000e101', 'R-2026-95', 'The President covers Programs', 'Agreed.', 'adopted', current_date, '00000000-0000-0000-0000-00000000e1ff'),
  ('00000000-0000-0000-0000-00000000e102', 'R-2026-96', 'A draft', 'Not yet.', 'draft', null, '00000000-0000-0000-0000-00000000e1ff');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000f1');

select throws_ok(
  $$ select access.assign_role('00000000-0000-0000-0000-0000000000f1', 'programs_director') $$,
  '23P01', 'one_council_seat', 'A second Council role is refused without a resolution'
);
select throws_ok(
  $$ select access.assign_role('00000000-0000-0000-0000-0000000000f1', 'programs_director',
       exception_resolution => '00000000-0000-0000-0000-00000000e102') $$,
  '23P01', 'exception_needs_adopted_resolution', 'or with one not yet adopted'
);
select lives_ok(
  $$ select access.assign_role('00000000-0000-0000-0000-0000000000f1', 'programs_director',
       exception_resolution => '00000000-0000-0000-0000-00000000e101') $$,
  'and allowed by an adopted Council resolution (Constitution 6.6)'
);
select is(
  (select titles_en from governance.council_members() where full_name_en = 'The President'),
  array['President', 'Director of Programs'],
  'The Council page names the President once, with both titles'
);

select lives_ok(
  $$ select access.assign_role('00000000-0000-0000-0000-0000000000a1', 'artistic_director') $$,
  'The Artistic Director is assigned'
);
select is(
  (select titles_en from governance.council_members() where full_name_en = 'The Artistic Director'),
  array['Artistic Director'], 'and sits on the Council'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select ok(
  access.has_permission('productions.manage') and not access.has_permission_anywhere('events.manage'),
  'They run every production, and no other program''s calendar'
);

select * from finish();
rollback;
