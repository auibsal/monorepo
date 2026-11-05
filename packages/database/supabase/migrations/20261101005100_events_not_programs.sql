-- No programs: events (owner, Nov 5, 2026; claude/decisions.md §1).
--
-- The Society holds no standing programs. Qirtas and the Company stay;
-- everything else is an event. Each term the Council sets a calendar of
-- plain events, at least one a month. The recurring ones (Second Chapter,
-- the Salon, Book Circle, Open Pages, the Listening Room) keep their names
-- and their series pages on What's on, /events/<slug>, with their events,
-- openings, rotas, shifts and service records as before; none is a
-- program. The code keeps its identifiers (the `programmes` schema,
-- `core.programmes`, `programme_id`, the `programme` scope): a series row
-- is what was a program row.
--
-- The repeat rules go (events.series_rules, add_series_sessions): the term
-- calendar is plain events, added one by one.
--
-- The Program Lead is now an event lead, scoped to one series (scope
-- `programme`) or to one event (the new scope `event`). The President
-- picks them; an event lead runs their event or series and its door.

-- 1. The repeat rules.
drop function events.add_series_sessions(uuid, date);
drop function private.add_series_sessions(uuid, date);
drop table events.series_rules;

-- 2. Event leads scoped to one event.
alter table access.role_assignments drop constraint role_assignments_scope_type_check;
alter table access.role_assignments add constraint role_assignments_scope_type_check
  check (scope_type in ('global', 'programme', 'event', 'issue', 'campaign', 'production', 'partner'));

-- Whether the user holds `permission` for this event: on its series, or on
-- the event itself (an event lead for one event), or everywhere.
create function private.leads_event(permission text, event_id uuid, programme_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_permission(leads_event.permission, 'programme', leads_event.programme_id)
    or private.has_permission(leads_event.permission, 'event', leads_event.event_id);
$$;

revoke all on function private.leads_event(text, uuid, uuid) from public, anon;
grant execute on function private.leads_event(text, uuid, uuid) to authenticated;

create or replace function private.manages_event(event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from events.events e
    where e.id = manages_event.event_id
      and private.leads_event('events.manage', e.id, e.programme_id)
  );
$$;

create or replace function private.can_check_in(event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1 from events.events e
      where e.id = can_check_in.event_id
        and private.leads_event('events.checkin', e.id, e.programme_id)
    )
    or exists (
      select 1 from events.event_staff s
      where s.event_id = can_check_in.event_id and s.user_id = auth.uid()
    );
$$;

create or replace function private.invited(event_id uuid, programme_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
      select 1 from events.invitations i
      where i.event_id = invited.event_id and i.user_id = (select auth.uid())
    )
    or private.leads_event('events.manage', invited.event_id, invited.programme_id);
$$;

drop policy "Event managers edit events in their programme" on events.events;
create policy "Event managers edit events in their programme" on events.events
  for update to authenticated
  using ((select private.leads_event('events.manage', id, programme_id)))
  with check ((select private.leads_event('events.manage', id, programme_id)));

drop policy "Event managers delete draft events" on events.events;
create policy "Event managers delete draft events" on events.events
  for delete to authenticated
  using (status = 'draft' and (select private.leads_event('events.manage', id, programme_id)));

drop policy "Signed-in users read the events they may see" on events.events;
create policy "Signed-in users read the events they may see" on events.events
  for select to authenticated
  using (
    (select private.can_see_event(status, members_only, programme_id))
    or (select private.has_permission('events.manage', 'event', id))
  );

drop policy "Select by authenticated" on events.event_staff;
create policy "Select by authenticated" on events.event_staff
  for select to authenticated
  using (
    exists (
      select 1 from events.events e
      where e.id = event_staff.event_id
        and (select private.leads_event('events.manage', e.id, e.programme_id))
    )
    or user_id = (select auth.uid())
  );
drop policy "Event managers manage event staff (insert)" on events.event_staff;
create policy "Event managers manage event staff (insert)" on events.event_staff
  for insert to authenticated
  with check (exists (
    select 1 from events.events e
    where e.id = event_staff.event_id
      and (select private.leads_event('events.manage', e.id, e.programme_id))
  ));
drop policy "Event managers manage event staff (update)" on events.event_staff;
create policy "Event managers manage event staff (update)" on events.event_staff
  for update to authenticated
  using (exists (
    select 1 from events.events e
    where e.id = event_staff.event_id
      and (select private.leads_event('events.manage', e.id, e.programme_id))
  ))
  with check (exists (
    select 1 from events.events e
    where e.id = event_staff.event_id
      and (select private.leads_event('events.manage', e.id, e.programme_id))
  ));
drop policy "Event managers manage event staff (delete)" on events.event_staff;
create policy "Event managers manage event staff (delete)" on events.event_staff
  for delete to authenticated
  using (exists (
    select 1 from events.events e
    where e.id = event_staff.event_id
      and (select private.leads_event('events.manage', e.id, e.programme_id))
  ));

drop policy "Select by authenticated" on events.rsvps;
create policy "Select by authenticated" on events.rsvps
  for select to authenticated
  using (
    (select private.can_check_in(rsvps.event_id))
    or exists (
      select 1 from events.events e
      where e.id = rsvps.event_id
        and (select private.leads_event('events.manage', e.id, e.programme_id))
    )
    or user_id = (select auth.uid())
  );

drop policy "Select by authenticated" on events.waitlist;
create policy "Select by authenticated" on events.waitlist
  for select to authenticated
  using (
    exists (
      select 1 from events.events e
      where e.id = waitlist.event_id
        and (select private.leads_event('events.manage', e.id, e.programme_id))
    )
    or user_id = (select auth.uid())
  );

drop policy "Event managers add links" on events.session_links;
create policy "Event managers add links" on events.session_links
  for insert to authenticated
  with check (exists (
    select 1 from events.events e
    where e.id = session_links.event_id
      and (select private.leads_event('events.manage', e.id, e.programme_id))
  ));
drop policy "Event managers remove links" on events.session_links;
create policy "Event managers remove links" on events.session_links
  for delete to authenticated
  using (exists (
    select 1 from events.events e
    where e.id = session_links.event_id
      and (select private.leads_event('events.manage', e.id, e.programme_id))
  ));

-- 3. The series, in the current words: how each usually runs. The
-- Typewriter Tour belongs to membership (its row stays for its events and
-- Six Words; the site no longer lists it among the series).
update core.programmes set
  rhythm_en = 'Every November: a book drive, then a book fair, for a charity.',
  rhythm_ar = 'كل تشرين الثاني: جمع الكتب، ثم معرض للكتب، لصالح جهة خيرية.'
where slug = 'second-chapter';
update core.programmes set
  rhythm_en = 'Tuesdays, as the term calendar sets.',
  rhythm_ar = 'أيام الثلاثاء، كما يحددها تقويم الفصل.'
where slug in ('salon', 'book-circle', 'open-pages', 'listening-room');
update core.programmes set
  rhythm_en = 'Once a year in spring, after Eid; in fall, the typewriter at the club fair.',
  rhythm_ar = 'مرة في السنة في الربيع، بعد العيد؛ وفي الخريف، الآلة الكاتبة في معرض الأندية.'
where slug = 'typewriter-tour';

comment on table core.programmes is
  'Event series and the Society''s own rows (owner, Nov 5, 2026: no programs). Qirtas (waraq), Next Stop and the Company keep rows; the recurring events (Second Chapter, the Salon, Book Circle, Open Pages, the Listening Room) are series on What''s on; the Typewriter Tour''s row belongs to membership.';
