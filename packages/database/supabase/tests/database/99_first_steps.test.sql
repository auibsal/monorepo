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

-- decisions.md, Members: "A new role holder"; Where things live: "checked
-- against the thing itself". Each first step clears when its thing is done.
select plan(16);

select pg_temp.make_user('00000000-0000-0000-0000-0000000f5001', 'pres.holder@auib.edu.iq', 'Pres Holder');
update core.profiles set first_name_en = 'Pres', father_name_en = 'Ali', grandfather_name_en = 'Hasan',
  last_name_en = 'Holder' where id = '00000000-0000-0000-0000-0000000f5001';
insert into access.role_assignments (id, user_id, role, scope_type)
values ('00000000-0000-0000-0000-0000000f50a1', '00000000-0000-0000-0000-0000000f5001', 'president', 'global');
-- A President with Qirtas permissions but no reading permission.
delete from access.role_permissions where role = 'president' and permission = 'journal.review';

select pg_temp.make_user('00000000-0000-0000-0000-0000000f5002', 'a.reader@auib.edu.iq', 'A Reader');
insert into access.role_assignments (id, user_id, role, scope_type)
values ('00000000-0000-0000-0000-0000000f50a2', '00000000-0000-0000-0000-0000000f5002', 'reader', 'global');

-- ── The role agreement is the role agreement only ──
select pg_temp.login_as('00000000-0000-0000-0000-0000000f5001');
select is((select done from access.my_role_checklist() where step = 'pledge'), false,
  'The role agreement waits to be signed');
select isnt(access.sign_role_agreement('00000000-0000-0000-0000-0000000f50a1'), null, 'Signed');
select is((select done from access.my_role_checklist() where step = 'pledge'), true,
  'and the step leaves at once');
select is((select done from access.my_role_checklist() where step = 'pledge'), true,
  'and stays gone when asked again');
select lives_ok($$ select access.sign_role_agreement('00000000-0000-0000-0000-0000000f50a1') $$,
  'A second request is harmless');
select pg_temp.logout();
select is((select count(*)::int from access.role_agreements
  where assignment_id = '00000000-0000-0000-0000-0000000f50a1'), 1, 'and changes nothing');

select pg_temp.login_as('00000000-0000-0000-0000-0000000f5001');
select is((select count(*)::int from access.my_role_checklist() where step = 'confidentiality'), 0,
  'A President who reads no submissions is never asked for the confidentiality agreement');

-- ── The confidentiality agreement, only for a role that reads ──
select pg_temp.login_as('00000000-0000-0000-0000-0000000f5002');
select is((select done from access.my_role_checklist() where step = 'confidentiality'), false,
  'A reader is asked for the confidentiality agreement, as its own step');
select isnt(journal.sign_reader_pledge(true), null, 'The reader signs it');
select is((select done from access.my_role_checklist() where step = 'confidentiality'), true,
  'and the step clears');

-- ── The conflict-of-interest declaration ──
select pg_temp.login_as('00000000-0000-0000-0000-0000000f5001');
select lives_ok(
  $$ select governance.sign_form('conflict-of-interest-declaration', '{"none":true}', 'Pres Ali Hasan Holder', esign_agreed => true) $$,
  'The declaration is sent'
);
select is((select done from access.my_role_checklist() where step = 'declaration'), true,
  'and its step clears');

-- ── The Diwan group, as Telegram reports it ──
select pg_temp.logout();
insert into core.telegram_groups (chat_id, title, audience) values (-1009001, 'The Diwan', 'staff');
insert into core.telegram_accounts (user_id, telegram_id) values ('00000000-0000-0000-0000-0000000f5001', 777001);
select pg_temp.login_as('00000000-0000-0000-0000-0000000f5001');
select is((select done from access.my_role_checklist() where step = 'diwan_group'), false,
  'Linked but not in the group, the step waits');
select pg_temp.logout();
insert into core.telegram_memberships (chat_id, telegram_id, status) values (-1009001, 777001, 'restricted');
select pg_temp.login_as('00000000-0000-0000-0000-0000000f5001');
select is((select done from access.my_role_checklist() where step = 'diwan_group'), true,
  'In the group (restricted still counts), it clears');

-- ── The manual and Brand essentials, recorded by their pages ──
select pg_temp.logout();
insert into governance.society_documents (code, slug, title_en, title_ar, readers, status, audience)
values ('SAL-EXB-01', 'leadership-handbook', 'Leadership Handbook', 'دليل القيادة', 'staff', 'proposed', 'public');
select pg_temp.login_as('00000000-0000-0000-0000-0000000f5001');
select is((select count(*)::int from core.open_role_manual('00000000-0000-0000-0000-0000000f50a1')), 1,
  'The seat''s manual opens');
select perform_brand from (select core.record_brand_opened() as perform_brand) x;
select ok(
  (select bool_and(done) from access.my_role_checklist() where step in ('manual', 'brand')),
  'Opening the manual and Brand essentials clears both steps'
);

select * from finish();
rollback;
