-- Autosave (the owner, Nov 17, 2026; decisions.md, The site): one drafts
-- table, keyed by person and record. What someone types is kept here as
-- they type; nothing goes live until Save or Send. A draft is deleted on
-- Save, Send or Discard, and 30 days after its last change (retention).
-- Only its owner reaches it.
create table core.drafts (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- The record and the part of it ("announcement:<id>", "call:new:<edition>").
  record_key text not null check (char_length(record_key) between 3 and 200),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, record_key),
  check (pg_column_size(data) <= 262144)
);
create index drafts_updated_at_idx on core.drafts (updated_at);

alter table core.drafts enable row level security;
create policy "No third-party apps" on core.drafts
  as restrictive for all to authenticated
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));
create policy "Each person reads their drafts" on core.drafts
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Each person keeps their drafts" on core.drafts
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Each person updates their drafts" on core.drafts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Each person deletes their drafts" on core.drafts
  for delete to authenticated
  using (user_id = (select auth.uid()));
grant select, insert, update, delete on core.drafts to authenticated;
grant all on core.drafts to service_role;

-- Each change dates the draft.
create function private.touch_draft()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.touch_draft() from public, anon, authenticated;
create trigger touch_draft before update on core.drafts
  for each row execute function private.touch_draft();

create function private.purge_autosaved_drafts()
returns integer
language sql
security definer
set search_path = ''
as $$
  with gone as (
    delete from core.drafts where updated_at < now() - interval '30 days' returning 1
  )
  select count(*)::integer from gone;
$$;
revoke all on function private.purge_autosaved_drafts() from public, anon, authenticated;

CREATE OR REPLACE FUNCTION private.retention_schedule()
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
    ('Sign-ups never confirmed', '7 days', 'private.purge_unconfirmed_sign_ups'),
    ('Unconfirmed personal email requests', '7 days', 'private.purge_personal_email_requests'),
    ('Codes for a new AUIB address or a merge', '1 day', 'private.purge_address_codes'),
    ('Requests to merge two accounts', '1 year after the decision', 'private.purge_merge_requests'),
    ('Calendar feed addresses', '12 months without a sign-in', 'private.purge_idle_devices'),
    ('Guest accounts', '2 years without a sign-in, holding no role', null),
    ('Accounts their owners deleted', '30 days after the request, unless they sign in again', null),
    ('The activity log', '12 months', 'private.purge_activity_log'),
    ('Sent emails in the outbox', '30 days after sending', 'private.prune_outbox'),
    ('Problem reports', '1 year', 'private.purge_problem_reports'),
    ('Trip emergency contacts and health notes (F-45)', '7 days after the trip', 'private.purge_trip_contacts'),
    ('Recently deleted items (every area)', '30 days after deletion', 'private.purge_recently_deleted'),
    ('Changes saved as you type and never saved or sent', '30 days after the last change', 'private.purge_autosaved_drafts');
$function$;

select private.build_api();
