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

select plan(7);

select ok(
  (select bool_and(not in_notion) from access.roles
    where key in ('partner_lead', 'partner_rep', 'parent', 'qalam_student')),
  'Partners, parents and Qalam students do not open the team''s Notion'
);

select ok(
  (select in_notion from access.roles where key = 'president'),
  'An officer''s role opens the team''s Notion'
);

select is(
  (select count(*)::int from core.settings where key in ('notion.invite_link', 'notion.catch_up_sent_at')),
  0, 'There is no shared invite link: Notion is by named invitation'
);

select pg_temp.make_user('00000000-0000-0000-0000-0000000a0101', 'notion-sec@auib.edu.iq', 'The Secretary');
select pg_temp.make_user('00000000-0000-0000-0000-0000000a0102', 'notion-officer@auib.edu.iq', 'An Officer');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000a0101', 'general_secretary');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000a0102', 'president');
select pg_temp.login_as('00000000-0000-0000-0000-0000000a0101', '{"aal":"aal2"}');
select ok(
  exists (select 1 from core.notion_to_invite() where user_id = '00000000-0000-0000-0000-0000000a0102'),
  'The Secretary sees role holders not yet invited, with their AUIB email'
);
select lives_ok(
  $$ select core.mark_notion_invited('00000000-0000-0000-0000-0000000a0102') $$,
  'and marks one invited'
);
select ok(
  not exists (select 1 from core.notion_to_invite() where user_id = '00000000-0000-0000-0000-0000000a0102'),
  'who then leaves the list'
);
select pg_temp.logout();
select pg_temp.make_user('00000000-0000-0000-0000-0000000a0103', 'notion-member@auib.edu.iq', 'A Member');
select pg_temp.login_as('00000000-0000-0000-0000-0000000a0103');
select throws_ok($$ select * from core.notion_to_invite() $$, '42501', null, 'A member does not see the list');

select * from finish();
rollback;
