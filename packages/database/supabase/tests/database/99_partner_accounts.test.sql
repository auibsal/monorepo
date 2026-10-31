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

select plan(41);

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
select pg_temp.logout();
select is(
  (select partner_signatory from governance.partner_agreements a
   join governance.partners p on p.id = a.partner_id where p.name_en = 'Poetry Club'),
  'Club Head',
  'The memorandum is signed in the applicant''s name on the platform, not a typed one'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000c1');
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

-- Guests come through the partner's invitations: a shareable link leaves
-- them waiting for the partner to verify them.
select lives_ok(
  $$ insert into governance.partner_invitations (partner_id, kind)
     values ((select id from governance.my_partners() limit 1), 'guest') $$,
  'The Lead makes a shareable guest link'
);
select set_config('test.link', (select code from governance.partner_invitations where kind = 'guest'), false);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000b1');
select is(governance.accept_partner_invitation(current_setting('test.link')), 'guest',
  'Someone follows the link');
select ok(not core.is_partner_guest(), 'and waits for the partner');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000c1');
select is(
  (select email from governance.partner_guests((select id from governance.my_partners() limit 1))),
  'poet@poetryclub.org',
  'The partner sees who is waiting'
);
select lives_ok(
  $$ update governance.partner_affiliations set status = 'verified'
     where user_id = '00000000-0000-0000-0000-0000000000b1' $$,
  'and verifies them'
);
select throws_ok(
  $$ update governance.partner_affiliations set note = 'Changed'
     where user_id = '00000000-0000-0000-0000-0000000000b1' $$,
  '42501', 'affiliation_fixed',
  'but cannot rewrite what the person said'
);

-- A verified guest sees perks and books places, like a member.
select pg_temp.login_as('00000000-0000-0000-0000-0000000000b1');
select ok(core.is_partner_guest(), 'A verified guest is a partner''s guest');
select is((select count(*)::int from governance.member_offers), 1,
  'and sees partners'' perks');
select pg_temp.logout();
insert into events.events (id, slug, title_en, title_ar, starts_at, members_only, capacity, status, entry)
values ('e0000000-0000-0000-0000-0000000000f1', 'guest-reading', 'Reading', 'قراءة',
  now() + interval '3 days', false, 10, 'published', 'rsvp');
select pg_temp.login_as('00000000-0000-0000-0000-0000000000b1');
select is(events.rsvp('e0000000-0000-0000-0000-0000000000f1'), 'confirmed',
  'and books a place at an event');

-- Team: the Lead invites by address; only that address may accept.
select pg_temp.login_as('00000000-0000-0000-0000-0000000000c1');
select lives_ok(
  $$ insert into governance.partner_invitations (partner_id, kind, email)
     values ((select id from governance.my_partners() limit 1), 'team', 'Deputy@PoetryClub.org') $$,
  'The Lead invites a teammate by address'
);
select set_config('test.team', (select code from governance.partner_invitations where kind = 'team'), false);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000c3');
select throws_ok(
  $$ select governance.accept_partner_invitation(current_setting('test.team')) $$,
  '42501', 'invitation_for_another_address',
  'Nobody else can use it'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000c2');
select is(governance.accept_partner_invitation(current_setting('test.team')), 'team',
  'The teammate accepts');
select throws_ok(
  $$ insert into governance.partner_invitations (partner_id, kind, email)
     values ((select id from governance.my_partners() limit 1), 'team', 'third@poetryclub.org') $$,
  '42501', null,
  'Team members do not invite to the team'
);
select throws_ok(
  $$ select governance.remove_partner_teammate((select id from governance.my_partners() limit 1),
       '00000000-0000-0000-0000-0000000000c1') $$,
  '42501', 'not_allowed',
  'or remove the Lead'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000c1');
select throws_ok(
  $$ select governance.remove_partner_teammate((select id from governance.my_partners() limit 1),
       '00000000-0000-0000-0000-0000000000c1') $$,
  '22023', 'last_lead',
  'A partner always keeps a Lead'
);
select lives_ok(
  $$ select governance.set_partner_lead((select id from governance.my_partners() limit 1),
       '00000000-0000-0000-0000-0000000000c2', true) $$,
  'The Lead makes a teammate Lead'
);
select lives_ok(
  $$ select governance.remove_partner_teammate((select id from governance.my_partners() limit 1),
       '00000000-0000-0000-0000-0000000000c1') $$,
  'and may then leave'
);

-- Membership is for AUIB addresses: an outside sign-up needs an invitation
-- or a partner application.
select pg_temp.logout();
select ok(not private.sign_up_allowed('someone@gmail.com', '{}'),
  'An outside address cannot sign up on its own');
select ok(private.sign_up_allowed('friend@gmail.com',
  jsonb_build_object('invitation', current_setting('test.link'))),
  'but can with a partner''s invitation');
select ok(private.sign_up_allowed('club@example.org', '{"partner_applicant":"true"}'),
  'or to apply as a partner');
select ok(private.sign_up_allowed('student.2025@auib.edu.iq', '{}'),
  'and an AUIB address always can');

select pg_temp.logout();
set local role service_role;
select ok(
  not exists (select 1 from access.officer_directory() where email = 'deputy@poetryclub.org'),
  'Partner representatives are not officers'
);

select * from finish();
rollback;
