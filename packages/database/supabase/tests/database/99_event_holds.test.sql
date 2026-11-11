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

-- Events (decisions.md, Events): a released waitlist place is held for the
-- next person for 12 hours (or until two hours before the start) and
-- passes on when unclaimed or declined; each event states its access; a
-- trip's emergency contacts go a week after it.

select plan(12);

select pg_temp.make_user('00000000-0000-0000-0000-0000000c0a01', 'one-hold@auib.edu.iq', 'One');
select pg_temp.make_user('00000000-0000-0000-0000-0000000c0a02', 'two-hold@auib.edu.iq', 'Two');
select pg_temp.make_user('00000000-0000-0000-0000-0000000c0a03', 'three-hold@auib.edu.iq', 'Three');

insert into events.events (id, slug, title_en, title_ar, starts_at, capacity, status, entry) values
  ('e00000c0-0000-0000-0000-000000000001', 'hold-soon', 'Soon', 'قريبًا', now() + interval '5 hours', 1, 'published', 'rsvp');

select pg_temp.login_as('00000000-0000-0000-0000-0000000c0a01');
select is(events.rsvp('e00000c0-0000-0000-0000-000000000001'), 'confirmed', 'The one place is booked');
select pg_temp.login_as('00000000-0000-0000-0000-0000000c0a02');
select is(events.rsvp('e00000c0-0000-0000-0000-000000000001'), 'waitlisted', 'The second person waits');
select pg_temp.login_as('00000000-0000-0000-0000-0000000c0a03');
select is(events.rsvp('e00000c0-0000-0000-0000-000000000001'), 'waitlisted', 'and the third');

select pg_temp.login_as('00000000-0000-0000-0000-0000000c0a01');
select lives_ok($$ select events.cancel_rsvp('e00000c0-0000-0000-0000-000000000001') $$, 'The place is given back');

select pg_temp.logout();
select ok(
  (select offered_until between now() + interval '2 hours 59 minutes' and now() + interval '3 hours 1 minute'
   from events.waitlist where user_id = '00000000-0000-0000-0000-0000000c0a02' and status = 'offered'),
  'Close to the start, the hold ends two hours before it');

-- The hold runs out: it passes to the next in line.
update events.waitlist set offered_until = now() - interval '1 minute'
where user_id = '00000000-0000-0000-0000-0000000c0a02';
select is(private.expire_offers(), 1, 'An unclaimed hold runs out');
select is(
  (select status from events.waitlist where user_id = '00000000-0000-0000-0000-0000000c0a03'),
  'offered', 'and the place is held for the next in line');

-- Declining a hold passes it on too (here, to nobody: the line is empty).
select pg_temp.login_as('00000000-0000-0000-0000-0000000c0a03');
select lives_ok($$ select events.cancel_rsvp('e00000c0-0000-0000-0000-000000000001') $$, 'A held place is declined');
select is(events.confirmed_count('e00000c0-0000-0000-0000-000000000001'), 0, 'and is free again');

-- Access: only the known values.
select pg_temp.logout();
select throws_ok(
  $$ update events.events set allergens = array['glitter'] where slug = 'hold-soon' $$,
  '23514', null, 'Allergens come from the fixed list');

-- A trip's emergency contact goes a week after it; the consent stays.
update events.events set starts_at = now() - interval '9 days' where slug = 'hold-soon';
insert into governance.form_submissions (form_key, submitted_by, subject_id, data, status, submitted_at, signed_at, signer_name)
values ('f45', '00000000-0000-0000-0000-0000000c0a01', 'e00000c0-0000-0000-0000-000000000001',
  '{"emergency_contact": "Someone, 0000", "health": "None", "agree": true}', 'submitted', now(), now(), 'One');
select is(private.purge_trip_contacts(), 1, 'A week after the trip, the emergency contact is deleted');
select is(
  (select data from governance.form_submissions where form_key = 'f45'
     and subject_id = 'e00000c0-0000-0000-0000-000000000001'),
  '{"agree": true}'::jsonb, 'and the acknowledgment stays');

select * from finish();
rollback;
