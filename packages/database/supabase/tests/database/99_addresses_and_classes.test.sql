-- Addresses and classes: an AUIB address added later (a code, or the
-- Director), leaving AUIB, two accounts made one, and sign-ups never
-- confirmed.
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

select plan(38);

-- ── Sign-ups never confirmed ─────────────────────────────────────────────
insert into auth.users (id, email, created_at, raw_user_meta_data, aud, role) values
  ('ad000000-0000-0000-0000-000000000008', '1250008@auib.edu.iq', now() - interval '8 days', '{}', 'authenticated', 'authenticated'),
  ('ad000000-0000-0000-0000-000000000009', '1250009@auib.edu.iq', now(), '{}', 'authenticated', 'authenticated'),
  ('ad000000-0000-0000-0000-000000000010', '125001@auib.edu.iq', now(),
    jsonb_build_object('sign_up_key', encode(extensions.digest(repeat('k', 40), 'sha256'), 'hex')),
    'authenticated', 'authenticated');

select is(private.purge_unconfirmed_sign_ups(), 1, 'A sign-up never confirmed goes after seven days');
select ok(exists (select 1 from auth.users where id = 'ad000000-0000-0000-0000-000000000009'),
  'A newer one waits');
select is(core.drop_unconfirmed_sign_up('125001@auib.edu.iq', repeat('x', 40)), false,
  '"Wrong address?" needs the key the browser kept');
select is(core.drop_unconfirmed_sign_up('125001@AUIB.edu.iq', repeat('k', 40)), true,
  'With it, the mistyped sign-up is deleted at once');
select ok(not exists (select 1 from auth.users where id = 'ad000000-0000-0000-0000-000000000010'),
  'and the address is free');
select is((select runs from private.retention_schedule() where rule = 'Sign-ups never confirmed'),
  'private.purge_unconfirmed_sign_ups', 'The retention schedule runs it');

-- ── An AUIB address added later, by code ────────────────────────────────
select pg_temp.make_user('ad000000-0000-0000-0000-000000000001', 'ad.one@example.com', 'One');
insert into membership.guests (user_id) values ('ad000000-0000-0000-0000-000000000001');
select pg_temp.make_user('ad000000-0000-0000-0000-000000000002', '1250002@auib.edu.iq', 'Two');

select pg_temp.login_as('ad000000-0000-0000-0000-000000000001');
select throws_ok($$ select core.request_auib_address('ad.one@gmail.com') $$,
  '22023', 'email_not_auib', 'Only an AUIB address');
select throws_ok($$ select core.request_auib_address('1250002@auib.edu.iq') $$,
  '23505', 'email_has_account', 'An address with an account of its own is a merge instead');
select lives_ok($$ select core.request_auib_address(' 1250001@AUIB.edu.iq ') $$,
  'A guest asks to add their AUIB address');
select is((select auib_pending from core.my_addresses()), '1250001@auib.edu.iq',
  'Settings shows the code is on its way');
select throws_ok($$ select core.request_auib_address('1250001@auib.edu.iq') $$,
  '22023', 'too_soon', 'Not twice in a minute');
select throws_ok($$ select core.confirm_auib_address('000000x') $$,
  '22023', 'invalid_code', 'A wrong code is refused');
select pg_temp.logout();
select is((select count(*)::integer from core.outbox where kind = 'address.code'), 1,
  'The code goes to the AUIB address');

select set_config('test.code',
  (select code from core.address_codes where user_id = 'ad000000-0000-0000-0000-000000000001'), true);
select pg_temp.login_as('ad000000-0000-0000-0000-000000000001');
select is(core.confirm_auib_address(current_setting('test.code')),
  'member', 'With the code, a student''s address makes a Member');
select pg_temp.logout();
select is((select email::text from auth.users where id = 'ad000000-0000-0000-0000-000000000001'),
  '1250001@auib.edu.iq', 'The AUIB address is the sign-in now');
select is((select personal_email || ' ' || (personal_email_verified_at is not null)::text
  from core.profiles where id = 'ad000000-0000-0000-0000-000000000001'),
  'ad.one@example.com true', 'and the old one the confirmed personal email');
select ok(not private.is_guest('ad000000-0000-0000-0000-000000000001'), 'They are a guest no longer');
select is((select count(*)::integer from core.outbox where kind = 'account.sign_in_moved'), 1,
  'Both addresses are told');

-- The Director of Membership, from the Register.
select pg_temp.make_user('ad000000-0000-0000-0000-000000000006', 'director.ad@auib.edu.iq', 'Director');
select pg_temp.grant_role('ad000000-0000-0000-0000-000000000006', 'membership_director');
select pg_temp.make_user('ad000000-0000-0000-0000-000000000007', 'ad.seven@example.com', 'Seven');
select pg_temp.login_as('ad000000-0000-0000-0000-000000000002');
select throws_ok($$ select membership.set_auib_address('ad000000-0000-0000-0000-000000000007', 'ad.seven@auib.edu.iq') $$,
  '42501', null, 'Only the Director of Membership adds it for someone');
