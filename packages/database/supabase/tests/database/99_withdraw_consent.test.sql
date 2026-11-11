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

-- Undo (decisions.md, Documents and forms): a consent or release is
-- withdrawn for the future by whoever signed it; the record stays.

select plan(5);

select pg_temp.make_user('00000000-0000-0000-0000-0000000e0a01', 'trip-one@auib.edu.iq', 'One');
select pg_temp.make_user('00000000-0000-0000-0000-0000000e0a02', 'trip-two@auib.edu.iq', 'Two');

set local sal.recording_approval = 'on';
insert into events.events (id, slug, title_en, title_ar, starts_at, capacity, status, entry, off_campus,
  student_life_approved_on, student_life_approved_by) values
  ('e00000e0-0000-0000-0000-000000000001', 'withdraw-trip', 'Trip', 'رحلة', now() + interval '5 days', 10, 'published', 'rsvp', true,
   current_date, '00000000-0000-0000-0000-0000000e0a02');
reset sal.recording_approval;
insert into governance.form_submissions (id, form_key, submitted_by, subject_id, data, status, submitted_at, signed_at, signer_name, esign_agreed)
values ('f45f0000-0000-0000-0000-000000000001', 'f45', '00000000-0000-0000-0000-0000000e0a01', 'e00000e0-0000-0000-0000-000000000001',
  '{"emergency_contact": "Someone", "agree": true}', 'submitted', now(), now(), 'One', true);

select pg_temp.login_as('00000000-0000-0000-0000-0000000e0a01');
select is(events.rsvp('e00000e0-0000-0000-0000-000000000001'), 'confirmed', 'With the trip''s consent, the trip is booked');

select pg_temp.login_as('00000000-0000-0000-0000-0000000e0a02');
select throws_ok($$ select governance.withdraw_consent('f45f0000-0000-0000-0000-000000000001') $$,
  '42501', 'not_allowed', 'Only whoever signed withdraws it');

select pg_temp.login_as('00000000-0000-0000-0000-0000000e0a01');
select lives_ok($$ select governance.withdraw_consent('f45f0000-0000-0000-0000-000000000001') $$,
  'The signer withdraws it for the future');
select is((select status from events.rsvps where event_id = 'e00000e0-0000-0000-0000-000000000001'), 'canceled',
  'and the place on the trip is given back');
select throws_ok($$ select events.rsvp('e00000e0-0000-0000-0000-000000000001') $$,
  '23514', 'trip_consent_required', 'Booking again asks for a new consent');

select * from finish();
rollback;
