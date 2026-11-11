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

-- Booking (decisions.md, Events): only accessibility, and diet when food is
-- served; the waitlist moves by email until two hours before; unclaimed
-- places are released 10 minutes before.

select plan(10);

select pg_temp.make_user('00000000-0000-0000-0000-0000000b0a01', 'one-book@auib.edu.iq', 'One');
select pg_temp.make_user('00000000-0000-0000-0000-0000000b0a02', 'two-book@auib.edu.iq', 'Two');
select pg_temp.make_user('00000000-0000-0000-0000-0000000b0a03', 'three-book@auib.edu.iq', 'Three');

insert into events.events (id, slug, title_en, title_ar, starts_at, capacity, status, entry, serves_food, questions) values
  ('e00000b0-0000-0000-0000-000000000001', 'book-later', 'Later', 'لاحقًا', now() + interval '3 days', 1, 'published', 'rsvp', true,
    '[{"id": "shoe", "label_en": "Shoe size", "label_ar": "مقاس", "required": true}]'),
  ('e00000b0-0000-0000-0000-000000000002', 'book-soon', 'Soon', 'قريبًا', now() + interval '1 hour', 1, 'published', 'rsvp', false, '[]'),
  ('e00000b0-0000-0000-0000-000000000003', 'book-now', 'Now', 'الآن', now() + interval '5 minutes', 5, 'published', 'rsvp', false, '[]');

select is(
  (select array_agg(q ->> 'id') from events.events e, jsonb_array_elements(e.questions) q where e.slug = 'book-later'),
  array['access', 'diet'], 'With food, the booking asks about accessibility and diet, and nothing typed');
select is(
  (select array_agg(q ->> 'id') from events.events e, jsonb_array_elements(e.questions) q where e.slug = 'book-soon'),
  array['access'], 'Without food, only accessibility');

select pg_temp.login_as('00000000-0000-0000-0000-0000000b0a01');
select is(events.rsvp('e00000b0-0000-0000-0000-000000000001', '{"access": "Step-free seat", "diet": "Vegetarian", "shoe": "44"}'),
  'confirmed', 'A booking');
select is((select answers from events.rsvps where user_id = '00000000-0000-0000-0000-0000000b0a01'),
  '{"access": "Step-free seat", "diet": "Vegetarian"}'::jsonb, 'keeps only the two answers');
select is(events.rsvp('e00000b0-0000-0000-0000-000000000002', '{"diet": "Vegan"}'), 'confirmed', 'At an event without food');
select is((select answers from events.rsvps where user_id = '00000000-0000-0000-0000-0000000b0a01' and event_id = 'e00000b0-0000-0000-0000-000000000002'),
  '{}'::jsonb, 'diet is not kept');

-- Within two hours, a full event sends people to the door.
select pg_temp.login_as('00000000-0000-0000-0000-0000000b0a02');
select throws_ok($$ select events.rsvp('e00000b0-0000-0000-0000-000000000002') $$, '22023', 'full_at_the_door',
  'Within two hours a full event takes no more names: the door fills it');
select pg_temp.logout();
insert into events.waitlist (event_id, user_id) values ('e00000b0-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000b0a03');
update events.rsvps set status = 'canceled' where event_id = 'e00000b0-0000-0000-0000-000000000002';
select is(private.promote_waitlist('e00000b0-0000-0000-0000-000000000002'), 0,
  'and a released place is not offered from the waitlist');

-- Ten minutes before, unclaimed places are released.
insert into events.rsvps (event_id, user_id) values
  ('e00000b0-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000b0a01'),
  ('e00000b0-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000b0a02');
insert into events.check_ins (event_id, user_id, method) values
  ('e00000b0-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000b0a01', 'manual');
select is(private.release_unclaimed(), 1, 'Ten minutes before, the unclaimed place is released');
select is((select status from events.rsvps where event_id = 'e00000b0-0000-0000-0000-000000000003'
  and user_id = '00000000-0000-0000-0000-0000000b0a01'), 'confirmed', 'and whoever checked in keeps theirs');

select * from finish();
rollback;
