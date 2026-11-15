-- An organization's own domain: someone at a partner's domain asks to join
-- its team and the Lead approves; a guest who joins becomes the partner's.
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

select plan(14);

select is(private.organization_domain('Someone@Acme.IQ'), 'acme.iq', 'An organization''s address');
select is(private.organization_domain('someone@gmail.com'), null, 'not a personal provider''s');
select is(private.organization_domain('1250101@auib.edu.iq'), null, 'nor AUIB''s');

insert into governance.partners (id, slug, name_en, kind, status) values
  ('b2000000-0000-0000-0000-000000000001', 'acme', 'Acme', 'business', 'active');
-- The Lead, at acme.iq.
select pg_temp.make_user('b2000000-0000-0000-0000-000000000011', 'lead@acme.iq', 'Lead');
delete from membership.guests where user_id = 'b2000000-0000-0000-0000-000000000011';
select pg_temp.grant_role('b2000000-0000-0000-0000-000000000011', 'partner_lead', 'partner',
  'b2000000-0000-0000-0000-000000000001');
-- Two guests at acme.iq, one with Gmail.
select pg_temp.make_user('b2000000-0000-0000-0000-000000000012', 'ann@acme.iq', 'Ann');
select pg_temp.make_user('b2000000-0000-0000-0000-000000000013', 'bob@acme.iq', 'Bob');
select pg_temp.make_user('b2000000-0000-0000-0000-000000000014', 'cy@gmail.com', 'Cy');

-- Before the Lead opens the domain: a suggestion to apply, no partner.
select pg_temp.login_as('b2000000-0000-0000-0000-000000000012');
select results_eq(
  $$ select domain, partner_id from core.my_organization() $$,
  $$ values ('acme.iq', null::uuid) $$,
  'An organization''s address with no partner open to it');
select throws_ok(
  $$ select governance.ask_to_join_partner('b2000000-0000-0000-0000-000000000001') $$,
  '42501', 'not_your_domain', 'Nobody asks before the Lead opens the domain');

select pg_temp.login_as('b2000000-0000-0000-0000-000000000014');
select is_empty($$ select * from core.my_organization() $$, 'A Gmail address sees nothing');

-- The Lead opens the team to acme.iq; nobody else can.
select pg_temp.login_as('b2000000-0000-0000-0000-000000000012');
select throws_ok(
  $$ select governance.set_partner_team_domain('b2000000-0000-0000-0000-000000000001', true) $$,
  '42501', 'not_allowed', 'Only the Lead opens the domain');
select pg_temp.login_as('b2000000-0000-0000-0000-000000000011');
select is(governance.set_partner_team_domain('b2000000-0000-0000-0000-000000000001', true),
  'acme.iq', 'The Lead opens the team to the Lead''s own domain');

-- Ann asks; the Lead sees it and approves.
select pg_temp.login_as('b2000000-0000-0000-0000-000000000012');
select lives_ok(
  $$ select governance.ask_to_join_partner('b2000000-0000-0000-0000-000000000001') $$,
  'Someone at the domain asks to join');
select pg_temp.login_as('b2000000-0000-0000-0000-000000000011');
select is((select count(*)::int from governance.partner_join_requests('b2000000-0000-0000-0000-000000000001')),
  1, 'The Lead sees the request');
select lives_ok(
  $$ select governance.decide_partner_join_request(
       (select id from governance.partner_join_requests('b2000000-0000-0000-0000-000000000001')), true) $$,
  'The Lead approves');
select pg_temp.logout();
select ok(private.is_partner_team('b2000000-0000-0000-0000-000000000012')
  and not private.is_guest('b2000000-0000-0000-0000-000000000012'),
  'The guest is now on the partner''s team, and a guest no longer');

-- Bob asks, and the team (the Lead and two) fills before the Lead decides.
select pg_temp.login_as('b2000000-0000-0000-0000-000000000013');
select lives_ok(
  $$ select governance.ask_to_join_partner('b2000000-0000-0000-0000-000000000001') $$,
  'A second person asks');
select pg_temp.logout();
select pg_temp.make_user('b2000000-0000-0000-0000-000000000015', 'dee@elsewhere.iq', 'Dee');
delete from membership.guests where user_id = 'b2000000-0000-0000-0000-000000000015';
select pg_temp.grant_role('b2000000-0000-0000-0000-000000000015', 'partner_rep', 'partner',
  'b2000000-0000-0000-0000-000000000001');
select pg_temp.login_as('b2000000-0000-0000-0000-000000000011');
select throws_ok(
  $$ select governance.decide_partner_join_request(
       (select id from governance.partner_join_requests('b2000000-0000-0000-0000-000000000001')), true) $$,
  '22023', 'team_full', 'The team stays at the Lead and two more');

select * from finish();
rollback;
