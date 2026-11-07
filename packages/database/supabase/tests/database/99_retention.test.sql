-- One retention schedule, one job, a test per rule (audit E2).
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
select plan(17);

select pg_temp.make_user('00000000-0000-0000-0000-0000000e2a01', 'keep-old@auib.edu.iq', 'Old Account');
select pg_temp.make_user('00000000-0000-0000-0000-0000000e2a02', 'keep-new@auib.edu.iq', 'New Account');
update auth.users set last_sign_in_at = now() - interval '25 months', created_at = now() - interval '3 years'
where id = '00000000-0000-0000-0000-0000000e2a01';
update auth.users set last_sign_in_at = now() where id = '00000000-0000-0000-0000-0000000e2a02';

-- Timestamps are set by triggers on update; this test sets them itself.
alter table journal.submission_drafts disable trigger user;
alter table journal.blind_entries disable trigger user;
alter table programmes.opening_replies disable trigger user;
alter table programmes.removal_requests disable trigger user;
alter table governance.form_submissions disable trigger user;
alter table programmes.six_words disable trigger user;
alter table membership.guests disable trigger user;

select is(
  (select count(*)::integer from private.retention_schedule() s
   where s.runs is not null and to_regprocedure(s.runs || '()') is null),
  0, 'Every rule in the schedule names a function that exists');
select ok((select count(*) from core.retention_schedule()) >= 18, 'The schedule is readable as one list');

-- Drafts
insert into journal.submission_drafts (user_id, category, updated_at) values
  ('00000000-0000-0000-0000-0000000e2a01', 'poetry', now() - interval '13 months'),
  ('00000000-0000-0000-0000-0000000e2a02', 'poetry', now());
-- A blind copy whose submission is gone
insert into journal.blind_entries (blind_id, call_id, category, language, title, updated_at)
values ('W-E2AAAA', (select id from journal.calls limit 1), 'poetry', 'en', 'Orphan', now() - interval '13 months');
-- An incident record from eight years ago
insert into governance.form_submissions (form_key, submitted_by, status, created_at, submitted_at, signed_at, signer_name) values
  ('f16', '00000000-0000-0000-0000-0000000e2a02', 'closed', now() - interval '8 years', now() - interval '8 years', now() - interval '8 years', 'New Account');
-- A reply decided over a year ago
insert into programmes.openings (id, programme_id, role, title_en, title_ar)
values ('0be00000-0000-0000-0000-0000000e2a0b', (select id from core.programmes where slug = 'company'),
  'stage_manager', 'Stage Manager', 'مدير الخشبة');
insert into programmes.opening_replies (opening_id, user_id, status, created_at, updated_at) values
  ('0be00000-0000-0000-0000-0000000e2a0b', '00000000-0000-0000-0000-0000000e2a01', 'not_picked', now() - interval '14 months', now() - interval '13 months'),
  ('0be00000-0000-0000-0000-0000000e2a0b', '00000000-0000-0000-0000-0000000e2a02', 'new', now() - interval '14 months', now() - interval '13 months');
-- A removal request closed three years ago
insert into programmes.removal_requests (requester_name, requester_email, details, status, action_taken, closed_at)
values ('Someone', 'someone@example.com', 'My photo', 'removed', 'Taken down', now() - interval '3 years');
-- Who voted in a round that closed two years ago
insert into journal.prize_rounds (id, year, period_from, period_to, vote_opens_at, vote_closes_at)
values ('0be00000-0000-0000-0000-0000000e2a0c', 2099, '2098-09-01', '2099-06-30', now() - interval '25 months', now() - interval '2 years');
insert into journal.prize_vote_receipts (round_id, category, user_id)
values ('0be00000-0000-0000-0000-0000000e2a0c', 'qirtas', '00000000-0000-0000-0000-0000000e2a01');
-- Devices of an account unused for over a year, and of one in use
insert into core.push_subscriptions (user_id, endpoint, p256dh, auth) values
  ('00000000-0000-0000-0000-0000000e2a01', 'https://push.example/old', 'k', 'a'),
  ('00000000-0000-0000-0000-0000000e2a02', 'https://push.example/new', 'k', 'a');
