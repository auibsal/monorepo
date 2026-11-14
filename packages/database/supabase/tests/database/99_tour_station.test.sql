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

-- The Tour's station (decisions §12): a confirmed volunteer on a station
-- shift attaches photographed pages to live cards, or against a pending
-- Associate request, while the shift runs; nobody else, and not after.

select plan(19);

select pg_temp.make_user('00000000-0000-0000-0000-0000000057a1', 'volunteer@auib.edu.iq', 'Station Volunteer');
select pg_temp.make_user('00000000-0000-0000-0000-0000000057a2', 'writer@auib.edu.iq', 'Tour Writer');
select pg_temp.make_user('00000000-0000-0000-0000-0000000057a3', 'director@auib.edu.iq', 'Membership Director');
select pg_temp.make_user('00000000-0000-0000-0000-0000000057a4', 'other@auib.edu.iq', 'Other Member');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000057a3', 'membership_director');

insert into events.events (id, slug, title_en, title_ar, starts_at, status, entry)
values ('e0000000-0000-0000-0000-0000000057a0', 'tour-dec-1', 'Typewriter Tour', 'جولة الآلة الكاتبة', now(), 'published', 'open');
insert into programmes.shifts (id, event_id, role_en, role_ar, starts_at, ends_at, station) values
  ('5f000000-0000-0000-0000-0000000057a1', 'e0000000-0000-0000-0000-0000000057a0', 'Station', 'المحطة', now() - interval '1 hour', now() + interval '1 hour', true),
  ('5f000000-0000-0000-0000-0000000057a2', 'e0000000-0000-0000-0000-0000000057a0', 'Door', 'الباب', now() - interval '1 hour', now() + interval '1 hour', false),
  ('5f000000-0000-0000-0000-0000000057a3', 'e0000000-0000-0000-0000-0000000057a0', 'Station later', 'المحطة لاحقًا', now() + interval '2 hours', now() + interval '3 hours', true);
insert into programmes.shift_signups (shift_id, user_id, status) values
  ('5f000000-0000-0000-0000-0000000057a1', '00000000-0000-0000-0000-0000000057a1', 'confirmed'),
  ('5f000000-0000-0000-0000-0000000057a2', '00000000-0000-0000-0000-0000000057a4', 'confirmed'),
  ('5f000000-0000-0000-0000-0000000057a1', '00000000-0000-0000-0000-0000000057a4', 'signed_up');

create temp table live on commit drop as
  select c.code, private.totp(c.secret, floor(extract(epoch from now()) / 30)::bigint) as digits
  from membership.cards c where c.user_id = '00000000-0000-0000-0000-0000000057a2';
grant select on live to public;

insert into membership.associate_requests (id, full_name, email, relation)
values ('a5500000-0000-0000-0000-0000000057a1', 'Faculty Friend', 'friend@auib.edu.iq', 'faculty'),
       ('a5500000-0000-0000-0000-0000000057a2', 'Alumni Friend', 'alum@example.com', 'alumni');

