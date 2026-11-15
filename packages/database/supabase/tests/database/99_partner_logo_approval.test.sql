-- The design review, PR 4e (Nov 4, 2026): Open Pages prompt cards (A35).
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

select plan(9);

select pg_temp.make_user('00000000-0000-0000-0000-0000000f3001', 'lead@club-f3.org', 'Club Lead');
select pg_temp.make_user('00000000-0000-0000-0000-0000000f3002', 'pres.f3@auib.edu.iq', 'President');
select pg_temp.make_user('00000000-0000-0000-0000-0000000f3003', 'other@club-f3b.org', 'Other Lead');
insert into governance.partners (id, slug, name_en, kind, is_listed, status) values
  ('00000000-0000-0000-0000-0000000f3d01', 'club-f3', 'Club F3', 'club', false, 'prospect'),
  ('00000000-0000-0000-0000-0000000f3d02', 'club-f3b', 'Club F3B', 'club', false, 'prospect');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000f3001', 'partner_lead', 'partner', '00000000-0000-0000-0000-0000000f3d01');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000f3003', 'partner_lead', 'partner', '00000000-0000-0000-0000-0000000f3d02');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000f3002', 'president');

-- The partner's team proposes; it never sets the logo that shows.
select pg_temp.login_as('00000000-0000-0000-0000-0000000f3001');
select throws_ok(
  $$ update governance.partners set logo_path = 'partners/mine.png' where id = '00000000-0000-0000-0000-0000000f3d01' $$,
  '42501', 'kept_by_the_society', 'a partner does not set its shown logo itself');
select lives_ok(
  $$ select governance.propose_partner_logo('00000000-0000-0000-0000-0000000f3d01',
       'partners/pending/00000000-0000-0000-0000-0000000f3d01/a.png') $$,
  'it sends a logo for approval');
select throws_ok(
  $$ select governance.propose_partner_logo('00000000-0000-0000-0000-0000000f3d01', 'partners/elsewhere.png') $$,
  '22023', 'invalid_path', 'only from its own pending folder');
select throws_ok(
  $$ select governance.decide_partner_logo('00000000-0000-0000-0000-0000000f3d01', true) $$,
  '42501', 'not_allowed', 'nor approves its own');

select pg_temp.login_as('00000000-0000-0000-0000-0000000f3003');
select throws_ok(
  $$ select governance.propose_partner_logo('00000000-0000-0000-0000-0000000f3d01',
       'partners/pending/00000000-0000-0000-0000-0000000f3d01/b.png') $$,
  '42501', 'not_your_partner', 'another partner cannot send one for it');

-- Partnerships approves it, or declines it.
select pg_temp.login_as('00000000-0000-0000-0000-0000000f3002');
select is(governance.decide_partner_logo('00000000-0000-0000-0000-0000000f3d01', true), null,
  'Partnerships approves the logo');
select results_eq(
  $$ select logo_path, logo_pending_path from governance.partners where id = '00000000-0000-0000-0000-0000000f3d01' $$,
  $$ values ('partners/pending/00000000-0000-0000-0000-0000000f3d01/a.png'::text, null::text) $$,
  'and it is the one shown');
select pg_temp.login_as('00000000-0000-0000-0000-0000000f3001');
select governance.propose_partner_logo('00000000-0000-0000-0000-0000000f3d01',
  'partners/pending/00000000-0000-0000-0000-0000000f3d01/c.png');
select pg_temp.login_as('00000000-0000-0000-0000-0000000f3002');
select is(governance.decide_partner_logo('00000000-0000-0000-0000-0000000f3d01', false),
  'partners/pending/00000000-0000-0000-0000-0000000f3d01/c.png',
  'a declined logo comes back for the page to remove');
select results_eq(
  $$ select logo_path, logo_pending_path from governance.partners where id = '00000000-0000-0000-0000-0000000f3d01' $$,
  $$ values ('partners/pending/00000000-0000-0000-0000-0000000f3d01/a.png'::text, null::text) $$,
  'and the approved one stays');

select * from finish();
rollback;
