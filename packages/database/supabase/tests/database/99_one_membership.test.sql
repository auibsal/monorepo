-- One membership, of one kind: member, guest or partner. The Society
-- invites its own guests; every kind carries the card; staff is a member
-- holding a Society role; the Callboard is read by anyone.
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

select plan(29);

select pg_temp.make_user('00000000-0000-0000-0000-0000000000a1', 'membership-om@auib.edu.iq', 'Membership');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000a2', 'member-om@auib.edu.iq', 'Plain Member');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000b1', 'friend@example.org', 'Society Friend');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000c1', 'lead@club.org', 'Club Lead');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000b2', 'linked@example.org', 'Link Guest');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000000a1', 'membership_director');

insert into governance.partners (id, slug, name_en, kind, is_listed, status)
values ('00000000-0000-0000-0000-00000000d001', 'club-om', 'The Club', 'club', true, 'active');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000000c1', 'partner_lead', 'partner', '00000000-0000-0000-0000-00000000d001');

-- ── Kinds ───────────────────────────────────────────────────────────────────
select is(private.membership_kind('00000000-0000-0000-0000-0000000000a2'), 'member', 'An AUIB address is a member');
select is(private.membership_kind('00000000-0000-0000-0000-0000000000c1'), 'partner', 'A partner''s Lead holds a partner''s membership');
select is(private.membership_kind('00000000-0000-0000-0000-0000000000b1'), null, 'An invited address holds nothing until it accepts');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select results_eq(
  $$ select kind, staff from membership.my_membership() $$,
  $$ values ('member'::text, true) $$,
  'A member holding a Society role is staff'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a2');
select results_eq(
  $$ select kind, staff from membership.my_membership() $$,
  $$ values ('member'::text, false) $$,
  'A member without a role is not staff'
);

-- ── The Society's own guests ────────────────────────────────────────────────
select throws_ok(
  $$ insert into governance.partner_invitations (kind, email) values ('guest', 'someone@example.org') $$,
  '42501', null, 'A member without members.manage cannot invite the Society''s guests'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select lives_ok(
  $$ insert into governance.partner_invitations (kind, email) values ('guest', 'friend@example.org') $$,
  'Membership invites a guest of the Society, with no partner'
);
select throws_ok(
  $$ insert into governance.partner_invitations (kind, email) values ('guest', 'student@auib.edu.iq') $$,
  '22023', 'auib_is_membership', 'An AUIB address is never invited as a guest'
);
select throws_ok(
  $$ insert into governance.partner_invitations (kind, email) values ('team', 'x@example.org') $$,
  '23514', null, 'Only a partner has a team'
);
select lives_ok(
  $$ insert into governance.partner_invitations (kind) values ('guest') $$,
  'Membership makes a shareable link for guests'
);
select pg_temp.logout();
select set_config('test.friend', (select code from governance.partner_invitations where email = 'friend@example.org'), true);
select set_config('test.link', (select code from governance.partner_invitations where partner_id is null and email is null), true);

select ok(
  private.sign_up_allowed('friend@example.org', jsonb_build_object('invitation', current_setting('test.friend'))),
  'The Society''s invitation lets its address sign up'
);
select ok(
  not private.sign_up_allowed('other@example.org', jsonb_build_object('invitation', current_setting('test.friend'))),
  'but not another address'
);

select pg_temp.login_anon();
select results_eq(
  $$ select partner_name_en, kind, usable from governance.partner_invitation(current_setting('test.friend')) $$,
  $$ values (null::text, 'guest'::text, true) $$,
  'An invitation from the Society names no partner'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000b1');
select is(governance.accept_partner_invitation(current_setting('test.friend')), 'guest', 'The friend accepts');
select pg_temp.logout();
select is(private.membership_kind('00000000-0000-0000-0000-0000000000b1'), 'guest', 'and is the Society''s guest at once');
select pg_temp.login_as('00000000-0000-0000-0000-0000000000b2');
select is(governance.accept_partner_invitation(current_setting('test.link')), 'guest', 'A link from the Society welcomes its guest too');

-- ── One kind only ───────────────────────────────────────────────────────────
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a2');
select throws_ok(
  $$ select governance.accept_partner_invitation(current_setting('test.link')) $$,
  '42501', 'one_membership', 'A member cannot also be a guest'
);
select pg_temp.logout();
select lives_ok(
  $$ select pg_temp.grant_role('00000000-0000-0000-0000-0000000000a2', 'partner_rep', 'partner', '00000000-0000-0000-0000-00000000d001') $$,
  'A member may also be on their club''s team'
);
select is(private.membership_kind('00000000-0000-0000-0000-0000000000a2'), 'member', 'and stays a member');
select throws_ok(
  $$ select pg_temp.grant_role('00000000-0000-0000-0000-0000000000b1', 'partner_rep', 'partner', '00000000-0000-0000-0000-00000000d001') $$,
  '42501', 'one_membership', 'A guest is never on a partner''s team'
);
select throws_ok(
  $$ insert into governance.partner_affiliations (partner_id, user_id, status)
     values ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-0000000000c1', 'verified') $$,
  '42501', 'one_membership', 'A partner''s Lead cannot also be a guest'
);
select throws_ok(
  $$ select pg_temp.grant_role('00000000-0000-0000-0000-0000000000b1', 'events_lead') $$,
  '42501', 'one_membership', 'A guest holds none of the Society''s roles'
);

-- ── The card, for every kind ────────────────────────────────────────────────
select pg_temp.login_as('00000000-0000-0000-0000-0000000000b1');
select isnt((select number from membership.my_card()), null, 'A guest has the card');
select pg_temp.logout();
select set_config('test.card', (select code from membership.cards where user_id = '00000000-0000-0000-0000-0000000000b1'), true);
select pg_temp.login_anon();
select results_eq(
  $$ select kind, staff, active from membership.verify_card(current_setting('test.card')) $$,
  $$ values ('guest'::text, false, true) $$,
  'The check says the card is a guest''s'
);

-- ── The Callboard, read by anyone ───────────────────────────────────────────
select pg_temp.logout();
insert into programmes.openings (kind, owner, title_en, title_ar)
values ('volunteer', 'membership', 'Fair volunteers', 'متطوعو المعرض');
select pg_temp.login_anon();
select results_eq(
  $$ select kind, title_en from programmes.open_places() where title_en = 'Fair volunteers' $$,
  $$ values ('volunteer'::text, 'Fair volunteers'::text) $$,
  'A visitor reads the open places, volunteering among them'
);

-- Get involved is one list (owner, Oct 31, 2026): the Company's coming
-- auditions are in it, for a public production that is auditioning only.
select pg_temp.logout();
insert into programmes.productions (slug, programme_id, title_en, title_ar, stage, is_public, rights_status)
values
  ('om-open-play', (select id from core.programmes where slug = 'company'), 'Open Play', 'مسرحية مفتوحة', 'auditions', true, 'pending'),
  ('om-hidden-play', (select id from core.programmes where slug = 'company'), 'Hidden Play', 'مسرحية خفية', 'auditions', false, 'pending');
insert into programmes.auditions (production_id, starts_at, ends_at)
select id, now() + interval '3 days', now() + interval '3 days 2 hours'
from programmes.productions where slug in ('om-open-play', 'om-hidden-play');
select pg_temp.login_anon();
select results_eq(
  $$ select kind, title_en from programmes.open_places() where kind = 'audition' and title_en like '%Play' $$,
  $$ values ('audition'::text, 'Open Play'::text) $$,
  'A public production''s coming audition is among the open places'
);
select ok(
  (select closes_at from programmes.open_places() where title_en = 'Open Play') > now(),
  'and it is listed by its day'
);

-- ── Signing in ──────────────────────────────────────────────────────────────
select pg_temp.logout();
select ok(private.account_exists('MEMBER-om@auib.edu.iq'), 'An account is found by its address');
select ok(not private.account_exists('nobody@auib.edu.iq'), 'and an unknown address is not');

select * from finish();
rollback;
