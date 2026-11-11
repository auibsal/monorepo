-- The Company (decisions.md): no rights, no show; the playbill comes from
-- the roles scoped to the production.
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

select plan(4);

select pg_temp.make_user('00000000-0000-0000-0000-00000000c7a1', 'company-director@auib.edu.iq', 'Stage Director');

insert into programmes.productions (id, slug, title_en, title_ar, kind, stage, script_origin, rights_status)
values ('00000000-0000-0000-0000-00000000c7b1', 'majnun-layla', 'Majnun Layla', 'مجنون ليلى',
  'staged_reading', 'approved', 'public_domain', 'pending');

select throws_ok(
  $$ update programmes.productions set is_public = true where id = '00000000-0000-0000-0000-00000000c7b1' $$,
  '23514', 'rights_not_cleared', 'No rights, no show: an uncleared production stays off the site');

update programmes.productions
set rights_status = 'cleared', rights_cleared_by = '00000000-0000-0000-0000-00000000c7a1', rights_cleared_at = now()
where id = '00000000-0000-0000-0000-00000000c7b1';
select lives_ok(
  $$ update programmes.productions set is_public = true where id = '00000000-0000-0000-0000-00000000c7b1' $$,
  'Once cleared, it is shown');

insert into access.role_assignments (user_id, role, scope_type, scope_id)
values ('00000000-0000-0000-0000-00000000c7a1', 'production_director', 'production',
  '00000000-0000-0000-0000-00000000c7b1');

select pg_temp.login_anon();
select is(
  (select name_en from programmes.production_playbill('00000000-0000-0000-0000-00000000c7b1') where role_key = 'production_director'),
  'Stage Director', 'The playbill names the director from their role');
select is(
  (select count(*)::int from programmes.production_playbill('00000000-0000-0000-0000-0000000000ff')), 0,
  'An unknown production has no playbill');

select * from finish();
rollback;
