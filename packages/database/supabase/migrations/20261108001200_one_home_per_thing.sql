-- One home per thing (decisions §8, §10). Events and minutes are written in
-- Notion and copied to the site by the sync; the Diwan shows them and keeps
-- only the site's own parts (RSVPs, check-in, shifts, the partner
-- checklist, approvals). Voting rights count check-ins only, and an event's
-- access comes from its access type alone: Open, RSVP, Members or Private.

-- ── Access from the access type only ─────────────────────────────────────────

alter table events.events drop constraint events_entry_check;
update events.events set entry = 'members'
where members_only and entry in ('open', 'rsvp');
alter table events.events add constraint events_entry_check
  check (entry in ('open', 'rsvp', 'members', 'invite'));
comment on column events.events.entry is
  'Access (decisions §10): open (just come), rsvp (book a place), members (members book a place) or invite (private: invited people only).';

-- Members events take bookings like RSVP events.
create or replace function private.event_entry_sync()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if not new.rsvp_enabled and new.entry = 'rsvp' then
      new.entry := 'open';
    end if;
  elsif new.entry = old.entry and new.entry in ('open', 'rsvp')
    and new.rsvp_enabled is distinct from old.rsvp_enabled then
    new.entry := case when new.rsvp_enabled then 'rsvp' else 'open' end;
  end if;
  new.rsvp_enabled := new.entry <> 'open';
  return new;
end;
$$;

-- members_only stays as a name every reader knows, now derived from the
-- access type and never written.
drop policy "Anyone reads published public events" on events.events;
drop policy "Signed-in users read the events they may see" on events.events;
drop index events.events_public_idx;
alter table events.events drop column members_only;
alter table events.events add column members_only boolean
  not null generated always as (entry in ('members', 'invite')) stored;
comment on column events.events.members_only is
  'Derived from entry: a Members or Private event is never public.';
create index events_public_idx on events.events (status, members_only, starts_at);

create policy "Anyone reads published public events" on events.events
  for select to anon
  using (status in ('published', 'cancelled') and not members_only);
create policy "Signed-in users read the events they may see" on events.events
  for select to authenticated
  using (
    (select private.can_see_event(status, members_only, programme_id))
    or (select private.has_permission('events.manage', 'event', id))
  );

-- ── Events and minutes come from Notion ──────────────────────────────────────

-- The sync writes them with the service role; nobody makes or deletes one
-- in the Diwan. Leads still edit the site's own parts of their event.
drop policy "Event managers create events in their programme" on events.events;
drop policy "Event managers delete draft events" on events.events;
drop policy "Minute-takers read and write minutes (insert)" on governance.minutes;
drop policy "Minute-takers read and write minutes (delete)" on governance.minutes;

-- ── Voting rights from check-ins only ────────────────────────────────────────

delete from membership.activity_records where kind <> 'check_in';
alter table membership.activity_records
  drop constraint if exists activity_records_kind_check,
  drop constraint if exists activity_records_check;
alter table membership.activity_records add constraint activity_records_kind_check
  check (kind = 'check_in');
comment on table membership.activity_records is
  'Check-ins at events, the only record of taking part (decisions §10): two in an academic year make a Member a voting member.';

drop function membership.add_manual_activity(uuid, text, timestamptz);
drop function private.add_manual_activity(uuid, text, timestamptz);
