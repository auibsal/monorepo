-- The site is the system of record (decisions.md, Where things live;
-- Events). Events are made and edited only in the Diwan; Notion's Events
-- database becomes a read-only copy the site writes, and its Needs rows
-- move here. With them: Hudhud's one post per new event, the standard
-- shifts on each new event, Student Life's weekly email, the weekly scan
-- of Notion's documents, and alerts that never fail silently.

-- ── Events: what Notion held ────────────────────────────────────────────────

-- The event's lead, picked from the register (decisions.md, Events: an
-- event is published only with a lead and a confirmed place).
alter table events.events
  add column lead_id uuid references auth.users (id) on delete set null,
  -- When Hudhud announced it in the members' group (once, never again).
  add column announced_at timestamptz;
comment on column events.events.lead_id is
  'The event''s lead, picked from the register (decisions.md, Events).';
comment on column events.events.announced_at is
  'When Hudhud posted the event to the members'' group''s Events topic, once (decisions.md, Channels).';
create index events_lead_id_idx on events.events (lead_id);

-- Events are made in the Diwan now, not copied from Notion: whoever holds
-- events.manage makes one, and a draft made by mistake can be deleted
-- (these were dropped on Nov 8, when the sync made every event).
create policy "Event managers create events" on events.events
  for insert to authenticated
  with check (
    (select access.has_permission('events.manage'))
    or (select access.has_permission('events.manage', 'programme', programme_id))
  );
create policy "Event managers delete draft events" on events.events
  for delete to authenticated
  using (status = 'draft' and (select private.leads_event('events.manage', id, programme_id)));

grant insert (lead_id, entry, partner_id, off_campus, serves_food),
  update (lead_id)
  on events.events to authenticated;

-- The debrief's link is set on the event's page in the Diwan now.
create policy "The event's staff keep its debrief link" on events.debriefs
  for all to authenticated
  using ((select private.has_permission('events.manage')) or (select private.leads_event_id(event_id)))
  with check ((select private.has_permission('events.manage')) or (select private.leads_event_id(event_id)));
grant insert, update, delete on events.debriefs to authenticated;

-- An event is published only with a lead and a confirmed place, as the
-- Notion check said before (decisions.md, Events). Council meetings and
-- drafts are free to be incomplete.
create function private.event_ready_to_publish()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published'
    and (tg_op = 'INSERT' or old.status is distinct from 'published')
    and (new.lead_id is null or coalesce(trim(new.venue_en), '') = '')
    and (select auth.uid()) is not null
  then
    raise exception 'event_needs_lead_and_place' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.event_ready_to_publish() from public, anon, authenticated;
create trigger event_ready_to_publish before insert or update of status on events.events
  for each row execute function private.event_ready_to_publish();

-- ── Default shifts on each new event ────────────────────────────────────────

-- Decisions.md, Events: each new event gets the standard volunteer shifts
-- (check-in for two, refreshments for two when food is served, the
-- membership table for one), editable on its page. A shift belongs to its
-- event and goes with it. They run from half an
-- hour before the start to the end (two hours when no end is set).
alter table programmes.shifts drop constraint shifts_event_id_fkey;
alter table programmes.shifts add constraint shifts_event_id_fkey
  foreign key (event_id) references events.events (id) on delete cascade;

