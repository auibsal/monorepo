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

select plan(21);

select pg_temp.make_user('00000000-0000-0000-0000-0000000f4001', 'lead@iifc.org', 'Applicant Lead');
select pg_temp.make_user('00000000-0000-0000-0000-0000000f4002', 'pres.f4@auib.edu.iq', 'President');
select pg_temp.make_user('00000000-0000-0000-0000-0000000f4003', 'someone@uni.edu.iq', 'At a University');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000f4002', 'president');

-- An application (a partner's own entry), and an entry the Society added.
insert into governance.partners (id, slug, name_en, kind, status, relation, url) values
  ('00000000-0000-0000-0000-0000000f4d01', 'f4-club', 'F4 Club', 'club', 'prospect', 'partner', null),
  ('00000000-0000-0000-0000-0000000f4d02', 'f4-sponsor', 'F4 Sponsor', 'cultural', 'active', 'sponsor', 'https://f4.org'),
  ('00000000-0000-0000-0000-0000000f4d03', 'f4-film', 'Film Center F4', 'cultural', 'prospect', 'partner', 'https://iifc.org'),
  ('00000000-0000-0000-0000-0000000f4d04', 'f4-old', 'Film Center F4', 'cultural', 'active', 'sponsor', 'https://iifc.org/about');
insert into governance.partner_agreements (partner_id, purpose_en, starts_on, applied_by) values
  ('00000000-0000-0000-0000-0000000f4d01', 'Readings.', current_date, '00000000-0000-0000-0000-0000000f4001'),
  ('00000000-0000-0000-0000-0000000f4d03', 'Screenings.', current_date, '00000000-0000-0000-0000-0000000f4001');
insert into events.events (id, slug, title_en, title_ar, starts_at, status, partner_id)
values ('00000000-0000-0000-0000-0000000f4e01', 'f4-screening', 'A screening', 'عرض', now() + interval '3 days', 'draft',
  '00000000-0000-0000-0000-0000000f4d04');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000f4001', 'partner_lead', 'partner', '00000000-0000-0000-0000-0000000f4d01');

select ok(governance.partner_owned('00000000-0000-0000-0000-0000000f4d01'), 'an entry that applied is the partner''s own');
select ok(not governance.partner_owned('00000000-0000-0000-0000-0000000f4d02'), 'an entry the Society added is not');

-- The Society keeps only the logo, the kind and the listing on a partner's own entry.
select pg_temp.login_as('00000000-0000-0000-0000-0000000f4002');
select throws_ok(
  $$ update governance.partners set description_en = 'Ours now' where id = '00000000-0000-0000-0000-0000000f4d01' $$,
  '42501', 'the_partners_own', 'the Society does not edit a partner''s description');
select throws_ok(
  $$ update governance.partners set contact_email = 'x@y.org' where id = '00000000-0000-0000-0000-0000000f4d01' $$,
  '42501', 'the_partners_own', 'nor its contacts');
select throws_ok(
  $$ update governance.partners set name_en = 'Renamed' where id = '00000000-0000-0000-0000-0000000f4d01' $$,
  '42501', 'the_partners_own', 'nor its name, locked to the memorandum');
select lives_ok(
  $$ update governance.partners set kind = 'cultural', is_listed = true, logo_path = 'partners/x.png'
     where id = '00000000-0000-0000-0000-0000000f4d01' $$,
  'it changes the logo, the kind and the listing');
select pg_temp.logout();
select ok(exists (select 1 from core.outbox where kind = 'partners.logo_changed'
  and payload ->> 'partner_id' = '00000000-0000-0000-0000-0000000f4d01'),
  'and a logo change by the Society tells the Lead');
select pg_temp.login_as('00000000-0000-0000-0000-0000000f4002');
select lives_ok(
  $$ update governance.partners set description_en = 'Ours', url = 'https://f4.org/new'
     where id = '00000000-0000-0000-0000-0000000f4d02' $$,
  'an entry the Society added stays fully editable');

-- The partner proposes; the Director of Partnerships decides.
select pg_temp.login_as('00000000-0000-0000-0000-0000000f4001');
select lives_ok(
  $$ select governance.propose_partner_listing('00000000-0000-0000-0000-0000000f4d01',
       'Board games every week.', null, 'https://f4club.org') $$,
  'the partner proposes a change to its listing');
select is((select description_en from governance.partners where id = '00000000-0000-0000-0000-0000000f4d01'), null,
  'which waits for approval');
select pg_temp.login_as('00000000-0000-0000-0000-0000000f4002');
select lives_ok(
  $$ select governance.decide_partner_listing(
       (select id from governance.partner_listing_changes where partner_id = '00000000-0000-0000-0000-0000000f4d01'
        and status = 'pending'), true) $$,
  'the Director of Partnerships approves it');
select results_eq(
  $$ select description_en, url from governance.partners where id = '00000000-0000-0000-0000-0000000f4d01' $$,
  $$ values ('Board games every week.'::text, 'https://f4club.org'::text) $$,
  'and the listing changes');

-- Linking an application to the entry the register already has.
select results_eq(
  $$ select slug, by_domain from governance.partner_matches('00000000-0000-0000-0000-0000000f4d03') $$,
  $$ values ('f4-old'::text, true) $$,
  'the application suggests the existing entry by name and domain');
select is(governance.link_partner('00000000-0000-0000-0000-0000000f4d03', '00000000-0000-0000-0000-0000000f4d04'),
  'f4-old', '"Same organization as…" links them');
select is((select partner_id from events.events where id = '00000000-0000-0000-0000-0000000f4e01'),
  '00000000-0000-0000-0000-0000000f4d04'::uuid, 'the entry keeps its events');
select results_eq(
  $$ select relation, (select count(*)::integer from governance.partner_agreements a where a.partner_id = p.id)
     from governance.partners p where p.id = '00000000-0000-0000-0000-0000000f4d04' $$,
  $$ values ('partner'::text, 1) $$,
  'and becomes the partner''s own, with the application''s memorandum');
select is((select count(*)::integer from governance.partners where id = '00000000-0000-0000-0000-0000000f4d03'), 0,
  'the application''s separate entry is gone');

-- Shared domains: named invitations only.
select ok(private.is_shared_domain('uni.edu.iq') and private.is_shared_domain('mohe.gov.iq')
  and private.is_shared_domain('ox.ac.uk') and private.is_shared_domain('harvard.edu'),
  'universities, schools and governments share their domains');
select ok(not private.is_shared_domain('iifc.org'), 'an organization''s own domain does not');

-- A contact typed before the partner had a Lead stays as the Society's
-- note, until a Lead signs up.
select pg_temp.logout();
insert into governance.partners (id, slug, name_en, kind, status, relation, contact_name, contact_email)
values ('00000000-0000-0000-0000-0000000f4d05', 'f4-typed', 'F4 Typed', 'club', 'active', 'partner',
  'A Contact', 'contact@f4typed.org');
insert into governance.partner_agreements (partner_id, purpose_en, starts_on, applied_by)
values ('00000000-0000-0000-0000-0000000f4d05', 'Talks.', current_date, '00000000-0000-0000-0000-0000000f4001');
select is((select contact_email from governance.partners where id = '00000000-0000-0000-0000-0000000f4d05'),
  'contact@f4typed.org', 'a typed contact stays while the partner has no Lead');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000f4001', 'partner_lead', 'partner', '00000000-0000-0000-0000-0000000f4d05');
select is((select contact_email from governance.partners where id = '00000000-0000-0000-0000-0000000f4d05'),
  null, 'and goes once its Lead signs up');

select * from finish();
rollback;
