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

-- decisions.md, The Council and the roles: "How teams are shown". About →
-- Our people lists each department's team under its seat; a member under
-- 18 only once a parent has consented.
select plan(6);

select pg_temp.make_user('00000000-0000-0000-0000-0000000f6001', 'web.person@auib.edu.iq', 'Web Person');
update core.profiles set first_name_en = 'Web', father_name_en = 'Ali', grandfather_name_en = 'Hasan',
  last_name_en = 'Person' where id = '00000000-0000-0000-0000-0000000f6001';
select pg_temp.grant_role('00000000-0000-0000-0000-0000000f6001', 'web_lead');

select pg_temp.make_user('00000000-0000-0000-0000-0000000f6002', 'young.writer@auib.edu.iq', 'Young Writer');
update core.profiles set first_name_en = 'Young', father_name_en = 'Omar', grandfather_name_en = 'Hasan',
  last_name_en = 'Writer', birth_year = extract(year from now())::int - 16, birth_month = 1
  where id = '00000000-0000-0000-0000-0000000f6002';
select pg_temp.grant_role('00000000-0000-0000-0000-0000000f6002', 'reporter');

select pg_temp.make_user('00000000-0000-0000-0000-0000000f6003', 'a.reader@auib.edu.iq', 'A Reader');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000f6003', 'reader');

select pg_temp.login_anon();
select is(
  (select seat from api.society_people() where role = 'web_lead'),
  'media_director',
  'The web lead is listed under the Director of Media'
);
select ok(
  (select name_en from api.society_people() where role = 'web_lead') like 'Web%',
  'by the name they go by'
);
select is(
  (select count(*)::int from api.society_people() where role = 'reporter'),
  0,
  'A member under 18 is not listed before a parent consents'
);
select is(
  (select count(*)::int from api.society_people() where role = 'reader'),
  0,
  'Readers are credited where they read, not here'
);
select pg_temp.logout();

update core.profiles set parent_consent_at = now() where id = '00000000-0000-0000-0000-0000000f6002';
select pg_temp.login_anon();
select is(
  (select seat from api.society_people() where role = 'reporter'),
  'eic',
  'and is listed under the Editor-in-Chief once they have'
);
select is(private.role_seat('copy_desk_editor', null), 'eic', 'An editor answers to the Editor-in-Chief');
select pg_temp.logout();

select * from finish();
rollback;
