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

-- Live where people share a screen (decisions.md, The site): private
-- channels that RLS decides, fed by the database with ids and counts only.
select plan(9);

select pg_temp.make_user('00000000-0000-0000-0000-0000000f9001', 'door.staff@auib.edu.iq', 'Door Staff');
select pg_temp.make_user('00000000-0000-0000-0000-0000000f9002', 'some.member@auib.edu.iq', 'Some Member');
select pg_temp.make_user('00000000-0000-0000-0000-0000000f9003', 'guest.arriving@auib.edu.iq', 'Guest Arriving');
insert into events.events (id, slug, title_en, title_ar, starts_at, status, entry)
values ('00000000-0000-0000-0000-0000000f9e01', 'live-door', 'At the door', 'عند الباب', now(), 'published', 'open');
insert into events.event_staff (event_id, user_id)
values ('00000000-0000-0000-0000-0000000f9e01', '00000000-0000-0000-0000-0000000f9001');

select pg_temp.login_as('00000000-0000-0000-0000-0000000f9001');
select ok(private.can_edit_room('sal:checkin:00000000-0000-0000-0000-0000000f9e01'),
  'The door''s staff receive its check-ins');
select ok(private.can_edit_room('sal:me:00000000-0000-0000-0000-0000000f9001'),
  'Each person receives their own counts');
select ok(not private.can_edit_room('sal:me:00000000-0000-0000-0000-0000000f9002'),
  'and nobody else''s');
select pg_temp.logout();

select pg_temp.login_as('00000000-0000-0000-0000-0000000f9002');
select ok(not private.can_edit_room('sal:checkin:00000000-0000-0000-0000-0000000f9e01'),
  'A member not at the door receives nothing from it');
select ok(not private.can_edit_room('sal:desk:00000000-0000-0000-0000-000000000000'),
  'and nothing of the Desk''s');
select throws_ok(
  $$ insert into realtime.messages (topic, extension, event, payload, private)
     values ('sal:me:00000000-0000-0000-0000-0000000f9002', 'broadcast', 'counts', '{}', true) $$,
  '42501', null, 'Only the database feeds the counts'
);
select pg_temp.logout();

insert into events.check_ins (event_id, user_id, method, checked_in_by)
values ('00000000-0000-0000-0000-0000000f9e01', '00000000-0000-0000-0000-0000000f9003', 'qr',
  '00000000-0000-0000-0000-0000000f9001');
select is(
  (select (payload->>'count')::int from realtime.messages
   where topic = 'sal:checkin:00000000-0000-0000-0000-0000000f9e01' order by inserted_at desc limit 1),
  1,
  'A check-in reaches the door with the count'
);
select ok(
  (select not (payload ? 'full_name_en') and payload ? 'user_id' from realtime.messages
   where topic = 'sal:checkin:00000000-0000-0000-0000-0000000f9e01' order by inserted_at desc limit 1),
  'carrying ids, never names'
);
select ok(
  exists (select 1 from realtime.messages
    where topic = 'sal:me:00000000-0000-0000-0000-0000000f9003' and event = 'counts'),
  'and the person''s Today is told to count again'
);

select * from finish();
rollback;