create function private.add_shift(e events.events, en text, ar text, places integer, at_door boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into programmes.shifts (event_id, role_en, role_ar, capacity, station, starts_at, ends_at)
  select e.id, en, ar, places, at_door, e.starts_at - interval '30 minutes',
    coalesce(e.ends_at, e.starts_at + interval '2 hours')
  where not exists (
    select 1 from programmes.shifts s where s.event_id = e.id and s.role_en = en
  );
$$;
revoke all on function private.add_shift(events.events, text, text, integer, boolean) from public, anon, authenticated;

create function private.default_shifts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.add_shift(new, 'Check-in', 'تسجيل الحضور', 2, true);
    perform private.add_shift(new, 'Membership table', 'طاولة العضوية', 1, false);
  end if;
  if new.serves_food and (tg_op = 'INSERT' or not old.serves_food) then
    perform private.add_shift(new, 'Refreshments', 'الضيافة', 2, false);
  end if;
  return null;
end;
$$;
revoke all on function private.default_shifts() from public, anon, authenticated;
create trigger default_shifts after insert or update of serves_food on events.events
  for each row execute function private.default_shifts();

-- Added now to the events still ahead that have none (the screening first).
do $$
declare e events.events;
begin
  for e in
    select * from events.events
    where status <> 'canceled' and starts_at > now()
      and not exists (select 1 from programmes.shifts s where s.event_id = events.events.id)
  loop
    perform private.add_shift(e, 'Check-in', 'تسجيل الحضور', 2, true);
    perform private.add_shift(e, 'Membership table', 'طاولة العضوية', 1, false);
    if e.serves_food then
      perform private.add_shift(e, 'Refreshments', 'الضيافة', 2, false);
    end if;
  end loop;
end;
$$;

-- ── Needs: events, productions and Editions ─────────────────────────────────

-- Decisions.md, Where things live: needs and requests to Student Life are
-- the site's. Notion's Needs rows move here (some have no date yet), and a
-- need can belong to a production or an Edition as well as an event or a
-- standing activity.
alter table programmes.needs
  alter column needed_by drop not null,
  add column production_id uuid references programmes.productions (id) on delete cascade,
  add column issue_id uuid references journal.issues (id) on delete cascade;
alter table programmes.needs drop constraint needs_purpose_check;
alter table programmes.needs add constraint needs_purpose_check
  check (char_length(purpose) <= 500);
alter table programmes.needs alter column purpose set default '';
create index needs_production_id_idx on programmes.needs (production_id);
create index needs_issue_id_idx on programmes.needs (issue_id);
comment on column programmes.needs.production_id is
  'The Company production the item is for (decisions.md, Where things live).';
comment on column programmes.needs.issue_id is
  'The Qirtas Edition the item is for (decisions.md, Where things live).';

-- Who lists a need: as before, plus a production's managers and Qirtas's
-- editors for an Edition.
create function private.lists_need(programme_id uuid, event_id uuid, production_id uuid, issue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.lists_needs(lists_need.programme_id, lists_need.event_id)
    or (lists_need.production_id is not null
        and (private.has_permission('productions.manage')
          or private.has_permission('productions.manage', 'production', lists_need.production_id)))
    or (lists_need.issue_id is not null and private.has_permission('journal.manage'));
$$;
revoke all on function private.lists_need(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function private.lists_need(uuid, uuid, uuid, uuid) to authenticated;

drop policy "Program managers and the General Secretary update needs" on programmes.needs;
create policy "Program managers and the General Secretary update needs" on programmes.needs
  for update to authenticated
  using ((select private.lists_need(programme_id, event_id, production_id, issue_id)) or (select private.has_permission('governance.manage')))
  with check ((select private.lists_need(programme_id, event_id, production_id, issue_id)) or (select private.has_permission('governance.manage')));
drop policy "Program managers list needs" on programmes.needs;
create policy "Program managers list needs" on programmes.needs
  for insert to authenticated
  with check ((select private.lists_need(programme_id, event_id, production_id, issue_id)) or (select private.has_permission('governance.manage')));
drop policy "Program managers remove needs not yet requested" on programmes.needs;
create policy "Program managers remove needs not yet requested" on programmes.needs
  for delete to authenticated
  using (((status = 'listed') and (select private.lists_need(programme_id, event_id, production_id, issue_id))) or (select private.has_permission('governance.manage')));
drop policy "Select by authenticated" on programmes.needs;
create policy "Select by authenticated" on programmes.needs
  for select to authenticated
  using ((select private.lists_need(programme_id, event_id, production_id, issue_id)) or (select private.has_permission('governance.manage')));

-- Notion's copies of needs, like the events' (one row per need).
alter table core.notion_links drop constraint notion_links_kind_check;
alter table core.notion_links add constraint notion_links_kind_check
  check (kind in (
    'event', 'event_ar', 'news', 'officer', 'programme', 'programme_ar',
    'document', 'minutes', 'journal_stage', 'piece', 'piece_ar', 'need'
  ));

-- The Needs database joins the sync's sources where the workspace is set
-- up (production); its id is the database's, not anyone's data.
update core.settings
set value = value || '{"needs": "f807e3bc-a835-48e4-b7d2-f9487d138ea0"}'::jsonb
where key = 'notion.data_sources' and not (value ? 'needs');

-- ── Student Life's weekly email ─────────────────────────────────────────────

-- Decisions.md, Events: each Wednesday Student Life gets next week's
-- public events by the secure link, a ready-to-paste paragraph and image
-- for each, and marks each as included in their own announcements or not.
create table events.student_life_weeks (
  id uuid primary key default gen_random_uuid(),
  week_of date not null unique,
  -- The single-use link's hash; the link itself goes only in the email.
  token_hash text not null unique,
  sent_at timestamptz,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);
comment on table events.student_life_weeks is
  'Student Life''s weekly email of next week''s public events, sent each Wednesday by the secure link (decisions.md, Events).';

create table events.student_life_week_events (
  week_id uuid not null references events.student_life_weeks (id) on delete cascade,
  event_id uuid not null references events.events (id) on delete cascade,
  included boolean,
  answered_at timestamptz,
  primary key (week_id, event_id)
);
create index student_life_week_events_event_id_idx on events.student_life_week_events (event_id);
comment on table events.student_life_week_events is
  'Each event in a week''s email to Student Life, and whether they included it (null until they answer).';

alter table events.student_life_weeks enable row level security;
alter table events.student_life_week_events enable row level security;

create policy "No third-party apps" on events.student_life_weeks
  as restrictive for all to authenticated
  using ((select private.client_allows('events')))
  with check ((select private.client_allows('events')));
create policy "No third-party apps" on events.student_life_week_events
  as restrictive for all to authenticated
  using ((select private.client_allows('events')))
  with check ((select private.client_allows('events')));
create policy "Event managers read Student Life's weeks" on events.student_life_weeks
  for select to authenticated
  using ((select private.has_permission('events.manage')) or (select private.has_permission('governance.manage')));
create policy "Event managers read Student Life's answers" on events.student_life_week_events
  for select to authenticated
  using ((select private.has_permission('events.manage')) or (select private.has_permission('governance.manage')));

revoke all on events.student_life_weeks, events.student_life_week_events from anon, authenticated;
grant select (id, week_of, sent_at, answered_at, created_at) on events.student_life_weeks to authenticated;
grant select on events.student_life_week_events to authenticated;
grant all on events.student_life_weeks, events.student_life_week_events to service_role;

-- Wednesdays at 9:00 a.m. Baghdad time (6:00 UTC): the email goes out.
select cron.schedule('sal-student-life-week', '0 6 * * 3',
  $$ select private.enqueue('events.student_life_week', '{}'::jsonb) $$);

-- ── The weekly scan of Notion's documents ───────────────────────────────────

-- Decisions.md, Where things live: no personal data in Notion, and no
-- retired names anywhere. Each week the site reads every document page
-- and lists what it found here, for the document's keeper (the seat in
-- its Owner) and the web lead. What it found is shown by kind and the
-- words around it; a found address or number is masked.
create table core.document_scan_hits (
  id uuid primary key default gen_random_uuid(),
  notion_page_id text not null,
  title text not null check (char_length(title) between 1 and 300),
  url text not null check (url ~ '^https://'),
  keeper text,
  kind text not null check (kind in ('retired_name', 'term', 'personal_data')),
  found text not null check (char_length(found) between 1 and 300),
  scanned_at timestamptz not null default now()
);
create index document_scan_hits_page_idx on core.document_scan_hits (notion_page_id);
comment on table core.document_scan_hits is
  'What the weekly scan of Notion''s documents found (retired names, terms to check, personal data), for each document''s keeper; replaced whole by each scan.';
comment on column core.document_scan_hits.keeper is
  'The seat in the document''s Owner (a Council seat''s English name).';

-- Whether the caller holds the seat named (a Council role's English name).
create function private.holds_seat(seat text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from access.role_assignments a
    join access.roles r on r.key = a.role
    where a.user_id = (select auth.uid()) and r.name_en = holds_seat.seat
      and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now())
  );
$$;
revoke all on function private.holds_seat(text) from public, anon;
grant execute on function private.holds_seat(text) to authenticated;

alter table core.document_scan_hits enable row level security;
create policy "No third-party apps" on core.document_scan_hits
  as restrictive for all to authenticated
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));
create policy "The keeper and the web lead read scan findings" on core.document_scan_hits
  for select to authenticated
  using ((select private.has_permission('settings.manage')) or (select private.holds_seat(keeper)));