-- Who has the station
select pg_temp.login_as('00000000-0000-0000-0000-0000000057a4');
select is(programmes.my_station_shift(), null, 'A volunteer on another shift, or not yet confirmed, has no station');
select throws_ok(
  $$ select programmes.station_attach((select code from live), (select digits from live), null, 'station/00000000-0000-0000-0000-000000000001.jpg') $$,
  '42501', 'station_closed', 'and cannot attach a page'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000057a1');
select is(programmes.my_station_shift(), '5f000000-0000-0000-0000-0000000057a1'::uuid, 'A confirmed volunteer has the station while the shift runs');
select throws_ok(
  $$ select programmes.station_attach((select code from live), '00000000', null, 'station/00000000-0000-0000-0000-000000000001.jpg') $$,
  '22023', 'card_not_live', 'A card that is not live is refused'
);
select throws_ok(
  $$ select programmes.station_attach((select code from live), (select digits from live), null, null) $$,
  '22023', 'photo_required', 'A page needs its photograph'
);
select matches(
  programmes.station_attach((select code from live), (select digits from live), null, 'station/00000000-0000-0000-0000-000000000001.jpg'),
  '^TOUR-\d{4}-\d{3,}$', 'A live card takes the page, numbered'
);
select is(
  programmes.station_attach(null, null, 'Friend@AUIB.edu.iq', 'station/00000000-0000-0000-0000-000000000002.jpg') is not null,
  true, 'A pending Associate request takes a page too'
);
select throws_ok(
  $$ select programmes.station_attach(null, null, 'nobody@auib.edu.iq', 'station/00000000-0000-0000-0000-000000000003.jpg') $$,
  'P0002', 'no_pending_request', 'but only a request that is pending'
);
select programmes.station_attach(null, null, 'alum@example.com', 'station/00000000-0000-0000-0000-000000000004.jpg');
select pg_temp.logout();

select is(
  (select user_id::text || ':' || visibility from programmes.six_words where photo_path = 'station/00000000-0000-0000-0000-000000000001.jpg'),
  '00000000-0000-0000-0000-0000000057a2:private', 'The page is the card holder''s, private by default'
);
select ok(
  (select user_id is null and visibility = 'private' from programmes.six_words where photo_path = 'station/00000000-0000-0000-0000-000000000002.jpg'),
  'A page against a request waits, private, on no account'
);
select ok(
  exists (select 1 from core.activity_log where table_name = 'six_words' and actor_id = '00000000-0000-0000-0000-0000000057a1'),
  'Every page the station takes is logged'
);

-- The shift ends: so does the station.
update programmes.shifts set ends_at = now() - interval '1 minute', starts_at = now() - interval '2 hours'
where id = '5f000000-0000-0000-0000-0000000057a1';
select pg_temp.login_as('00000000-0000-0000-0000-0000000057a1');
select is(programmes.my_station_shift(), null, 'The station ends with the shift');

-- The Director of Membership decides.
select pg_temp.login_as('00000000-0000-0000-0000-0000000057a3');
select throws_ok(
  $$ select membership.decide_associate_request('a5500000-0000-0000-0000-0000000057a2', false, null) $$,
  '22023', 'reason_required', 'A declined request carries its reason'
);
select membership.decide_associate_request('a5500000-0000-0000-0000-0000000057a2', false, 'Not an AUIB graduate.');
select membership.decide_associate_request('a5500000-0000-0000-0000-0000000057a1', true);
select pg_temp.logout();
select is(
  (select count(*)::integer from programmes.six_words where photo_path = 'station/00000000-0000-0000-0000-000000000004.jpg'),
  0, 'Declined: the page is deleted'
);
select is(
  (select count(*)::integer from core.outbox where kind = 'storage.remove' and payload -> 'paths' ? 'station/00000000-0000-0000-0000-000000000004.jpg'),
  1, 'and its photograph with it'
);

-- Approved: the invitation's acceptance brings the page to the new account.
select pg_temp.make_user('00000000-0000-0000-0000-0000000057a5', 'friend@auib.edu.iq', 'Faculty Friend');
update governance.partner_invitations set accepted_by = '00000000-0000-0000-0000-0000000057a5', accepted_at = now()
where id = (select invitation_id from membership.associate_requests where id = 'a5500000-0000-0000-0000-0000000057a1');
select is(
  (select user_id from programmes.six_words where photo_path = 'station/00000000-0000-0000-0000-000000000002.jpg'),
  '00000000-0000-0000-0000-0000000057a5'::uuid, 'Approved: the page is attached to the account that accepts'
);

-- Photographed pages show nowhere until whoever runs the Tour transcribes them.
select pg_temp.login_as('00000000-0000-0000-0000-0000000057a2');
update programmes.six_words set visibility = 'tour' where photo_path = 'station/00000000-0000-0000-0000-000000000001.jpg';
select is((select count(*)::integer from programmes.my_six_words() where text is null), 0,
  'A photographed page waits for its words before it shows');
select throws_ok(
  $$ select programmes.transcribe_page((select id from programmes.six_words where photo_path = 'station/00000000-0000-0000-0000-000000000001.jpg'), 'Six words typed on the Tour today', 'en') $$,
  '42501', null, 'The writer does not type them on the site'
);
select pg_temp.logout();
select pg_temp.grant_role('00000000-0000-0000-0000-0000000057a1', 'tour_lead');
select pg_temp.login_as('00000000-0000-0000-0000-0000000057a1');
select programmes.transcribe_page((select id from programmes.six_words where photo_path = 'station/00000000-0000-0000-0000-000000000001.jpg'), 'Six words typed on the Tour today', 'en');
select ok((select pages from programmes.six_words_counts()) >= 1,
  'Transcribed by whoever runs the Tour, it is counted on the Tour''s page');

select * from finish();
rollback;
