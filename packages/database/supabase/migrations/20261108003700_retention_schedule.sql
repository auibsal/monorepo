-- Audit E2: one retention schedule, one job. Every rule is a row of
-- private.retention_schedule() and a function the daily job runs; a rule
-- that fails is emailed to the administrators (platform.cron_failed) and
-- the others still run. Rules that also remove files or whole accounts
-- (unpublished submissions, guest accounts, unclaimed Tour photographs)
-- start in the API route /api/cron/retention, which removes the files
-- first and then calls core.run_retention().
--
-- Periods: decisions.md where it sets one (submissions 12 months, Qalam
-- consent and attendance three years, incidents seven, invitation lists
-- thirty days after the send, unclaimed Tour pages after the spring 2027
-- Tour); otherwise the usual practice of student organizations, as
-- listed below for SAL-GOV-03.

-- ── The unclaimed spring 2026 Tour pages: after the spring 2027 Tour ────
update core.settings
set value = to_jsonb('2027-06-30'::text)
where key = 'tour.unclaimed_until' and (value is null or value = 'null'::jsonb);

-- purge_tour_lists keeps the invitation lists only; the Tour pages and the
-- Associate requests are rules of their own.
create or replace function private.purge_tour_lists()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  -- Every address on a list sent more than thirty days ago, those skipped
  -- because they already had an account among them.
  delete from membership.invitations i
  using membership.invitation_lists l
  where l.source = i.source and l.sent_at is not null and l.sent_at < now() - interval '30 days';
  get diagnostics n = row_count;
  return n;
end;
$$;

