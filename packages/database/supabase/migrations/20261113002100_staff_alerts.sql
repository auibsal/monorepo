-- Immediate staff alerts (decisions.md, Channels and email: urgent ones at
-- once; the fourth prompt, 7p): a new concern goes at once to the
-- complaints panel's chair (the Vice President, decisions.md, Governance;
-- one about the Vice President or the President to whoever receives those),
-- and an incident report from an event's page goes at once to the Director
-- of Events and the President.
--
-- The incident report (decisions.md, Forms: "an incident report from the
-- event's page") is a Diwan record with a name in it: whoever runs the
-- event writes it; the Director of Events and the President (events.manage
-- for the whole Society) read it; the writer reads their own. It is kept
-- seven years (decisions.md, Records), with the retired F-16 submissions.

create table events.incident_reports (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events.events (id) on delete cascade,
  reported_by uuid default auth.uid() references auth.users (id) on delete set null,
  happened_at timestamptz not null default now(),
  what_happened text not null check (length(btrim(what_happened)) between 1 and 4000),
  action_taken text check (action_taken is null or length(action_taken) <= 4000),
  created_at timestamptz not null default now()
);

comment on table events.incident_reports is
  'Incident reports from an event''s page (decisions.md, Forms): written by whoever runs the event, read by the Director of Events and the President; kept seven years.';

create index incident_reports_event_id_idx on events.incident_reports (event_id);
create index incident_reports_reported_by_idx on events.incident_reports (reported_by);

alter table events.incident_reports enable row level security;

create policy "Event staff report; the Society's event managers read" on events.incident_reports
  for select to authenticated
  using (
    reported_by = (select auth.uid())
    or (select access.has_permission('events.manage'))
  );
create policy "Event staff report an incident" on events.incident_reports
  for insert to authenticated
  with check (
    reported_by = (select auth.uid())
    and exists (
      select 1 from events.events e
      where e.id = event_id
        and (access.has_permission('events.manage', 'event', e.id)
          or access.has_permission('events.manage', 'programme', e.programme_id))
    )
  );
create policy "No third-party apps" on events.incident_reports
  as restrictive for all to authenticated
  using ((select private.client_allows('events')))
  with check ((select private.client_allows('events')));

grant select, insert on events.incident_reports to authenticated;

-- The alerts.
create function private.after_incident_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.enqueue('events.incident_reported',
    jsonb_build_object('report_id', new.id, 'event_id', new.event_id));
  return null;
end;
$$;

revoke all on function private.after_incident_report() from public, anon, authenticated;

create trigger after_incident_report
  after insert on events.incident_reports
  for each row execute function private.after_incident_report();

create function private.after_concern_raised()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- When it is sent (a draft is not yet a concern). Only the id and its
  -- routing: the alert names no one (a concern may be sealed). A concern
  -- about the Vice President or the President goes to whoever receives
  -- those instead (concerns.about_vp, concerns.about_president).
  if new.form_key = 'f21' and new.status <> 'draft'
     and (tg_op = 'INSERT' or old.status = 'draft') then
    perform private.enqueue('governance.concern_raised',
      jsonb_build_object('submission_id', new.id, 'routing', new.routing));
  end if;
  return null;
end;
$$;

revoke all on function private.after_concern_raised() from public, anon, authenticated;

create trigger after_concern_raised
  after insert or update of status on governance.form_submissions
  for each row execute function private.after_concern_raised();

-- Seven years, with the retired F-16 submissions.
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
  delete from governance.form_submissions
  where form_key = 'f16' and coalesce(signed_at, submitted_at, created_at) < now() - interval '7 years';
  get diagnostics n = row_count;
  delete from events.incident_reports
  where created_at < now() - interval '7 years';
  get diagnostics m = row_count;
  return n + m;
end;
$$;
