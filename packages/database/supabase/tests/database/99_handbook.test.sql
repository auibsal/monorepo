-- The officer handbook moved to Notion (20261010000400): the old pages stay
-- read only, nobody edits them, members and apps see nothing, and the Nexus
-- finds each page's new home in a public setting.
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

select plan(8);

select pg_temp.make_user('00000000-0000-0000-0000-0000000000a1', 'reader-hb@auib.edu.iq');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a2', 'member-hb@auib.edu.iq');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a3', 'secretary-hb@auib.edu.iq');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000000a1', 'reader');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000000a3', 'general_secretary');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select ok((select count(*) from governance.handbook_pages) >= 9,
  'An officer with library.read still reads the old pages');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a2');
select is((select count(*)::int from governance.handbook_pages), 0,
  'A member without a role sees nothing');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a3');
select throws_ok(
  $$ update governance.handbook_pages set title_en = 'Changed' where slug = 'events' $$,
  '42501', null,
  'Not even a governance manager edits the old pages');
select throws_ok(
  $$ insert into governance.handbook_pages (slug, section, title_en) values ('new', 'start', 'New') $$,
  '42501', null,
  'or adds one');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1',
  '{"client_id": "00000000-0000-0000-0000-00000000a002"}');
select is((select count(*)::int from governance.handbook_pages), 0,
  'Third-party apps never read the handbook');

select pg_temp.login_anon();
select ok(
  (select value->>'home' from core.settings where key = 'notion.handbook') like 'https://app.notion.com/p/%',
  'The handbook''s Notion home is a public setting');
select pg_temp.logout();
select is(
  (select count(*)::int from governance.handbook_pages p, core.settings s
    where s.key = 'notion.handbook' and s.value->'pages' ? p.slug),
  (select count(*)::int from governance.handbook_pages),
  'Every old page has a Notion page');
select is(
  (select count(*)::int from governance.society_documents
    where audience = 'internal' and notion_url is null),
  0,
  'Every internal document says where its text is in Notion');

select * from finish();
rollback;
