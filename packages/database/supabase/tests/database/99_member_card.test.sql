-- The membership card (its number, its code, the public check and check-in
-- by card), names in both languages, and member details.
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

select plan(24);

select pg_temp.make_user('00000000-0000-0000-0000-00000000ca01', 'card.one@auib.edu.iq', 'Card One');
select pg_temp.make_user('00000000-0000-0000-0000-00000000ca02', 'card.two@auib.edu.iq', 'Card Two');
select pg_temp.make_user('00000000-0000-0000-0000-00000000ca03', 'door@auib.edu.iq', 'Door');
select pg_temp.make_user('00000000-0000-0000-0000-00000000ca04', 'secretary@auib.edu.iq', 'Secretary');
select pg_temp.make_user('00000000-0000-0000-0000-00000000ca05', 'guest@example.com', 'Guest');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000ca04', 'general_secretary');

-- Cards
select ok(
  (select number from membership.cards where user_id = '00000000-0000-0000-0000-00000000ca02')
    > (select number from membership.cards where user_id = '00000000-0000-0000-0000-00000000ca01'),
  'Members get their card numbers in the order they joined'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000ca01');
select is((select count(*)::integer from membership.my_card()), 1, 'A member reads their own card');
select throws_ok($$ select * from membership.cards $$, '42501', null,
  'Nobody reads the cards table directly');
create temp table first_code on commit drop as select code from membership.my_card();
grant select on first_code to public;

select pg_temp.login_anon();
select is(
  (select full_name_en from membership.verify_card((select code from first_code))),
  'Card One', 'Anyone with the link sees whose card it is'
);
select ok((select active from membership.verify_card((select code from first_code))),
  'and that the membership stands');
select is((select count(*)::integer from membership.verify_card('not-a-code')), 0,
  'An unknown code finds nothing');

select pg_temp.login_as('00000000-0000-0000-0000-00000000ca01');
select ok((select code from membership.reissue_card()) <> (select code from first_code),
  'Reissuing gives a new code');
select pg_temp.login_anon();
select is((select count(*)::integer from membership.verify_card((select code from first_code))), 0,
  'and the old link stops working');

select pg_temp.login_as('00000000-0000-0000-0000-00000000ca05', '{"aal":"aal1"}');
select throws_ok($$ select * from membership.my_card() $$, '42501', null,
  'Someone who is not a member has no card');

-- Check-in by card
select pg_temp.logout();
insert into events.events (id, slug, programme_id, title_en, title_ar, starts_at, status) values
  ('e0000000-0000-0000-0000-0000000000ca', 'card-night', (select id from core.programmes where slug = 'open-pages'),
    'Card Night', 'ليلة البطاقة', now() + interval '1 day', 'published');
insert into events.event_staff (event_id, user_id) values
  ('e0000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-00000000ca03');

select pg_temp.login_as('00000000-0000-0000-0000-00000000ca02');
select throws_ok(
  $$ select * from events.check_in_card('e0000000-0000-0000-0000-0000000000ca',
    (select code from membership.cards where false), '00000000') $$,
  '42501', null, 'Only the event''s door staff check people in by card'
);
select pg_temp.logout();
create temp table second_code on commit drop as
  select code, private.totp(secret, floor(extract(epoch from now()) / 30)::bigint) as live,
    private.totp(secret, floor(extract(epoch from now()) / 30)::bigint - 5) as stale
  from membership.cards where user_id = '00000000-0000-0000-0000-00000000ca02';
grant select on second_code to public;
select pg_temp.login_as('00000000-0000-0000-0000-00000000ca03');
select throws_ok(
  $$ select * from events.check_in_card('e0000000-0000-0000-0000-0000000000ca',
    (select code from second_code), (select stale from second_code)) $$,
  '22023', 'card_not_live', 'A screenshot from minutes ago does not check in'
);
select is(
  (select full_name_en from events.check_in_card('e0000000-0000-0000-0000-0000000000ca',
    (select code from second_code), (select live from second_code))),
  'Card Two', 'Door staff check a member in by their live card'
);
select pg_temp.login_anon();
select ok((select live from membership.verify_card((select code from second_code), (select live from second_code))),
  'The check page says a live code is live');
select ok(not (select live from membership.verify_card((select code from second_code))),
  'and a code without its digits is not');
select pg_temp.logout();
select is(private.totp(convert_to('12345678901234567890', 'UTF8'), 1), '94287082',
  'The live code follows RFC 6238 (its SHA-1 test vector at 59 seconds)');
select is(private.totp(convert_to('12345678901234567890', 'UTF8'), 66666666), '69279037',
  'and at 2,000,000,000 seconds');

-- Names
select pg_temp.login_as('00000000-0000-0000-0000-00000000ca01');
update core.profiles set first_name_en = '  Layla ', father_name_en = 'Omar',
  grandfather_name_en = 'Ali', last_name_en = 'Hassan',
  first_name_ar = 'ليلى', father_name_ar = 'عمر', grandfather_name_ar = 'علي', last_name_ar = 'حسن'
where id = '00000000-0000-0000-0000-00000000ca01';
select is((select full_name_en from core.profiles where id = '00000000-0000-0000-0000-00000000ca01'),
  'Layla Hassan', 'A member gives their name in four parts; the first and fourth show');
select is((select full_name_ar from core.profiles where id = '00000000-0000-0000-0000-00000000ca01'),
  'ليلى حسن', 'and in Arabic');

-- Details
insert into core.member_details (affiliation, interests, research_consent)
values ('student', array['poetry', 'theater'], true);
select is((select affiliation from core.member_details), 'student',
  'A member keeps their own details');
select throws_ok(
  $$ insert into core.member_details (user_id, affiliation)
     values ('00000000-0000-0000-0000-00000000ca02', 'student') $$,
  '42501', null, 'but not anyone else''s'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000ca02');
select is((select count(*)::integer from core.member_details), 0,
  'Members do not read each other''s details');

select pg_temp.login_as('00000000-0000-0000-0000-00000000ca04');
select is(((core.member_insights()) ->> 'counted')::integer, 1,
  'Member managers see counts of the members who agreed to be counted');

-- The card's record: hidden unless the member turns it on.
select pg_temp.logout();
insert into membership.certificates (id, user_id, kind, role_en, period_from, period_to)
values ('00000000-0000-0000-0000-00000000cafe', '00000000-0000-0000-0000-00000000ca02',
  'service', 'Door Coordinator', current_date - 200, current_date - 10);
alter table membership.certificates disable trigger user;
update membership.certificates set status = 'issued', issued_at = now(),
  serial = 'SAL-2026-901', verification_code = 'cardrecord1',
  president_signed_by = '00000000-0000-0000-0000-00000000ca04',
  advisor_signed_by = '00000000-0000-0000-0000-00000000ca03'
where id = '00000000-0000-0000-0000-00000000cafe';
alter table membership.certificates enable trigger user;
select pg_temp.login_anon();
select is((select count(*)::integer from membership.card_record((select code from second_code))), 0,
  'A card''s check page lists no certificates by default');
select pg_temp.login_as('00000000-0000-0000-0000-00000000ca02');
update core.profiles set show_certificates_on_card = true
where id = '00000000-0000-0000-0000-00000000ca02';
select pg_temp.login_anon();
select is((select serial from membership.card_record((select code from second_code))), 'SAL-2026-901',
  'and lists them once the member turns it on');
select pg_temp.logout();

select * from finish();
rollback;
