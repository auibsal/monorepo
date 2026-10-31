-- Partners on the platform: they apply with the memorandum signed by name,
-- the Society signs without an uploaded copy, and each partner keeps its own
-- page (profile, perks, team, guests) under Row Level Security.
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

select plan(27);

select pg_temp.make_user('00000000-0000-0000-0000-0000000000a1', 'director-pa@auib.edu.iq');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a2', 'president-pa@auib.edu.iq');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a4', 'member-pa@auib.edu.iq');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000c1', 'head@poetryclub.org', 'Club Head');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000c2', 'deputy@poetryclub.org', 'Club Deputy');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000c3', 'head@otherclub.org', 'Other Head');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000b1', 'poet@poetryclub.org', 'Club Poet');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000000a1', 'partnerships_director');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000000a2', 'president');

-- ── Applying ────────────────────────────────────────────────────────────────
select pg_temp.login_as('00000000-0000-0000-0000-0000000000c1');
select throws_ok(
  $$ select governance.apply_as_partner('Poetry Club', null, 'cultural', 'iraq', null, 'Poetry in Erbil.', null,
       'Joint readings.', 'We host readings.', '{member_offer}', 'Club Head', 'Chair', false) $$,
  '22023', 'memorandum_not_accepted',
  'An application needs the memorandum accepted'
);
select throws_ok(
  $$ select governance.apply_as_partner('Poetry Club', null, 'cultural', 'iraq', null, null, null,
       'Joint readings.', null, '{guest_editing}', 'Club Head', null, true) $$,
  '22023', 'invalid_grants',
  'Guest editing is offered by the Society, never asked for'
);
select lives_ok(
  $$ select governance.apply_as_partner('Poetry Club', 'نادي الشعر', 'cultural', 'iraq', 'https://poetryclub.org',
       'Poetry in Erbil.', null, 'Joint readings.', 'We host readings.', '{member_offer,journal_submissions}',
       'Club Head', 'Chair', true) $$,
  'An organization applies, its signatory signing by name'
);
select throws_ok(
  $$ select governance.apply_as_partner('Poetry Club', null, 'cultural', 'iraq', null, null, null,
       'Again.', null, '{}', 'Club Head', null, true) $$,
  '23505', 'already_applied',
  'and cannot apply twice while it waits'
);
select is(
  (select partner_status || '/' || agreement_status from governance.my_partner_application()),
  'prospect/draft',
  'The applicant sees the application waiting'
);
select is((select count(*)::int from governance.partners), 0,
  'and does not read the register before the Society signs');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000c3');
select lives_ok(
  $$ select governance.apply_as_partner('Other Club', null, 'club', 'auib', null, null, null,
       'Something.', null, '{}', 'Other Head', null, true) $$,
  'A second organization applies'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a4');
select is((select count(*)::int from governance.partner_applications()), 0,
  'Members do not see applications');

-- ── The Society's queue ─────────────────────────────────────────────────────
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select is((select array_agg(slug order by slug) from governance.partner_applications()),
  array['other-club', 'poetry-club'],
  'The Director of Partnerships sees both applications');
select lives_ok(
  $$ select governance.decline_partner_application((select id from governance.partners where slug = 'other-club'), 'Not a fit.') $$,
  'and declines one'
);
select set_config('test.other_club', (select id::text from governance.partners where slug = 'other-club'), false);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a2');
select lives_ok(
  $$ select governance.sign_partner_agreement(
       (select agreement_id from governance.partner_applications() where slug = 'poetry-club'), null, null) $$,
  'The President signs, with no uploaded copy'
);
select is((select count(*)::int from governance.partner_applications()), 0,
  'and the queue is empty');

-- ── The partner keeps its own ───────────────────────────────────────────────
select pg_temp.login_as('00000000-0000-0000-0000-0000000000c1');
select is((select array_agg(slug) from governance.my_partners()), array['poetry-club'],
  'Whoever applied becomes the partner''s representative');
select is((select array_agg(slug) from governance.partners), array['poetry-club'],
  'and reads its own partner only');
select lives_ok(
  $$ update governance.partners set description_en = 'Poetry in Erbil since 2020.' where slug = 'poetry-club' $$,
  'edits its profile'
);
select throws_ok(
  $$ update governance.partners set is_listed = true where slug = 'poetry-club' $$,
  '42501', 'kept_by_the_society',
  'but not its listing'
);
select lives_ok(
  $$ insert into governance.member_offers (partner_id, title_en, details_en, is_published)
     values ((select id from governance.partners where slug = 'poetry-club'), 'Free readings', 'Show your card.', true) $$,
  'adds a member perk'
);
select throws_ok(
  $$ insert into governance.member_offers (partner_id, title_en, details_en)
     values (current_setting('test.other_club')::uuid, 'x', 'y') $$,
  '42501', null,
  'but never to another partner'
);

-- Guests: the partner verifies its own people.
select pg_temp.login_as('00000000-0000-0000-0000-0000000000b1');
insert into governance.partner_affiliations (partner_id, note)
values ((select id from governance.joinable_partners() limit 1), 'Member since 2024');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000c1');
select is(
  (select email from governance.partner_guests((select id from governance.my_partners() limit 1))),
  'poet@poetryclub.org',
  'The partner sees who asked to be verified'
);
select lives_ok(
  $$ update governance.partner_affiliations set status = 'verified'
     where user_id = '00000000-0000-0000-0000-0000000000b1' $$,
  'and verifies them'
);
select is(
  (select decided_by from governance.partner_affiliations where user_id = '00000000-0000-0000-0000-0000000000b1'),
  '00000000-0000-0000-0000-0000000000c1'::uuid,
  'recorded as the partner''s decision'
);
select throws_ok(
  $$ update governance.partner_affiliations set note = 'Changed'
     where user_id = '00000000-0000-0000-0000-0000000000b1' $$,
  '42501', 'affiliation_fixed',
  'but cannot rewrite what the person said'
);

-- Team.
select lives_ok(
  $$ select governance.add_partner_teammate((select id from governance.my_partners() limit 1), 'Deputy@PoetryClub.org') $$,
  'The representative adds a teammate by sign-in address'
);
select throws_ok(
  $$ select governance.add_partner_teammate((select id from governance.my_partners() limit 1), 'nobody@poetryclub.org') $$,
  'P0002', 'no_account',
  'who must have an account'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000c2');
select lives_ok(
  $$ select governance.remove_partner_teammate((select id from governance.my_partners() limit 1),
       '00000000-0000-0000-0000-0000000000c1') $$,
  'A teammate removes another'
);
select throws_ok(
  $$ select governance.remove_partner_teammate((select id from governance.my_partners() limit 1),
       '00000000-0000-0000-0000-0000000000c2') $$,
  '22023', 'last_teammate',
  'but a partner always keeps one representative'
);

select pg_temp.logout();
set local role service_role;
select ok(
  not exists (select 1 from access.officer_directory() where email = 'deputy@poetryclub.org'),
  'Partner representatives are not officers'
);

select * from finish();
rollback;
