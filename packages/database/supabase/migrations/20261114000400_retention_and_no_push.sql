-- The tenth site prompt (Nov 14, 2026; decisions.md, Privacy and data and
-- The platform).
--
-- 1. Incident records are kept two years after the case closes; seven
--    years only for Qalam's (GOV-03, GOV-04). A case closes when the
--    Director of Events or the President marks it closed; an open case is
--    kept.
-- 2. Browser push goes: notices are email and Hudhud only. The stored
--    subscriptions are deleted with their table.

-- ── 1. Incident records ──────────────────────────────────────────────────
alter table events.incident_reports
  add column closed_at timestamptz,
  add column qalam boolean not null default false;

comment on column events.incident_reports.closed_at is
  'When the case closed; the record is kept two years from then (seven for Qalam).';
comment on column events.incident_reports.qalam is
  'An incident in Qalam, kept seven years after the case closes.';

create or replace function private.purge_incident_records()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
  m integer;
begin
  -- The Notion-filed kind (none on the site): two years after it closed.
  delete from governance.form_submissions
  where form_key = 'incident-report' and closed_at is not null
    and closed_at < now() - interval '2 years';
  get diagnostics n = row_count;
  delete from events.incident_reports
  where closed_at is not null
    and closed_at < now() - case when qalam then interval '7 years' else interval '2 years' end;
  get diagnostics m = row_count;
  return n + m;
end;
$$;

-- Closing a case: whoever reads the event's incidents.
create function private.close_incident(report uuid, closed boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('events.manage') then
    raise exception 'Only the Director of Events or the President closes a case' using errcode = '42501';
  end if;
  update events.incident_reports
  set closed_at = case when closed then coalesce(closed_at, now()) end
  where id = report;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function private.close_incident(uuid, boolean) from public, anon;
grant execute on function private.close_incident(uuid, boolean) to authenticated;

create function events.close_incident(report uuid, closed boolean)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.close_incident(report, closed) $$;
revoke all on function events.close_incident(uuid, boolean) from public, anon;
grant execute on function events.close_incident(uuid, boolean) to authenticated;

-- ── 2. No browser push ───────────────────────────────────────────────────
drop function if exists core.save_push_subscription(text, text, text, text);
drop function if exists private.save_push_subscription(text, text, text, text);
drop table if exists core.push_subscriptions;

create or replace function private.purge_idle_devices()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from membership.calendar_tokens t
  using auth.users u
  where u.id = t.user_id and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '12 months';
  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function private.retention_schedule()
 RETURNS TABLE(rule text, keeps text, runs text)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  values
    ('Unpublished Write for Qirtas submissions and their files', '12 months after the decision', null),
    ('Write for Qirtas drafts', '12 months after the last change', 'private.purge_stale_drafts'),
    ('Blind copies, assignments, scores and decisions of deleted submissions', '12 months', 'private.purge_blind_entries'),
    ('Invitation lists', '30 days after the list is sent', 'private.purge_tour_lists'),
    ('Unclaimed spring 2026 Tour pages', 'until the spring 2027 Tour (tour.unclaimed_until)', 'private.purge_unclaimed_tour_pages'),
    ('Associate membership requests', '1 year after the decision', 'private.purge_associate_requests'),
    ('Qalam consent forms (F-38, F-39) and the roster with attendance', '3 years after the program year', 'private.purge_qalam_records'),
    ('Incident records', '2 years after the case closes (Qalam''s: 7 years)', 'private.purge_incident_records'),
    ('Ballots, ballot receipts and voter lists', '1 year after the vote closes', 'private.purge_expired_ballots'),
    ('Who voted for the Prize', '1 year after the vote closes', 'private.purge_prize_vote_receipts'),
    ('Get involved replies', '12 months after the last change', 'private.purge_opening_replies'),
    ('Removal requests', '2 years after closing', 'private.purge_removal_requests'),
    ('Unconfirmed Sunday Paper sign-ups', 'until the confirmation window closes', 'private.purge_unconfirmed_subscribers'),
    ('Unconfirmed personal email requests', '7 days', 'private.purge_personal_email_requests'),
    ('Calendar feed addresses', '12 months without a sign-in', 'private.purge_idle_devices'),
    ('Guest accounts', '2 years without a sign-in, holding no role', null),
    ('Accounts their owners deleted', '30 days after the request, unless they sign in again', null),
    ('The activity log', '12 months', 'private.purge_activity_log'),
    ('Sent emails in the outbox', '30 days after sending', 'private.prune_outbox'),
    ('Problem reports', '1 year', 'private.purge_problem_reports'),
    ('Trip emergency contacts and health notes (F-45)', '7 days after the trip', 'private.purge_trip_contacts');
$function$;