create function private.unclaimed_tour_photos()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select w.photo_path
  from programmes.six_words w
  where w.user_id is null and w.tour is not null and w.associate_request_id is null
    and w.photo_path is not null
    and (private.setting('tour.unclaimed_until') #>> '{}')::date < private.today();
$$;

create function private.purge_unclaimed_tour_pages()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer := 0;
  until date := (private.setting('tour.unclaimed_until') #>> '{}')::date;
begin
  if until is not null and private.today() > until then
    delete from programmes.six_words
    where user_id is null and tour is not null and associate_request_id is null;
    get diagnostics n = row_count;
  end if;
  return n;
end;
$$;

-- ── Qirtas: stale drafts and the blind copies of deleted submissions ────
create function private.purge_stale_drafts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from journal.submission_drafts where updated_at < now() - interval '12 months';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- A blind copy whose submission is gone, with its assignments, scores and
-- decisions (they cascade).
create function private.purge_blind_entries()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from journal.blind_entries b
  where not exists (select 1 from journal.blind_keys k where k.blind_entry_id = b.id)
    and b.updated_at < now() - interval '12 months';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ── Incident records (F-16): seven years ────────────────────────────────
create function private.purge_incident_records()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from governance.form_submissions
  where form_key = 'f16' and coalesce(signed_at, submitted_at, created_at) < now() - interval '7 years';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ── Get involved: replies 12 months after their last change ─────────────
create function private.purge_opening_replies()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from programmes.opening_replies
  where status not in ('new', 'talking', 'offered')
    and coalesce(updated_at, created_at) < now() - interval '12 months';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ── Removal requests: two years after they close ────────────────────────
create function private.purge_removal_requests()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from programmes.removal_requests
  where closed_at is not null and closed_at < now() - interval '2 years';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ── The Prize: who voted, a year after the vote closes (the votes stay,
-- with no link to anyone) ────────────────────────────────────────────────
create function private.purge_prize_vote_receipts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from journal.prize_vote_receipts r
  using journal.prize_rounds p
  where p.id = r.round_id and p.vote_closes_at < now() - interval '1 year';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ── Devices and feeds of accounts unused for 12 months ──────────────────
create function private.purge_idle_devices()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
  m integer;
begin
  delete from core.push_subscriptions s
  using auth.users u
  where u.id = s.user_id and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '12 months';
  get diagnostics n = row_count;
  delete from membership.calendar_tokens t
  using auth.users u
  where u.id = t.user_id and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '12 months';
  get diagnostics m = row_count;
  return n + m;
end;
$$;

-- ── Personal email requests never confirmed: seven days ─────────────────
create function private.purge_personal_email_requests()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from core.personal_email_requests where requested_at < now() - interval '7 days';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ── Guest accounts unused for two years (the route deletes them) ────────
create function private.idle_guest_accounts()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select g.user_id
  from membership.guests g
  join auth.users u on u.id = g.user_id
  where coalesce(u.last_sign_in_at, u.created_at) < now() - interval '2 years'
    and not exists (
      select 1 from access.role_assignments r
      where r.user_id = g.user_id and (r.ends_at is null or r.ends_at > now())
    );
$$;

-- ── The schedule ────────────────────────────────────────────────────────
-- One row per rule: what, how long, and the function the job runs (null:
-- the API route runs it, because files or accounts go with it).
create function private.retention_schedule()
returns table (rule text, keeps text, runs text)
language sql
immutable
set search_path = ''
as $$
  values
    ('Unpublished Write for Qirtas submissions and their files', '12 months after the decision', null),
    ('Write for Qirtas drafts', '12 months after the last change', 'private.purge_stale_drafts'),
    ('Blind copies, assignments, scores and decisions of deleted submissions', '12 months', 'private.purge_blind_entries'),
    ('Invitation lists', '30 days after the list is sent', 'private.purge_tour_lists'),
    ('Unclaimed spring 2026 Tour pages', 'until the spring 2027 Tour (tour.unclaimed_until)', 'private.purge_unclaimed_tour_pages'),
    ('Associate membership requests', '1 year after the decision', 'private.purge_associate_requests'),
    ('Qalam consent forms (F-38, F-39) and the roster with attendance', '3 years after the program year', 'private.purge_qalam_records'),
    ('Incident records (F-16)', '7 years', 'private.purge_incident_records'),
    ('Ballots, ballot receipts and voter lists', '1 year after the vote closes', 'private.purge_expired_ballots'),
    ('Who voted for the Prize', '1 year after the vote closes', 'private.purge_prize_vote_receipts'),
    ('Get involved replies', '12 months after the last change', 'private.purge_opening_replies'),
    ('Removal requests', '2 years after closing', 'private.purge_removal_requests'),
    ('Unconfirmed Sunday Paper sign-ups', 'until the confirmation window closes', 'private.purge_unconfirmed_subscribers'),
    ('Unconfirmed personal email requests', '7 days', 'private.purge_personal_email_requests'),
    ('Push subscriptions and calendar feed addresses', '12 months without a sign-in', 'private.purge_idle_devices'),
    ('Guest accounts', '2 years without a sign-in, holding no role', null),
    ('The activity log', '12 months', 'private.purge_activity_log'),
    ('Sent emails in the outbox', '30 days after sending', 'private.prune_outbox');
$$;

create function private.run_retention()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  n integer;
  done jsonb := '{}'::jsonb;
  failed jsonb := '[]'::jsonb;
begin
  for r in select s.rule, s.runs from private.retention_schedule() s where s.runs is not null loop
    begin
      execute format('select %s()', r.runs) into n;
      done := done || jsonb_build_object(r.rule, coalesce(n, 0));
    exception when others then
      failed := failed || jsonb_build_array(jsonb_build_object(
        'job', 'retention: ' || r.rule,
        'failures', 1,
        'last_error', left(sqlerrm, 300),
        'last_at', now()));
    end;
  end loop;
  if jsonb_array_length(failed) > 0 then
    perform private.enqueue('platform.cron_failed',
      jsonb_build_object('jobs', failed, 'day', (now() at time zone 'UTC')::date));
  end if;
  return jsonb_build_object('deleted', done, 'failed', failed);
end;
$$;

-- The names the route calls (service role only).
create function core.run_retention()
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.run_retention() $$;

create function core.retention_due()
returns table (kind text, ref text)
language sql
stable
security invoker
set search_path = ''
as $$
  select 'tour_photo', p from private.unclaimed_tour_photos() p
  union all
  select 'guest_account', g::text from private.idle_guest_accounts() g;
$$;

create function core.retention_schedule()
returns table (rule text, keeps text, runs text)
language sql
immutable
security invoker
set search_path = ''
as $$ select * from private.retention_schedule() $$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'private.unclaimed_tour_photos()', 'private.purge_unclaimed_tour_pages()',
    'private.purge_stale_drafts()', 'private.purge_blind_entries()',
    'private.purge_incident_records()', 'private.purge_opening_replies()',
    'private.purge_removal_requests()', 'private.purge_prize_vote_receipts()',
    'private.purge_idle_devices()', 'private.purge_personal_email_requests()',
    'private.idle_guest_accounts()', 'private.retention_schedule()',
    'private.run_retention()', 'core.run_retention()', 'core.retention_due()'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end;
$$;

-- The schedule is public policy (the Privacy Notice shows it).
revoke all on function core.retention_schedule() from public;
grant execute on function core.retention_schedule() to anon, authenticated, service_role;
grant execute on function private.retention_schedule() to anon, authenticated;

-- ── One job ─────────────────────────────────────────────────────────────
do $$
declare
  j text;
begin
  foreach j in array array['sal-ballot-retention', 'sal-outbox-prune', 'sal-tour-lists',
    'sal-qalam-retention', 'sal-newsletter-unconfirmed', 'sal-activity-log'] loop
    if exists (select 1 from cron.job where jobname = j) then
      perform cron.unschedule(j);
    end if;
  end loop;
end;
$$;

select cron.schedule('sal-retention', '15 5 * * *', $$ select private.run_retention() $$);
