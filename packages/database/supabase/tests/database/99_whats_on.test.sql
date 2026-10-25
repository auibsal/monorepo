-- What's on: ways in (open, rsvp, invite), invitations, reminders and the
-- calendar's members-only teasers.
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

select plan(17);

select pg_temp.make_user('00000000-0000-0000-0000-0000000057a1', 'whats.on@auib.edu.iq', 'Whats On');
select pg_temp.make_user('00000000-0000-0000-0000-0000000057a2', 'invited@auib.edu.iq', 'Invited');
select pg_temp.make_user('00000000-0000-0000-0000-0000000057a3', 'events.lead@auib.edu.iq', 'Events Lead');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000057a3', 'events_lead');

insert into events.events (id, slug, programme_id, title_en, title_ar, starts_at, members_only, rsvp_enabled, entry, status) values
  ('e0000000-0000-0000-0000-0000000057e1', 'open-night', (select id from core.programmes where slug = 'open-pages'),
    'Open Night', 'ليلة مفتوحة', now() + interval '1 day', false, true, 'open', 'published'),
  ('e0000000-0000-0000-0000-0000000057e2', 'members-night', (select id from core.programmes where slug = 'open-pages'),
    'Members Night', 'ليلة الأعضاء', now() + interval '2 days', true, true, 'rsvp', 'published'),
  ('e0000000-0000-0000-0000-0000000057e3', 'invited-night', (select id from core.programmes where slug = 'open-pages'),
    'Invited Night', 'ليلة المدعوين', now() + interval '3 days', false, true, 'invite', 'published');
insert into events.events (id, slug, title_en, title_ar, starts_at, rsvp_enabled, status) values
  ('e0000000-0000-0000-0000-0000000057e4', 'old-writer', 'Old Writer', 'كاتب قديم', now() + interval '4 days', false, 'published');

select is((select rsvp_enabled from events.events where id = 'e0000000-0000-0000-0000-0000000057e1'), false,
  'An open event takes no bookings');
select is((select entry from events.events where id = 'e0000000-0000-0000-0000-0000000057e4'), 'open',
  'Turning bookings off makes an event open');

select ok((select members_only from events.events where id = 'e0000000-0000-0000-0000-0000000057e3'),
  'An invitation-only event is never public');

-- The public calendar
select pg_temp.login_anon();
select is(
  (select array_agg(slug order by starts_at) from events.calendar(now(), now() + interval '30 days')
    where slug like '%-night'),
  array['open-night', 'members-night'],
  'The public calendar shows members-only events, and never invitation-only ones'
);
select ok(
  (select teaser and venue_en is null and summary_en is null
    from events.calendar(now(), now() + interval '30 days') where slug = 'members-night'),
  'A members-only event is only a teaser for the public'
);
select is((select count(*)::integer from events.events where slug = 'members-night'), 0,
  'and the table itself still hides it');

-- A member
select pg_temp.login_as('00000000-0000-0000-0000-0000000057a1');
select ok(
  (select not teaser from events.calendar(now(), now() + interval '30 days') where slug = 'members-night'),
  'A member sees members-only events in full'
);
select is((select count(*)::integer from events.events where slug = 'invited-night'), 0,
  'An invitation-only event is invisible to members not invited');
select throws_ok(
  $$ select events.rsvp('e0000000-0000-0000-0000-0000000057e3') $$, 'P0002', null,
  'and they cannot book it'
);
select throws_ok(
  $$ select events.rsvp('e0000000-0000-0000-0000-0000000057e1') $$, '22023', null,
  'Open events take no bookings'
);
select lives_ok(
  $$ insert into events.reminders (event_id) values ('e0000000-0000-0000-0000-0000000057e1') $$,
  'but a member may ask to be reminded'
);
select throws_ok(
  $$ insert into events.reminders (event_id) values ('e0000000-0000-0000-0000-0000000057e3') $$,
  '42501', null, 'No reminders for events one cannot see'
);
select throws_ok(
  $$ insert into events.invitations (event_id, user_id)
     values ('e0000000-0000-0000-0000-0000000057e3', '00000000-0000-0000-0000-0000000057a1') $$,
  '42501', null, 'Members cannot invite themselves'
);

-- The officer invites
select pg_temp.login_as('00000000-0000-0000-0000-0000000057a3');
select lives_ok(
  $$ insert into events.invitations (event_id, user_id)
     values ('e0000000-0000-0000-0000-0000000057e3', '00000000-0000-0000-0000-0000000057a2') $$,
  'Event managers invite people'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000057a2');
select is((select count(*)::integer from events.events where slug = 'invited-night'), 1,
  'The invited see the event');
select is((select events.rsvp('e0000000-0000-0000-0000-0000000057e3')), 'confirmed',
  'and book it');

-- The reminder the day before
select pg_temp.logout();
select private.daily_notices();
select ok(
  exists (select 1 from core.outbox o where o.kind = 'events.reminder'
    and o.payload->>'user_id' = '00000000-0000-0000-0000-0000000057a1'
    and o.payload->>'event_id' = 'e0000000-0000-0000-0000-0000000057e1'),
  'Those who asked are reminded the day before'
);

select * from finish();
rollback;