select pg_temp.login_as('ad000000-0000-0000-0000-000000000006');
select is(membership.set_auib_address('ad000000-0000-0000-0000-000000000007', 'Ad.Seven@auib.edu.iq'),
  'associate', 'A staff address the Director adds makes an Associate');
select pg_temp.logout();

-- ── Leaving AUIB ────────────────────────────────────────────────────────
select pg_temp.login_as('ad000000-0000-0000-0000-000000000002');
select is(core.report_leaving(true), 'associate', 'A student says they graduated: an Associate');
select ok((select left_auib_at is not null and sign_in_auib
  from core.my_addresses()), 'With no personal email the AUIB address stays the sign-in, for now');
select ok((select left_auib_at is not null and not personal_verified from core.my_addresses()),
  'and Today asks for a personal email');
select throws_ok($$ select core.report_leaving(true) $$, 'P0002', 'not_a_student_member',
  'Once is enough');
select lives_ok($$ select core.request_personal_email('ad.two@example.com') $$, 'They add one');
select pg_temp.logout();
select is(core.confirm_personal_email(
  (select token from core.personal_email_requests where user_id = 'ad000000-0000-0000-0000-000000000002')),
  'signed_in', 'Confirming it makes it the sign-in');
select is((select email::text from auth.users where id = 'ad000000-0000-0000-0000-000000000002'),
  'ad.two@example.com', 'The personal email is the sign-in now');

-- The Director records it, for a member who has a personal email.
select pg_temp.make_user('ad000000-0000-0000-0000-000000000003', '1250003@auib.edu.iq', 'Three');
update core.profiles set personal_email = 'ad.three@example.com', personal_email_verified_at = now()
where id = 'ad000000-0000-0000-0000-000000000003';
select pg_temp.login_as('ad000000-0000-0000-0000-000000000006');
select is(membership.record_departure('ad000000-0000-0000-0000-000000000003', false), 'associate',
  'The Director records a student who left without graduating');
select pg_temp.logout();
select is((select email::text from auth.users where id = 'ad000000-0000-0000-0000-000000000003'),
  'ad.three@example.com', 'Their personal email becomes the sign-in at once');
select is((select left_graduated from membership.memberships where user_id = 'ad000000-0000-0000-0000-000000000003'),
  false, 'The record says they did not graduate');

-- ── Two accounts, one person ────────────────────────────────────────────
select pg_temp.make_user('ad000000-0000-0000-0000-000000000004', 'ad.four@example.com', 'Four');
insert into membership.guests (user_id) values ('ad000000-0000-0000-0000-000000000004');
insert into membership.verification_requests (user_id, email)
values ('ad000000-0000-0000-0000-000000000004', 'ad.four@example.com');
select pg_temp.make_user('ad000000-0000-0000-0000-000000000005', '1250005@auib.edu.iq', 'Five');

select pg_temp.login_as('ad000000-0000-0000-0000-000000000005');
select throws_ok($$ select core.request_merge('nobody@example.com') $$, 'P0002', 'no_account',
  'A merge needs another account at that address');
select lives_ok($$ select core.request_merge('ad.four@example.com') $$,
  'From one account, the person asks to merge the other');
select pg_temp.logout();
select set_config('test.code', (select code from core.address_codes
  where user_id = 'ad000000-0000-0000-0000-000000000005' and purpose = 'merge'), true);
select pg_temp.login_as('ad000000-0000-0000-0000-000000000005');
select ok(core.prove_merge(current_setting('test.code')) is not null, 'The code sent to the other address proves it');
select throws_ok($$ select membership.decide_merge((select id from membership.merge_requests limit 1), true) $$,
  '42501', null, 'They cannot approve it themselves');
select pg_temp.login_as('ad000000-0000-0000-0000-000000000006');
select is((select count(*)::integer from membership.merge_requests()), 1,
  'The Director sees the request');
select is(membership.decide_merge((select id from membership.merge_requests() limit 1), true),
  'ad000000-0000-0000-0000-000000000004'::uuid, 'Approved: the account with the older number stays');
select pg_temp.logout();
select is((select email::text from auth.users where id = 'ad000000-0000-0000-0000-000000000004'),
  '1250005@auib.edu.iq', 'It signs in with the AUIB address');
select ok(not exists (select 1 from auth.users where id = 'ad000000-0000-0000-0000-000000000005')
  and (select tier::text from membership.memberships where user_id = 'ad000000-0000-0000-0000-000000000004') = 'member'
  and exists (select 1 from membership.verification_requests where user_id = 'ad000000-0000-0000-0000-000000000004'),
  'The other account is gone, its membership and records moved onto the one that stays');

select * from finish();
rollback;
