-- The Library: every document public and readable by everyone, edits only
-- by governance managers; internal documents are kept in Notion
-- (migration 20261030000700).
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
    values ('Council meeting', '<p>Minutes.</p>', current_date - 1, 'council', 'adopted', current_date)
    returning id
  )
  insert into governance.resolutions (id, code, title_en, text_en, body, status, adopted_on, minutes_id)
  select council_resolution.id, council_resolution.code, 'Approves the partnership', '<p>Resolved.</p>', 'council', 'adopted', current_date, m.id
  from m
  returning id;
$$;
-- </preamble>
select plan(10);

select pg_temp.make_user('00000000-0000-0000-0000-0000000000a1', 'member-sd@auib.edu.iq', 'A Member');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a2', 'director-sd@auib.edu.iq', 'A Director');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a3', 'gs-sd@auib.edu.iq', 'The GS');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000000a2', 'media_director');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000000a3', 'general_secretary');

-- The Library is rebuilt from Notion after the Nov 7 decisions; two samples
-- stand in for the re-sync.
insert into governance.society_documents (code, slug, title_en, body_en, audience)
values
  ('SAL-GOV-01', 'constitution', 'The Constitution', '<p><strong>6.6</strong> Text.</p>', 'public'),
  ('SAL-GOV-02', 'bylaws', 'The Bylaws', '<p>Text.</p>', 'public');

select pg_temp.login_anon();
select is((select count(*)::int from governance.society_documents), 2,
  'Visitors read the public documents');
select is((select count(*)::int from governance.society_documents
  where status = 'proposed' and adopted_on is null), 2,
  'Every document is proposed until the Founding Meeting adopts it (owner, Nov 7, 2026)');
select is((select count(*)::int from governance.society_documents where audience = 'internal'), 0,
  'No internal documents are kept here: they stay in Notion');
select ok((select body_en like '%<strong>6.6</strong>%' from governance.society_documents where slug = 'constitution'),
  'The Constitution is there as text');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
update governance.society_documents set title_en = 'Changed' where slug = 'constitution';
select is((select title_en from governance.society_documents where slug = 'constitution'), 'The Constitution',
  'A member edits no document');

select pg_temp.logout();
select throws_ok(
  $$ insert into governance.society_documents (code, slug, title_en) values ('SAL-PLT-01', 'old-policy', 'Old') $$,
  '23514', null, 'The retired code families are refused (PLT, POL, BRD …)'
);
select throws_ok(
  $$ update governance.society_documents set status = 'adopted' where slug = 'bylaws' $$,
  '23514', null, 'An adopted document carries its adoption date'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a3');
select lives_ok(
  $$ update governance.society_documents set body_en = body_en || '<p>Amended.</p>' where slug = 'bylaws' $$,
  'The General Secretary edits a document in the Diwan'
);
select is((select updated_by from governance.society_documents where slug = 'bylaws'),
  '00000000-0000-0000-0000-0000000000a3'::uuid, 'and is recorded as its last editor');
select throws_ok(
  $$ update governance.society_documents set audience = 'internal' where slug = 'constitution' $$,
  '23514', null, 'No document can be made internal'
);

select * from finish();
rollback;
