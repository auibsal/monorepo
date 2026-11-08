-- One vocabulary in the records (audit B6; STD-22 to STD-24, STD-41).
--
-- 1. American spelling in stored values: canceled, not cancelled (events,
--    RSVPs, shift sign-ups, productions, auditions).
-- 2. Robert's Rules: minutes are approved (RONR 48), a resolution that
--    doesn't pass has failed, an adopted document undone is rescinded.
-- 3. Email kinds in current names: Qirtas, Get involved, the Company,
--    removal requests, shifts (Resend tags follow).
--
-- Schemas and other identifiers keep their names (AGENTS.md: code
-- identifiers may stay). Functions are rewritten from their own
-- definitions, so nothing else in them changes.

-- A helper for this migration only: every function in the Society's
-- schemas whose body holds `old`, redefined with `new` in its place.
create function pg_temp.rewrite_functions(old text, new text)
returns integer
language plpgsql
as $$
declare
  f record;
  n integer := 0;
begin
  for f in
    select p.oid from pg_proc p
    join pg_namespace s on s.oid = p.pronamespace
    where s.nspname in ('private', 'core', 'access', 'membership', 'events', 'programmes',
                        'journal', 'governance', 'content')
      and p.prokind = 'f'
      and p.prosrc like '%' || old || '%'
  loop
    execute replace(pg_get_functiondef(f.oid), old, new);
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- ── 1. canceled ─────────────────────────────────────────────────────────────

alter table events.events drop constraint events_status_check;
alter table events.rsvps drop constraint rsvps_status_check;
alter table programmes.shift_signups drop constraint shift_signups_status_check;
alter table programmes.productions drop constraint productions_stage_check;
alter table programmes.audition_signups drop constraint audition_signups_status_check;

-- The rows' own triggers must not run for a spelling: no notices to the
-- people who booked, no revalidation, no history lines.
alter table events.events disable trigger user;
update events.events set status = 'canceled' where status = 'cancelled';
alter table events.events enable trigger user;
alter table events.rsvps disable trigger user;
update events.rsvps set status = 'canceled' where status = 'cancelled';
alter table events.rsvps enable trigger user;
alter table programmes.shift_signups disable trigger user;
update programmes.shift_signups set status = 'canceled' where status = 'cancelled';
alter table programmes.shift_signups enable trigger user;
alter table programmes.productions disable trigger user;
update programmes.productions set stage = 'canceled' where stage = 'cancelled';
alter table programmes.productions enable trigger user;
alter table programmes.audition_signups disable trigger user;
update programmes.audition_signups set status = 'canceled' where status = 'cancelled';
alter table programmes.audition_signups enable trigger user;

alter table events.events add constraint events_status_check
  check (status in ('draft', 'published', 'canceled'));
alter table events.rsvps add constraint rsvps_status_check
  check (status in ('confirmed', 'canceled'));
alter table programmes.shift_signups add constraint shift_signups_status_check
  check (status in ('signed_up', 'confirmed', 'swap_requested', 'canceled'));
alter table programmes.productions add constraint productions_stage_check
  check (stage in ('proposal', 'approved', 'auditions', 'rehearsals', 'tech', 'performances', 'closed', 'canceled'));
alter table programmes.audition_signups add constraint audition_signups_status_check
  check (status in ('signed_up', 'canceled', 'called_back', 'cast', 'not_cast'));

select pg_temp.rewrite_functions('''cancelled''', '''canceled''');

-- The two policies that name the status.
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check from pg_policies
    where qual like '%cancelled%' or with_check like '%cancelled%'
  loop
    execute format('alter policy %I on %I.%I using (%s)%s',
      p.policyname, p.schemaname, p.tablename,
      replace(coalesce(p.qual, 'true'), '''cancelled''', '''canceled'''),
      case when p.with_check is null then ''
        else format(' with check (%s)', replace(p.with_check, '''cancelled''', '''canceled''')) end);
  end loop;
end;
$$;

-- ── 2. approved minutes, failed resolutions, rescinded documents ───────────

alter table governance.minutes drop constraint minutes_status_check;
alter table governance.minutes drop constraint minutes_check;
alter table governance.resolutions drop constraint resolutions_status_check;
alter table governance.society_documents drop constraint society_documents_status_check;

-- Approved minutes are locked against change by their own trigger.
alter table governance.minutes disable trigger user;
update governance.minutes set status = 'approved' where status = 'adopted';
alter table governance.minutes enable trigger user;
alter table governance.resolutions disable trigger user;
update governance.resolutions set status = 'failed' where status = 'rejected';
alter table governance.resolutions enable trigger user;
alter table governance.society_documents disable trigger user;
update governance.society_documents set status = 'rescinded' where status = 'superseded';
alter table governance.society_documents enable trigger user;

alter table governance.minutes add constraint minutes_status_check
  check (status in ('draft', 'approved'));
alter table governance.minutes add constraint minutes_check
  check ((status = 'approved') = (adopted_on is not null));
alter table governance.resolutions add constraint resolutions_status_check
  check (status in ('draft', 'adopted', 'failed', 'withdrawn'));
alter table governance.society_documents add constraint society_documents_status_check
  check (status in ('proposed', 'adopted', 'rescinded'));

comment on column governance.minutes.adopted_on is
  'The date the minutes were approved (RONR 48: minutes are approved, motions adopted).';

-- The function that locks approved minutes reads their status.
do $$
declare
  f record;
begin
  for f in
    select p.oid from pg_proc p
    join pg_namespace s on s.oid = p.pronamespace
    where s.nspname = 'private' and p.proname = 'lock_adopted_minutes'
  loop
    execute replace(pg_get_functiondef(f.oid), '''adopted''', '''approved''');
  end loop;
end;
$$;

-- ── 3. Email kinds ──────────────────────────────────────────────────────────

create temporary table kind_renames (old text primary key, new text not null) on commit drop;
insert into kind_renames values
  ('journal.agreement_reminder', 'qirtas.agreement_reminder'),
  ('journal.call_opened', 'qirtas.call_opened'),
  ('journal.decision', 'qirtas.decision'),
  ('journal.final_check', 'qirtas.final_check'),
  ('journal.piece_note', 'qirtas.piece_note'),
  ('journal.piece_published', 'qirtas.piece_published'),
  ('journal.returned_for_formatting', 'qirtas.returned_for_formatting'),
  ('journal.submission_received', 'qirtas.submission_received'),
  ('programmes.audition_update', 'company.audition_update'),
  ('programmes.removal_done', 'removal.done'),
  ('programmes.removal_overdue', 'removal.overdue'),
  ('programmes.removal_requested', 'removal.requested'),
  ('programmes.replies_digest', 'get_involved.replies_digest'),
  ('programmes.reply_update', 'get_involved.reply_update'),
  ('programmes.shift_reminder', 'events.shift_reminder');

select pg_temp.rewrite_functions(quote_literal(r.old), quote_literal(r.new)) from kind_renames r;

-- Notices already queued go out under their new names.
update core.outbox o set kind = r.new from kind_renames r where o.kind = r.old;

-- Members read approved minutes.
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname, qual from pg_policies
    where schemaname = 'governance' and tablename = 'minutes' and qual like '%''adopted''%'
  loop
    execute format('alter policy %I on %I.%I using (%s)',
      p.policyname, p.schemaname, p.tablename, replace(p.qual, '''adopted''', '''approved'''));
  end loop;
end;
$$;
