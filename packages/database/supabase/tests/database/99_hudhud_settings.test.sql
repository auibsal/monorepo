-- Hudhud's settings in the Diwan and the exempt list (decisions.md, Channels and email).
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

select plan(6);

select pg_temp.make_user('00000000-0000-0000-0000-00000000f6a1', 'tech-h@auib.edu.iq', 'Tech');
select pg_temp.make_user('00000000-0000-0000-0000-00000000f6a2', 'gs-h2@auib.edu.iq', 'Secretary');
select pg_temp.make_user('00000000-0000-0000-0000-00000000f6a3', 'member-h@auib.edu.iq', 'Member');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000f6a1', 'tech_admin');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000f6a2', 'general_secretary');
insert into core.telegram_groups (chat_id, title) values (-100123, 'Members');

select pg_temp.login_as('00000000-0000-0000-0000-00000000f6a1');
select is((select count(*)::integer from core.telegram_groups), 1, 'Officers with settings.manage see the groups');
select lives_ok(
  $$ update core.telegram_groups set audience = 'staff', topics = '{"brief": 4}' where chat_id = -100123 $$,
  'and set a group''s audience and topics in the Diwan'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000f6a3');
select is((select count(*)::integer from core.telegram_groups), 0, 'Members do not');

select pg_temp.login_as('00000000-0000-0000-0000-00000000f6a2');
select lives_ok(
  $$ insert into core.telegram_exempt (telegram_id, label) values (424242, 'Student Life') $$,
  'Membership keeps the exempt list'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000f6a3');
select is((select count(*)::integer from core.telegram_exempt), 0, 'which members cannot read');
select throws_ok(
  $$ insert into core.telegram_exempt (telegram_id, label) values (1, 'Me') $$,
  '42501', null, 'or add to'
);

select * from finish();
rollback;
