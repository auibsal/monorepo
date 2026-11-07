-- The Diwan in three rooms (Nov 4, 2026): adopted minutes are locked, the
-- officer directory shows each seat's title, Arabic editions link.
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

select pg_temp.make_user('00000000-0000-0000-0000-0000000000e1', 'editor@auib.edu.iq', 'Editor');
insert into access.role_assignments (user_id, role, title_en, title_ar)
values ('00000000-0000-0000-0000-0000000000e1', 'eic', null, null);

select is(
  (select roles from access.officer_directory() where user_id = '00000000-0000-0000-0000-0000000000e1'),
  array['Editor-in-Chief'],
  'A director is listed by the seat''s full title'
);
select is(
  (select council from access.officer_directory() where user_id = '00000000-0000-0000-0000-0000000000e1'),
  true,
  'and sits on the Council'
);

insert into governance.minutes (id, body, meeting_on, title_en, text_en, status)
values ('d1000000-0000-0000-0000-0000000000a1', 'council', '2026-11-02', 'Council', '<p>Draft</p>', 'draft');
select lives_ok(
  $$ update governance.minutes set text_en = '<p>Corrected</p>' where id = 'd1000000-0000-0000-0000-0000000000a1' $$,
  'Draft minutes can still change'
);
update governance.minutes set status = 'approved', adopted_on = '2026-11-09'
where id = 'd1000000-0000-0000-0000-0000000000a1';
select throws_ok(
  $$ update governance.minutes set text_en = '<p>Changed</p>' where id = 'd1000000-0000-0000-0000-0000000000a1' $$,
  '23514', null,
  'Adopted minutes are locked'
);
select throws_ok(
  $$ update governance.minutes set status = 'draft', adopted_on = null where id = 'd1000000-0000-0000-0000-0000000000a1' $$,
  '23514', null,
  'and cannot be un-adopted'
);

select lives_ok(
  $$ insert into core.notion_links (notion_page_id, kind, record_key)
     values ('40e8824068868120bb68e06e0a00070d', 'event_ar', 'e0000000-0000-0000-0000-000000000001') $$,
  'An Arabic edition page links to its event'
);
select is(
  (select value ->> 'meetings' from core.settings where key = 'notion.data_sources'),
  '3da5ed6a-c061-42e3-b081-748c52e2377d',
  'Minutes come from Work, Meetings'
);

select * from finish();
rollback;
