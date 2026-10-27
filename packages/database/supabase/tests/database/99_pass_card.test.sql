-- The IDEA Pass card at the door and on the Tour (migration 20261028000000).
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
select plan(19);

select pg_temp.make_user('00000000-0000-0000-0000-00000000fc01', 'holder@auib.edu.iq', 'Holder');
select pg_temp.make_user('00000000-0000-0000-0000-00000000fc02', 'door@auib.edu.iq', 'Door');
select pg_temp.make_user('00000000-0000-0000-0000-00000000fc03', 'other.door@auib.edu.iq', 'Other Door');
select pg_temp.make_user('00000000-0000-0000-0000-00000000fc04', 'tour@auib.edu.iq', 'Tour');
select pg_temp.grant_role('00000000-0000-0000-0000-00000000fc04', 'programme_lead', 'programme',
  (select id from core.programmes where slug = 'typewriter-tour'));

insert into events.events (id, slug, programme_id, title_en, title_ar, starts_at, status) values
  ('e0000000-0000-0000-0000-0000000000fc', 'pass-night', (select id from core.programmes where slug = 'open-pages'),
    'Pass Night', 'ليلة البطاقة', now() + interval '1 day', 'published');
insert into events.event_staff (event_id, user_id) values
  ('e0000000-0000-0000-0000-0000000000fc', '00000000-0000-0000-0000-00000000fc02'),
  ('e0000000-0000-0000-0000-0000000000fc', '00000000-0000-0000-0000-00000000fc03');
insert into membership.wallet_passes (code, user_id, state)
  values ('pass-card-wallet', '00000000-0000-0000-0000-00000000fc01', 'saved');

-- Only the API records scans and card pictures.
select pg_temp.login_as('00000000-0000-0000-0000-00000000fc02');
select throws_ok(
  $$ select * from access.record_pass_scan('pass-holder', '00000000-0000-0000-0000-00000000fc02') $$,
  '42501', null, 'officers cannot record a scan themselves'
);
select pg_temp.logout();

set local role service_role;
select is(access.pass_account('pass-holder', 'holder@auib.edu.iq'),
  '00000000-0000-0000-0000-00000000fc01'::uuid, 'the holder signs in with the Pass');
reset role;
select ok(
  exists (select 1 from core.outbox where kind = 'membership.wallet_expire'
    and payload -> 'codes' ? 'pass-card-wallet'),
  'and their Google Wallet pass for SAL''s card is retired'
);

set local role service_role;
select is((select count(*)::int from access.record_pass_scan('pass-nobody', '00000000-0000-0000-0000-00000000fc02')),
  0, 'a Pass never used with SAL names nobody');
create temp table scans (name text, id uuid) on commit drop;
grant select on scans to public;
insert into scans select 'door', scan from access.record_pass_scan('pass-holder', '00000000-0000-0000-0000-00000000fc02');
insert into scans select 'other', scan from access.record_pass_scan('pass-holder', '00000000-0000-0000-0000-00000000fc02');
insert into scans select 'old', scan from access.record_pass_scan('pass-holder', '00000000-0000-0000-0000-00000000fc02');
insert into scans select 'tour', scan from access.record_pass_scan('pass-holder', '00000000-0000-0000-0000-00000000fc04');
insert into scans select 'attach', scan from access.record_pass_scan('pass-holder', '00000000-0000-0000-0000-00000000fc04');
select is((select count(*)::int from scans), 5, 'a linked Pass names its SAL account');
select lives_ok(
  $$ select access.pass_card('pass-holder', '<svg>en</svg>', '<svg>ar</svg>') $$,
  'the card''s picture is kept'
);
reset role;
update access.pass_scans set created_at = now() - interval '3 minutes'
where id = (select id from scans where name = 'old');

-- Who may scan at all.
select pg_temp.login_as('00000000-0000-0000-0000-00000000fc01');
select ok(not access.can_scan_passes(), 'members do not scan cards');
select pg_temp.login_as('00000000-0000-0000-0000-00000000fc02');
select ok(access.can_scan_passes(), 'an event''s door staff do');
select pg_temp.login_as('00000000-0000-0000-0000-00000000fc04');
select ok(access.can_scan_passes(), 'and so does whoever runs the Tour');

-- The door.
select pg_temp.login_as('00000000-0000-0000-0000-00000000fc03');
select throws_ok(
  $$ select * from events.check_in_pass('e0000000-0000-0000-0000-0000000000fc', (select id from scans where name = 'door')) $$,
  'P0002', 'scan_expired', 'a scan is spent only by the officer who made it'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000fc01');
select throws_ok(
  $$ select * from events.check_in_pass('e0000000-0000-0000-0000-0000000000fc', (select id from scans where name = 'door')) $$,
  '42501', null, 'only the event''s door staff check people in'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000fc02');
select is(
  (select full_name_en from events.check_in_pass('e0000000-0000-0000-0000-0000000000fc', (select id from scans where name = 'door'))),
  'Holder', 'door staff check a member in by their Pass'
);
select throws_ok(
  $$ select * from events.check_in_pass('e0000000-0000-0000-0000-0000000000fc', (select id from scans where name = 'door')) $$,
  'P0002', 'scan_expired', 'a scan is spent once'
);
select throws_ok(
  $$ select * from events.check_in_pass('e0000000-0000-0000-0000-0000000000fc', (select id from scans where name = 'old')) $$,
  'P0002', 'scan_expired', 'and within two minutes'
);
select is((select count(*)::int from access.pass_scans), 3, 'officers read only their own scans');

-- The Tour.
select pg_temp.login_as('00000000-0000-0000-0000-00000000fc04');
create temp table signed on commit drop as
  select programmes.record_six_words_pass('ink and the night between us', 'en',
    (select id from scans where name = 'tour')) as id;
grant select on signed to public;
select is(
  (select user_id from programmes.six_words where id = (select id from signed)),
  '00000000-0000-0000-0000-00000000fc01'::uuid,
  'a card signed with the Pass is the member''s six words'
);
create temp table unsigned on commit drop as
  select programmes.record_six_words('one more card from the road', 'en') as id;
grant select on unsigned to public;
select lives_ok(
  $$ select programmes.attach_six_words_pass((select id from unsigned), (select id from scans where name = 'attach')) $$,
  'an unsigned card is attached by scanning the Pass'
);
select is(
  (select count(*)::int from programmes.six_words where user_id = '00000000-0000-0000-0000-00000000fc01'),
  1, 'and replaces the member''s earlier six words'
);

-- The card's picture reaches its holder.
select pg_temp.login_as('00000000-0000-0000-0000-00000000fc01');
select is((select card_svg_ar from access.pass_links), '<svg>ar</svg>',
  'members read their own Pass card');
select pg_temp.logout();

select * from finish();
rollback;
