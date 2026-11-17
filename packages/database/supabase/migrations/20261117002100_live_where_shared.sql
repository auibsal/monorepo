-- Live where people share a screen (the owner, Nov 17, 2026; decisions.md,
-- The site: "Realtime only where people share a screen"): the door's
-- check-in across devices, the newsroom board and each reader's queue,
-- the counts on Today and the Desk, and who is editing a record's section.
-- Every channel is private: Realtime asks these policies on
-- realtime.messages before anyone receives or sends, so RLS decides.
-- Triggers send ids and counts only (realtime.send, never whole rows, as
-- realtime.broadcast_changes would). Public pages never subscribe; the
-- rest of the site refreshes on focus and after each save.
--
-- Topics:
--   sal:checkin:<event>      whoever checks people in at that event
--   sal:newsroom:<zero id>   Qirtas's editors (journal.publish anywhere)
--   sal:reading:<user>       that reader
--   sal:me:<user>            that person (Today's counts)
--   sal:desk:<zero id>       staff (the Desk's counts)
--   sal:<record>:<id>        who may edit the record (minutes, piece,
--                            event, announcement): presence while editing

create or replace function private.can_edit_room(topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[] := regexp_match(
    topic,
    '^sal:([a-z]+):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$'
  );
  kind text := parts[1];
  record_id uuid := parts[2]::uuid;
  issue uuid;
  program uuid;
begin
  if parts is null or (select private.oauth_client_id()) is not null then
    return false;
  end if;
  case kind
    when 'minutes' then
      return exists (select 1 from governance.minutes m where m.id = record_id)
        and access.has_permission('governance.minutes.write');
    when 'piece' then
      select p.issue_id into issue from journal.pieces p where p.id = record_id;
      return issue is not null
        and access.has_permission('journal.publish', 'issue', issue);
    when 'event' then
      select e.program_id into program from events.events e where e.id = record_id;
      return found and private.leads_event('events.manage', record_id, program);
    when 'announcement' then
      return exists (select 1 from core.announcements a where a.id = record_id)
        and private.has_permission_anywhere('content.manage');
    when 'checkin' then
      return private.can_check_in(record_id);
    when 'newsroom' then
      return private.has_permission_anywhere('journal.publish');
    when 'reading' then
      return record_id = (select auth.uid());
    when 'me' then
      return record_id = (select auth.uid());
    when 'desk' then
      return private.i_am_staff();
    else
      return false;
  end case;
end;
$$;

-- Only presence and broadcasts between people editing a record are sent
-- by clients; the other topics are fed by the database alone.
drop policy "Editors send to their record's room" on realtime.messages;
create policy "Editors send to their record's room"
  on realtime.messages for insert to authenticated
  with check (
    realtime.messages.extension in ('broadcast', 'presence')
    and split_part(realtime.topic(), ':', 2) in ('minutes', 'piece', 'event', 'announcement')
    and (select private.can_edit_room(realtime.topic()))
  );

create function private.live(topic text, event text, payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(payload, event, topic, true);
exception when others then
  -- A live update never stops the write it follows.
  null;
end;
$$;
revoke all on function private.live(text, text, jsonb) from public, anon, authenticated;

-- The door: each check-in, with the count, to everyone checking in there,
-- and to the person checked in.
create function private.live_check_in()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row events.check_ins := coalesce(new, old);
  total integer;
begin
  select count(*) into total from events.check_ins c where c.event_id = row.event_id;
  perform private.live('sal:checkin:' || row.event_id, 'check_in',
    jsonb_build_object('id', row.id, 'user_id', row.user_id, 'count', total, 'op', tg_op));
  perform private.live('sal:me:' || row.user_id, 'counts', jsonb_build_object('kind', 'check_in'));
  return null;
end;
$$;
create trigger live_check_in after insert or delete on events.check_ins
  for each row execute function private.live_check_in();

-- The newsroom board: a piece made or moved.
create function private.live_piece()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.live('sal:newsroom:00000000-0000-0000-0000-000000000000',
    'piece', jsonb_build_object('id', new.id, 'op', tg_op));
  return null;
end;
$$;
create trigger live_piece after insert or update of status on journal.pieces
  for each row execute function private.live_piece();

-- A reader's queue and their Today count.
create function private.live_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row journal.assignments := coalesce(new, old);
begin
  perform private.live('sal:reading:' || row.reader_id, 'assignment',
    jsonb_build_object('id', row.id, 'op', tg_op));
  perform private.live('sal:me:' || row.reader_id, 'counts', jsonb_build_object('kind', 'reading'));
  return null;
end;
$$;
create trigger live_assignment after insert or delete on journal.assignments
  for each row execute function private.live_assignment();

-- A request sent or answered: the Desk's counts, and the sender's Today.
create function private.live_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.live('sal:desk:00000000-0000-0000-0000-000000000000', 'counts',
    jsonb_build_object('kind', 'request', 'id', new.id));
  if new.submitted_by is not null then
    perform private.live('sal:me:' || new.submitted_by, 'counts', jsonb_build_object('kind', 'request'));
  end if;
  return null;
end;
$$;
create trigger live_request after insert or update of status on governance.form_submissions
  for each row execute function private.live_request();

revoke all on function private.live_check_in(), private.live_piece(), private.live_assignment(),
  private.live_request() from public, anon, authenticated;
