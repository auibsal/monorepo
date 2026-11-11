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

-- The roles standard (decisions.md, Get involved and roles): four kinds,
-- retired roles never assignable, covering as a dated delegation, no cap
-- but one Council seat and two assistant editors a section, the mailing
-- list for Media and the Managing Editor, and the quarterly access review.

select plan(14);

select pg_temp.make_user('00000000-0000-0000-0000-0000000c5f01', 'pres-std@auib.edu.iq', 'The President');
select pg_temp.make_user('00000000-0000-0000-0000-0000000c5a01', 'one-std@auib.edu.iq', 'One');
select pg_temp.make_user('00000000-0000-0000-0000-0000000c5a02', 'two-std@auib.edu.iq', 'Two');
select pg_temp.make_user('00000000-0000-0000-0000-0000000c5a03', 'three-std@auib.edu.iq', 'Three');
select pg_temp.make_user('00000000-0000-0000-0000-0000000c5a04', 'cover-std@auib.edu.iq', 'Cover');
select pg_temp.make_user('00000000-0000-0000-0000-0000000c5a05', 'gs-std@auib.edu.iq', 'Secretary');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000c5f01', 'president');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000c5a05', 'general_secretary');

-- Kinds.
select is((select count(*)::int from access.roles where kind = 'seat'),
  (select count(*)::int from access.roles where is_council and key <> 'faculty_advisor'),
  'Every Council seat is a seat, and only those');
select is((select kind from access.roles where key = 'actor'), 'scoped',
  'The Company''s roles are scoped to a production');
select is((select kind from access.roles where key = 'faculty_advisor'), 'outside',
  'The Faculty Advisor is an outside role');

-- Retired roles.
select ok((select retired from access.roles where key = 'events_lead'),
  'A retired role stays on record, marked retired');
select pg_temp.login_as('00000000-0000-0000-0000-0000000c5f01');
select throws_ok(
  $$ select access.assign_role('00000000-0000-0000-0000-0000000c5a01', 'events_lead') $$,
  'P0001', 'role_retired', 'and is never assigned'
);

-- Two assistant editors a section at most.
select lives_ok(
  $$ select access.assign_role('00000000-0000-0000-0000-0000000c5a01', 'news_assistant_editor');
     select access.assign_role('00000000-0000-0000-0000-0000000c5a02', 'news_assistant_editor') $$,
  'A section takes two assistant editors'
);
select throws_ok(
  $$ select access.assign_role('00000000-0000-0000-0000-0000000c5a03', 'news_assistant_editor') $$,
  '23P01', 'two_assistant_editors_at_most', 'but not a third'
);
select lives_ok(
  $$ select access.assign_role('00000000-0000-0000-0000-0000000c5a01', 'copy_desk_editor') $$,
  'A person holds more than one team role'
);

-- Covering ends when the role is given for good.
select pg_temp.logout();
insert into access.role_assignments (user_id, role, scope_type, covering)
values ('00000000-0000-0000-0000-0000000c5a04', 'letters_editor', 'global', true);
select pg_temp.login_as('00000000-0000-0000-0000-0000000c5f01');
select access.assign_role('00000000-0000-0000-0000-0000000c5a03', 'letters_editor');
select pg_temp.logout();
select ok(
  (select ends_at is not null and ends_at <= now() + interval '1 minute' from access.role_assignments
   where user_id = '00000000-0000-0000-0000-0000000c5a04' and role = 'letters_editor'),
  'Giving a role for good ends whoever covered it'
);

-- The mailing list.
select ok(exists (select 1 from access.role_permissions where role = 'media_director' and permission = 'mailing.read'),
  'Media reads the mailing list');
select ok(not exists (select 1 from access.role_permissions where role = 'tech_admin' and permission = 'mailing.read'),
  'the web lead does not');

-- The quarterly access review.
select pg_temp.login_as('00000000-0000-0000-0000-0000000c5a02');
select throws_ok($$ select access.record_access_review('Checked') $$, '42501', null,
  'Only the Secretary records the access review');
select pg_temp.login_as('00000000-0000-0000-0000-0000000c5a05');
select lives_ok($$ select access.record_access_review('Checked every holder against the manuals.') $$,
  'The Secretary records it');
select ok((select holders > 0 from access.access_reviews order by reviewed_at desc limit 1),
  'with the number of current assignments');

select * from finish();
rollback;
