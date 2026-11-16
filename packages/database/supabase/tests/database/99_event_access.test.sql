-- Event access, after the event, the program and shifts (Nov 16, 2026: migrations 20261116000700 and 20261116000800).
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
select plan(25);

select pg_temp.make_user('00000000-0000-0000-0000-00000000ac01', 'member.ac@auib.edu.iq', 'Member');
select pg_temp.make_user('00000000-0000-0000-0000-00000000ac02', 'associate.ac@auib.edu.iq', 'Associate');
select pg_temp.make_user('00000000-0000-0000-0000-00000000ac03', 'guest.ac@gmail.com', 'Guest');
select pg_temp.make_user('00000000-0000-0000-0000-00000000ac04', 'lead.ac@auib.edu.iq', 'Lead');
select pg_temp.make_user('00000000-0000-0000-0000-00000000ac05', 'invited.ac@gmail.com', 'Invited Guest');
update membership.memberships set tier = 'associate' where user_id = '00000000-0000-0000-0000-00000000ac02';
insert into membership.guests (user_id) values
  ('00000000-0000-0000-0000-00000000ac03'), ('00000000-0000-0000-0000-00000000ac05')
  on conflict do nothing;
select pg_temp.grant_role('00000000-0000-0000-0000-00000000ac04', 'events_director');

insert into events.events (id, slug, title_en, title_ar, starts_at, ends_at, capacity, status, entry, classes) values
  -- On campus, Booking required, Everyone, three weeks out.
  ('e0000000-0000-0000-0000-00000000ac01', 'ac-far', 'Far', 'بعيد', now() + interval '21 days', null, 50, 'published', 'rsvp',
    array['member', 'associate', 'honorary', 'guest']),
  -- On campus, Booking required, Everyone, a week out: Guests' booking has closed.
  ('e0000000-0000-0000-0000-00000000ac02', 'ac-near', 'Near', 'قريب', now() + interval '4 days', null, 50, 'published', 'rsvp',
    array['member', 'associate', 'honorary', 'guest']),
  -- Members only.
  ('e0000000-0000-0000-0000-00000000ac03', 'ac-members', 'Members', 'الأعضاء', now() + interval '21 days', null, 50, 'published', 'rsvp',
    array['member']),
  -- Open, on campus, three weeks out.
  ('e0000000-0000-0000-0000-00000000ac04', 'ac-open', 'Open', 'حر', now() + interval '21 days', null, null, 'published', 'open',
    array['member', 'associate', 'honorary', 'guest']),
  -- Invited only.
  ('e0000000-0000-0000-0000-00000000ac05', 'ac-invite', 'Invited', 'بدعوة', now() + interval '21 days', null, 50, 'published', 'invite',
    array['member', 'associate', 'honorary', 'guest']),
  -- Ended yesterday.
  ('e0000000-0000-0000-0000-00000000ac06', 'ac-past', 'Past', 'مضى', now() - interval '1 day', now() - interval '22 hours', null, 'published', 'open',
    array['member', 'associate', 'honorary', 'guest']),
  -- Ended three weeks ago.
  ('e0000000-0000-0000-0000-00000000ac07', 'ac-long-past', 'Long past', 'مضى بعيدًا', now() - interval '21 days', now() - interval '20 days', null, 'published', 'open',
    array['member', 'associate', 'honorary', 'guest']);
insert into events.invitations (event_id, user_id) values
  ('e0000000-0000-0000-0000-00000000ac05', '00000000-0000-0000-0000-00000000ac05');

-- ── Who can come ────────────────────────────────────────────────────────────