insert into membership.calendar_tokens (user_id, token) values ('00000000-0000-0000-0000-0000000e2a01', 'old-token');
-- An unconfirmed personal address from last week
insert into core.personal_email_requests (user_id, email, requested_at)
values ('00000000-0000-0000-0000-0000000e2a01', 'old@example.com', now() - interval '8 days');
-- An unclaimed Tour page, past its date
update core.settings set value = to_jsonb((current_date - 1)::text) where key = 'tour.unclaimed_until';
insert into programmes.six_words (text, language, tour, photo_path)
values ('Six words nobody came back for', 'en', 'spring-2026', 'station/00000000-0000-0000-0000-0000000e2a0d.jpg');
-- A guest who hasn't signed in for two years
insert into membership.guests (user_id) values ('00000000-0000-0000-0000-0000000e2a01')
on conflict do nothing;

select ok(exists (select 1 from core.retention_due() where kind = 'tour_photo' and ref = 'station/00000000-0000-0000-0000-0000000e2a0d.jpg'),
  'The route is told which Tour photographs to remove first');
select ok(exists (select 1 from core.retention_due() where kind = 'guest_account' and ref = '00000000-0000-0000-0000-0000000e2a01'),
  'and which guest accounts to delete');

select is(private.run_retention() -> 'failed', '[]'::jsonb, 'The one job runs every rule without a failure');

select is((select count(*)::integer from journal.submission_drafts where user_id = '00000000-0000-0000-0000-0000000e2a01'), 0,
  'A draft untouched for 13 months is deleted');
select is((select count(*)::integer from journal.submission_drafts where user_id = '00000000-0000-0000-0000-0000000e2a02'), 1,
  'a recent draft stays');
select is((select count(*)::integer from journal.blind_entries where blind_id = 'W-E2AAAA'), 0,
  'A blind copy with no submission is deleted after 12 months');
select is((select count(*)::integer from governance.form_submissions where form_key = 'f16'), 0,
  'Incident records go after seven years');
select is((select array_agg(status) from programmes.opening_replies where opening_id = '0be00000-0000-0000-0000-0000000e2a0b'),
  array['new'], 'A decided reply goes after 12 months; an open one stays');
select is((select count(*)::integer from programmes.removal_requests where requester_email = 'someone@example.com'), 0,
  'Removal requests go two years after closing');
select is((select count(*)::integer from journal.prize_vote_receipts where round_id = '0be00000-0000-0000-0000-0000000e2a0c'), 0,
  'Who voted for the Prize goes a year after the vote');
select is((select array_agg(endpoint) from core.push_subscriptions where endpoint like 'https://push.example/%'),
  array['https://push.example/new'], 'Push subscriptions of accounts unused for a year go');
select is((select count(*)::integer from membership.calendar_tokens where token = 'old-token'), 0,
  'and their calendar feed addresses');
select is((select count(*)::integer from core.personal_email_requests where email = 'old@example.com'), 0,
  'Personal email requests unconfirmed after seven days go');
select is((select count(*)::integer from programmes.six_words where photo_path = 'station/00000000-0000-0000-0000-0000000e2a0d.jpg'), 0,
  'Unclaimed Tour pages go after their date');

select results_eq(
  $$ select jobname::text from cron.job where jobname in ('sal-retention', 'sal-ballot-retention', 'sal-outbox-prune',
       'sal-tour-lists', 'sal-qalam-retention', 'sal-newsletter-unconfirmed', 'sal-activity-log') $$,
  $$ values ('sal-retention') $$, 'One retention job replaces the separate ones');

select * from finish();
rollback;
