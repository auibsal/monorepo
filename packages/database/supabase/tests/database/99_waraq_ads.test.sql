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

-- Ads in Waraq: Society ads by content keepers, sponsor ads by partnership
-- managers, and sponsors only while their memorandum grants advertising.

select plan(15);

select pg_temp.make_user('00000000-0000-0000-0000-0000000ad001', 'secretary-ads@auib.edu.iq', 'General Secretary');
select pg_temp.make_user('00000000-0000-0000-0000-0000000ad002', 'partners-ads@auib.edu.iq', 'Partnerships');
select pg_temp.make_user('00000000-0000-0000-0000-0000000ad003', 'member-ads@auib.edu.iq', 'Member');
select pg_temp.make_user('00000000-0000-0000-0000-0000000ad004', 'vp-ads@auib.edu.iq', 'Vice President');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000ad001', 'general_secretary');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000ad002', 'partnerships_director');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000ad004', 'vice_president');

-- Two active partners: one memorandum grants advertising, one does not.
insert into governance.partners (id, slug, name_en, name_ar, kind, status) values
  ('00000000-0000-0000-0000-0000000ad0a1', 'bookshop-ads', 'Bookshop', 'المكتبة', 'business', 'active'),
  ('00000000-0000-0000-0000-0000000ad0a2', 'club-ads', 'Club', 'النادي', 'club', 'active');
insert into governance.partner_agreements (id, partner_id, purpose_en, starts_on, grants) values
  ('00000000-0000-0000-0000-0000000ad0b1', '00000000-0000-0000-0000-0000000ad0a1', 'Ads in Waraq.', current_date - 1, '{advertising}'),
  ('00000000-0000-0000-0000-0000000ad0b2', '00000000-0000-0000-0000-0000000ad0a2', 'Joint events.', current_date - 1, '{event_cohosting}');
select pg_temp.login_as('00000000-0000-0000-0000-0000000ad004');
select governance.sign_partner_agreement('00000000-0000-0000-0000-0000000ad0b1', 'Owner', 'partners/ads.pdf');
select governance.sign_partner_agreement('00000000-0000-0000-0000-0000000ad0b2', 'Head', 'partners/club.pdf');
select pg_temp.logout();
update governance.partners set status = 'active' where id in ('00000000-0000-0000-0000-0000000ad0a1', '00000000-0000-0000-0000-0000000ad0a2');

-- The General Secretary keeps Society ads, not sponsor ads.
select pg_temp.login_as('00000000-0000-0000-0000-0000000ad001');
select lives_ok(
  $$insert into journal.ads (kind, headline_en, url, is_published)
    values ('society', 'Join the Society', '/join', true)$$,
  'A content keeper adds a Society ad'
);
select throws_ok(
  $$insert into journal.ads (kind, partner_id, headline_en, url)
    values ('sponsor', '00000000-0000-0000-0000-0000000ad0a1', 'Books', 'https://example.com')$$,
  '42501', null, 'A content keeper cannot add a sponsor ad'
);

-- The Director of Partnerships keeps sponsor ads, not Society ads.
select pg_temp.login_as('00000000-0000-0000-0000-0000000ad002');
select lives_ok(
  $$insert into journal.ads (kind, partner_id, headline_en, url, is_published) values
    ('sponsor', '00000000-0000-0000-0000-0000000ad0a1', 'Books for SAL', 'https://example.com', true),
    ('sponsor', '00000000-0000-0000-0000-0000000ad0a2', 'Club night', 'https://example.org', true)$$,
  'A partnership manager adds sponsor ads'
);
select throws_ok(
  $$insert into journal.ads (kind, headline_en, url) values ('sponsor', 'No partner', 'https://example.com')$$,
  '23514', null, 'A sponsor ad names its partner'
);

select is((select count(*) from journal.ads)::integer, 2, 'and reads only sponsor ads');
select throws_ok(
  $$insert into journal.ads (kind, headline_en, url) values ('society', 'Mine', '/x')$$,
  '42501', null, 'A partnership manager cannot add a Society ad'
);
select throws_ok(
  $$insert into journal.ads (kind, partner_id, headline_en, url)
    values ('sponsor', '00000000-0000-0000-0000-0000000ad0a1', 'Bad link', 'http://example.com')$$,
  '23514', null, 'Ads link to https or to auibsal.org'
);

-- Readers get live ads only through current_ads(), never the table.
select pg_temp.login_anon();
select throws_ok($$select * from journal.ads$$, '42501', null, 'Readers cannot read the ads table');
select results_eq(
  $$select headline_en from journal.current_ads() order by headline_en$$,
  $$values ('Books for SAL'::text), ('Join the Society'::text)$$,
  'Readers see the Society ad and the sponsor whose memorandum grants advertising'
);
select is((select sponsor_en from journal.current_ads() where kind = 'sponsor'), 'Bookshop',
  'A sponsor ad says who it is from');

select pg_temp.login_as('00000000-0000-0000-0000-0000000ad003');
select is((select count(*) from journal.ads)::integer, 0, 'A member without a role reads no ads rows');
update journal.ads set headline_en = 'Hacked' where headline_en = 'Join the Society';
select is((select headline_en from journal.current_ads() where kind = 'society'), 'Join the Society',
  'A member cannot change an ad');

-- A sponsor stops when its memorandum ends; future and unpublished ads wait.
select pg_temp.logout();
update governance.partners set status = 'lapsed' where id = '00000000-0000-0000-0000-0000000ad0a1';
insert into journal.ads (kind, headline_en, url, is_published, starts_on)
  values ('society', 'Next week', '/events', true, current_date + 7);
insert into journal.ads (kind, headline_en, url) values ('society', 'Draft', '/events');
select pg_temp.login_anon();
select results_eq(
  $$select headline_en from journal.current_ads()$$,
  $$values ('Join the Society'::text)$$,
  'Lapsed sponsors, future ads and drafts are not shown'
);

select pg_temp.logout();
select throws_ok(
  $$insert into governance.partner_agreements (partner_id, purpose_en, starts_on, grants)
    values ('00000000-0000-0000-0000-0000000ad0a2', 'Billboards.', current_date, '{billboards}')$$,
  '23514', null, 'A memorandum grants only the known platform rights'
);

-- Third-party apps without the journal area see nothing.
select pg_temp.login_as('00000000-0000-0000-0000-0000000ad002', '{"client_id": "00000000-0000-0000-0000-0000000000c1"}');
select is((select count(*) from journal.ads)::integer, 0, 'An app without the journal area reads no ads');

select * from finish();
rollback;
