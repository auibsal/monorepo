-- "Report a problem" on every page, reaching the web lead in the Diwan
-- (decisions.md, The site). Written by the API route after its checks
-- (anyone may report; a signed-in person's account is attached); read and
-- closed by whoever holds settings.manage (the web lead; the President).

create table core.problem_reports (
  id uuid primary key default gen_random_uuid(),
  page text not null check (char_length(page) between 1 and 500),
  message text not null check (char_length(message) between 5 and 2000),
  user_id uuid references auth.users (id) on delete set null,
  -- For a reply when the person isn't signed in; optional.
  reply_to text check (reply_to is null or reply_to ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  lang text not null default 'en' check (lang in ('en', 'ar')),
  status text not null default 'open' check (status in ('open', 'fixed', 'closed')),
  handled_by uuid references auth.users (id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

create index problem_reports_open_idx on core.problem_reports (created_at) where status = 'open';
create index problem_reports_user_idx on core.problem_reports (user_id);
create index problem_reports_handled_by_idx on core.problem_reports (handled_by);

alter table core.problem_reports enable row level security;

create policy "No third-party apps" on core.problem_reports
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));

create policy "The web lead reads problem reports" on core.problem_reports
  for select to authenticated
  using ((select private.has_permission('settings.manage')));

create policy "The web lead closes problem reports" on core.problem_reports
  for update to authenticated
  using ((select private.has_permission('settings.manage')))
  with check ((select private.has_permission('settings.manage')));

grant select, update (status, handled_by, handled_at) on core.problem_reports to authenticated;
grant all on core.problem_reports to service_role;

comment on table core.problem_reports is
  'Problems people report from any page (decisions.md, The site), for the web lead; a reply address only when the person isn''t signed in. Kept a year.';

-- Kept a year, by the one retention job (decisions.md, The site).
create function private.purge_problem_reports()
returns integer
language sql
security definer
set search_path = ''
as $$
  with gone as (
    delete from core.problem_reports where created_at < now() - interval '1 year'
    returning 1
  )
  select count(*)::integer from gone;
$$;

revoke all on function private.purge_problem_reports() from public, anon, authenticated;
grant execute on function private.purge_problem_reports() to service_role;

create or replace function private.retention_schedule()
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
    ('Sent emails in the outbox', '30 days after sending', 'private.prune_outbox'),
    ('Problem reports', '1 year', 'private.purge_problem_reports');
$$;