revoke all on core.document_scan_hits from anon, authenticated;
grant select on core.document_scan_hits to authenticated;
grant all on core.document_scan_hits to service_role;

-- ── No silent failures ──────────────────────────────────────────────────────

-- Decisions.md, The site: failures post at once to the Diwan group's web
-- topic and the Desk, for the web lead and the owner. The web team's
-- alerts are read by those who hold settings.manage.
alter table core.staff_alerts drop constraint staff_alerts_team_check;
alter table core.staff_alerts add constraint staff_alerts_team_check
  check (team in ('council', 'qirtas', 'media', 'events', 'membership', 'partnerships', 'web'));
drop policy "Role holders read staff alerts" on core.staff_alerts;
create policy "Role holders read staff alerts" on core.staff_alerts
  for select to authenticated
  using (
    case when team = 'web' then (select private.has_permission('settings.manage'))
    else (select private.i_am_staff()) end
  );

-- Hourly: a scheduled job that failed or is late, a Notion sync with no
-- run in an hour, an email outbox with a message waiting over an hour.
-- Each is one urgent alert for the web team, once per thing per day.
create function private.platform_health()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer := 0;
  day text := to_char(now() at time zone 'Asia/Baghdad', 'YYYY-MM-DD');
  r record;
  synced timestamptz;
  oldest timestamptz;
