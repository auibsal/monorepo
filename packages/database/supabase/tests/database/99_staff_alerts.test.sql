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

-- Urgent staff alerts (fourth prompt, 7p): a concern and an incident report
-- from an event's page each queue an alert at once; incident reports are
-- written by the event's staff and read by the Society's event managers.

select plan(9);

select pg_temp.make_user('00000000-0000-0000-0000-0000000fa001', 'dir-ev@auib.edu.iq', 'Director');
select pg_temp.make_user('00000000-0000-0000-0000-0000000fa002', 'lead-ev@auib.edu.iq', 'Lead');
select pg_temp.make_user('00000000-0000-0000-0000-0000000fa003', 'member-ev@auib.edu.iq', 'Member');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000fa001', 'events_director');

insert into events.events (id, slug, title_en, title_ar, starts_at, status, entry)
values ('e0000000-0000-0000-0000-0000000fa0e1', 'alert-night', 'Alert Night', 'ليلة', now(), 'published', 'open');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000fa002', 'programme_lead', 'event', 'e0000000-0000-0000-0000-0000000fa0e1');

select pg_temp.login_as('00000000-0000-0000-0000-0000000fa003');
select throws_ok(
  $$ insert into events.incident_reports (event_id, reported_by, what_happened)
     values ('e0000000-0000-0000-0000-0000000fa0e1', '00000000-0000-0000-0000-0000000fa003', 'x') $$,
  '42501', null, 'A member who does not run the event cannot report on it');

select pg_temp.login_as('00000000-0000-0000-0000-0000000fa002');
select lives_ok(
  $$ insert into events.incident_reports (event_id, reported_by, what_happened)
     values ('e0000000-0000-0000-0000-0000000fa0e1', '00000000-0000-0000-0000-0000000fa002', 'A fall on the stairs.') $$,
  'The event''s lead reports an incident');
select is((select count(*)::int from events.incident_reports), 1, 'and reads their own report');
select throws_ok(
  $$ insert into events.incident_reports (event_id, reported_by, what_happened)
     values ('e0000000-0000-0000-0000-0000000fa0e1', '00000000-0000-0000-0000-0000000fa001', 'x') $$,
  '42501', null, 'but cannot write one in someone else''s name');

select pg_temp.login_as('00000000-0000-0000-0000-0000000fa003');
select is((select count(*)::int from events.incident_reports), 0, 'A member reads none');

select pg_temp.login_as('00000000-0000-0000-0000-0000000fa001');
select is((select count(*)::int from events.incident_reports), 1, 'The Director of Events reads it');
select pg_temp.logout();

select ok(exists (select 1 from core.outbox where kind = 'events.incident_reported'
  and payload ->> 'event_id' = 'e0000000-0000-0000-0000-0000000fa0e1'),
  'An alert is queued at once');

insert into governance.form_submissions (id, form_key, submitted_by, status)
values ('f2100000-0000-0000-0000-0000000fa021', 'f21', '00000000-0000-0000-0000-0000000fa003', 'draft');
select ok(not exists (select 1 from core.outbox where kind = 'governance.concern_raised'),
  'A draft concern alerts no one');
update governance.form_submissions
set status = 'submitted', submitted_at = now(), signed_at = now(), signer_name = 'Member'
where id = 'f2100000-0000-0000-0000-0000000fa021';
select ok(exists (select 1 from core.outbox where kind = 'governance.concern_raised'
  and payload ->> 'submission_id' = 'f2100000-0000-0000-0000-0000000fa021'),
  'Once sent, it queues an alert to the panel''s chair');

select * from finish();
rollback;
