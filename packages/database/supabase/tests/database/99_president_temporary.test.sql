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

select plan(5);

select pg_temp.make_user('00000000-0000-0000-0000-0000000fa001', 'pres-temp@auib.edu.iq', 'President');
select pg_temp.make_user('00000000-0000-0000-0000-0000000fa002', 'vp-temp@auib.edu.iq', 'Vice President');
select pg_temp.make_user('00000000-0000-0000-0000-0000000fa003', 'member-temp@auib.edu.iq', 'Member');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000fa001', 'president');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000fa002', 'vice_president');

-- TEMPORARY (20261113004300): the President holds every permission.
select is(
  (select count(*) from access.permissions p
    where not exists (select 1 from access.role_permissions rp
      where rp.role = 'president' and rp.permission = p.key)),
  0::bigint,
  'For now the President holds every permission'
);

-- TEMPORARY (20261113004400): no second officer for the President.
select pg_temp.login_as('00000000-0000-0000-0000-0000000fa001');
select ok(private.second_officer(), 'For now the President needs no second officer');
select membership.correct_name('00000000-0000-0000-0000-0000000fa003',
  'Noor', 'Sami', 'Karim', null, 'نور', 'سامي', 'كريم', null, 'Setting up the record');
select pg_temp.logout();
select is(
  (select first_name_en from core.profiles where id = '00000000-0000-0000-0000-0000000fa003'),
  'Noor',
  'and an official name the President sets takes effect at once'
);

-- The Vice President, standing in, gets the seat's usual grants only.
insert into governance.president_absences (starts_on, ends_on)
  values (current_date - 1, current_date + 1);
select pg_temp.login_as('00000000-0000-0000-0000-0000000fa002');
select ok(private.has_permission('roles.assign'),
  'The Vice President standing in holds the President''s usual grants');
select ok(not private.has_permission('journal.identity.view'),
  'but not the President''s temporary ones');

select * from finish();
rollback;