begin
  -- Failed in the last hour.
  for r in
    select j.jobname, max(d.end_time) as at
    from cron.job_run_details d join cron.job j on j.jobid = d.jobid
    where d.status = 'failed' and d.end_time > now() - interval '1 hour'
    group by j.jobname
  loop
    insert into core.staff_alerts (team, urgent, text_en, text_ar, dedupe_key)
    values ('web', true,
      format('The scheduled job %s failed. Its runs are in Supabase, Integrations, Cron.', r.jobname),
      format('فشلت المهمة المجدولة %s. سجلّ تشغيلها في Supabase، ضمن Integrations ثم Cron.', r.jobname),
      format('cron-failed:%s:%s', r.jobname, day))
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
    n := n + 1;
  end loop;
  -- Late: a job that runs every few minutes or hourly with no success in
  -- two hours, or a daily one with none in 26 hours.
  for r in
    select j.jobname
    from cron.job j
    where j.active
      and (
        (j.schedule ~ '^(\*/\d+|\d+) \* \* \* \*$'
          and not exists (select 1 from cron.job_run_details d
            where d.jobid = j.jobid and d.status = 'succeeded' and d.end_time > now() - interval '2 hours'))
        or (j.schedule ~ '^\d+ \d+ \* \* \*$'
          and not exists (select 1 from cron.job_run_details d
            where d.jobid = j.jobid and d.status = 'succeeded' and d.end_time > now() - interval '26 hours'))
      )
      and exists (select 1 from cron.job_run_details d where d.jobid = j.jobid)
  loop
    insert into core.staff_alerts (team, urgent, text_en, text_ar, dedupe_key)
    values ('web', true,
      format('The scheduled job %s is late: it has not run successfully when it should have.', r.jobname),
      format('تأخّرت المهمة المجدولة %s: لم تُنفَّذ بنجاح في موعدها.', r.jobname),
      format('cron-late:%s:%s', r.jobname, day))
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
    n := n + 1;
  end loop;
  -- The Notion sync, where it is set up.
  select (value ->> 'at')::timestamptz into synced from core.settings where key = 'notion.sync_state';
  if exists (select 1 from core.settings where key = 'notion.data_sources' and value ? 'events')
    and (synced is null or synced < now() - interval '1 hour')
  then
    insert into core.staff_alerts (team, urgent, text_en, text_ar, dedupe_key)
    values ('web', true,
      'The Notion sync has not finished a run in over an hour. Check NOTION_TOKEN and the runtime log on Vercel.',
      'لم تكتمل مزامنة Notion منذ أكثر من ساعة. راجع NOTION_TOKEN وسجلّ التشغيل على Vercel.',
      'notion-stalled:' || day)
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
    n := n + 1;
  end if;
  -- The email outbox.
  select min(created_at) into oldest from core.outbox where processed_at is null;
  if oldest is not null and oldest < now() - interval '1 hour' then
    insert into core.staff_alerts (team, urgent, text_en, text_ar, dedupe_key)
    values ('web', true,
      'An email has waited in the outbox for over an hour. Check RESEND_TOKEN and the outbox job on Vercel.',
      'ينتظر بريد في صندوق الإرسال منذ أكثر من ساعة. راجع RESEND_TOKEN ومهمة الإرسال على Vercel.',
      'outbox-stalled:' || day)
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
    n := n + 1;
  end if;
  return n;
end;
$$;
revoke all on function private.platform_health() from public, anon, authenticated;
comment on function private.platform_health() is
  'Hourly: urgent web-team alerts for a failed or late scheduled job, a stalled Notion sync and a stalled email outbox (decisions.md, The site: no silent failures).';

select cron.schedule('sal-platform-health', '20 * * * *', $$ select private.platform_health() $$);
