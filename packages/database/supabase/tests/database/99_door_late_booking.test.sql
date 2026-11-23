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

select plan(6);

-- The door on the night (decisions.md, Events): a walk-in books on the
-- event's page five minutes before the start and is scanned in at once,
-- also from a door device that was offline and sends the scan later.
select pg_temp.make_user('00000000-0000-0000-0000-0000000000d1', 'walkin.d@auib.edu.iq', 'Walk-in');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000d2', 'early.d@auib.edu.iq', 'Early booker');
select pg_temp.make_user('00000000-0000-0000-0000-0000000000d3', 'door.d@auib.edu.iq', 'Door');

insert into events.events (id, slug, title_en, title_ar, starts_at, ends_at, capacity, status, entry, classes)
values ('e0000000-0000-0000-0000-0000000000d1', 'door-night', 'Door night', 'ليلة الباب',
  now() + interval '5 minutes', now() + interval '95 minutes', 200, 'published', 'rsvp',
  array['member', 'associate', 'honorary', 'guest']);
insert into events.event_staff (event_id, user_id) values
  ('e0000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d3');

-- One booked a week ago and has not come; the walk-in books now.
insert into events.rsvps (event_id, user_id, created_at) values
  ('e0000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2', now() - interval '7 days');
select pg_temp.login_as('00000000-0000-0000-0000-0000000000d1');
select is(events.rsvp('e0000000-0000-0000-0000-0000000000d1'), 'confirmed',
  'A walk-in books five minutes before the start');

select pg_temp.logout();
select private.release_unclaimed();
select is(
  (select status from events.rsvps where user_id = '00000000-0000-0000-0000-0000000000d1'),
  'confirmed',
  'A booking made after the release is never released'
);
select is(
  (select status from events.rsvps where user_id = '00000000-0000-0000-0000-0000000000d2'),
  'released',
  'An earlier booking not claimed by then is released for the door'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d3');
select is(
  (select already from events.check_in('e0000000-0000-0000-0000-0000000000d1',
    (select ticket_code from events.rsvps where user_id = '00000000-0000-0000-0000-0000000000d1'))),
  false,
  'The walk-in''s ticket is scanned in at once'
);
-- A door device that was offline sends its queued scan of the early
-- booker's ticket after the release: a place is free, so it checks in.
select is(
  (select already from events.check_in('e0000000-0000-0000-0000-0000000000d1',
    (select ticket_code from events.rsvps where user_id = '00000000-0000-0000-0000-0000000000d2'))),
  false,
  'A ticket scanned offline and sent after the release still checks in'
);
select is(
  (select already from events.check_in('e0000000-0000-0000-0000-0000000000d1',
    (select ticket_code from events.rsvps where user_id = '00000000-0000-0000-0000-0000000000d1'))),
  true,
  'and the same scan sent twice is taken once'
);

select * from finish();
rollback;