select throws_ok(
  $$ update events.events set entry = 'members' where id = 'e0000000-0000-0000-0000-00000000ac01' $$,
  '23514', null,
  'Members is no longer an access: Who can come holds the classes'
);
select pg_temp.login_anon();
select is(
  (select count(*)::int from events.events where id::text like 'e0000000-0000-0000-0000-00000000ac0%'),
  6,
  'A visitor sees every published event, a Members-only one too, never an invitation-only one'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000ac02');
select throws_ok(
  $$ select events.rsvp('e0000000-0000-0000-0000-00000000ac03') $$,
  '42501', 'not_for_your_class',
  'An Associate Member cannot book a Members-only event'
);
select is((events.booking_terms('e0000000-0000-0000-0000-00000000ac03') ->> 'eligible')::boolean, false,
  'and the page says whom it is for');
select is(events.rsvp('e0000000-0000-0000-0000-00000000ac01'), 'confirmed',
  'but books an event for Everyone');

select pg_temp.login_as('00000000-0000-0000-0000-00000000ac01');
select is(events.rsvp('e0000000-0000-0000-0000-00000000ac03'), 'confirmed', 'A Member books it');
select throws_ok(
  $$ select events.rsvp('e0000000-0000-0000-0000-00000000ac04') $$,
  '22023', null,
  'An Open event takes no booking from a Member'
);
select throws_ok(
  $$ select events.rsvp('e0000000-0000-0000-0000-00000000ac05') $$,
  'P0002', null,
  'Invited only takes named invitations only'
);

-- ── The campus rule: Guests always book, until 14 days before ───────────────

select pg_temp.login_as('00000000-0000-0000-0000-00000000ac03');
select is(events.rsvp('e0000000-0000-0000-0000-00000000ac01'), 'confirmed',
  'A Guest books an event on campus three weeks out');
select is(events.rsvp('e0000000-0000-0000-0000-00000000ac04'), 'confirmed',
  'and books even an Open one: their names go to Security');
select throws_ok(
  $$ select events.rsvp('e0000000-0000-0000-0000-00000000ac02') $$,
  '22023', 'guests_book_by',
  'A Guest cannot book an event on campus within 14 days of it'
);
select ok((events.booking_terms('e0000000-0000-0000-0000-00000000ac02') ->> 'guests_closed')::boolean,
  'and the page says Guests book by the date');
select pg_temp.logout();
select is(
  (select private.guests_book_by(jsonb_populate_record(null::events.events, to_jsonb(e) || '{"off_campus": true}'))
   from events.events e where e.id = 'e0000000-0000-0000-0000-00000000ac02'),
  null,
  'Off campus, the event''s own rules apply'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000ac05');
select is(events.rsvp('e0000000-0000-0000-0000-00000000ac05'), 'confirmed',
  'The invited Guest books the invitation-only event');

-- ── How was it? ─────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-00000000ac01');
select lives_ok(
  $$ insert into events.feedback (event_id, rating, comment)
     values ('e0000000-0000-0000-0000-00000000ac06', 5, 'The second film stayed with me.') $$,
  'Anyone signed in answers once the event has ended'
);
select throws_ok(
  $$ insert into events.feedback (event_id, rating) values ('e0000000-0000-0000-0000-00000000ac06', 4) $$,
  '23505', null,
  'and only once'
);
select throws_ok(
  $$ insert into events.feedback (event_id, rating) values ('e0000000-0000-0000-0000-00000000ac07', 4) $$,
  '42501', null,
  'The question closes 14 days after the event'
);
select throws_ok(
  $$ insert into events.feedback (event_id, rating) values ('e0000000-0000-0000-0000-00000000ac01', 4) $$,
  '42501', null,
  'and is not open before it ends'
);
select throws_ok(
  $$ select events.feedback_summary('e0000000-0000-0000-0000-00000000ac06') $$,
  '42501', null,
  'A member does not read the answers'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000ac03');
insert into events.feedback (event_id, rating) values ('e0000000-0000-0000-0000-00000000ac06', 3);
select pg_temp.login_as('00000000-0000-0000-0000-00000000ac04');
select is(
  events.feedback_summary('e0000000-0000-0000-0000-00000000ac06') - 'ratings',
  '{"count": 2, "average": 4.0, "comments": [{"rating": 5, "comment": "The second film stayed with me."}]}'::jsonb,
  'The event''s team reads the count, the average and the comments, with no names'
);
select is((select count(*)::int from events.feedback), 0,
  'and never the answers themselves');

-- ── "Thanks for coming" ─────────────────────────────────────────────────────

select pg_temp.logout();
update events.events set starts_at = (date_trunc('day', now() at time zone 'Asia/Baghdad') - interval '1 day' + interval '18 hours') at time zone 'Asia/Baghdad',
  ends_at = null
  where id = 'e0000000-0000-0000-0000-00000000ac06';
insert into events.rsvps (event_id, user_id) values
  ('e0000000-0000-0000-0000-00000000ac06', '00000000-0000-0000-0000-00000000ac02');
insert into events.check_ins (event_id, user_id, method) values
  ('e0000000-0000-0000-0000-00000000ac06', '00000000-0000-0000-0000-00000000ac01', 'manual');
select private.thanks_for_coming();
select is(
  (select array_agg(payload ->> 'user_id') from core.outbox where kind = 'events.thanks'),
  array['00000000-0000-0000-0000-00000000ac01'],
  'The next morning, "Thanks for coming" goes to who checked in, not to who only booked'
);

-- ── Screenings, performances and their shifts ───────────────────────────────

update events.events set format = 'screening' where id = 'e0000000-0000-0000-0000-00000000ac01';
select is(
  (select array_agg(role_en order by role_en) from programmes.shifts
    where event_id = 'e0000000-0000-0000-0000-00000000ac01' and capacity = 1 and role_en in ('Photos', 'Projection and sound')),
  array['Photos', 'Projection and sound'],
  'A screening adds Projection and sound and Photos, one person each'
);
select ok(
  (select bool_or(e ->> 'slug' = 'ac-near') from jsonb_array_elements(core.telegram_staff_brief() -> 'empty_shifts') e),
  'The daily brief flags an event within five days with an empty shift'
);

-- ── The program ─────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-00000000ac01');
select throws_ok(
  $$ insert into events.program_items (event_id, title_en, credit) values ('e0000000-0000-0000-0000-00000000ac01', 'A film', 'A director') $$,
  '42501', null,
  'A member does not write an event''s program'
);

select * from finish();
rollback;
