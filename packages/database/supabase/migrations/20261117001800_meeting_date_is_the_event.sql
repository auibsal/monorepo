-- A meeting's date in one place (the owner, Nov 17, 2026; decisions.md,
-- Where things live): the event's. Every meeting is an event, so minutes
-- now need theirs; meeting_on stays as the event's day in Baghdad, kept by
-- private.minutes_follow_meeting, and moves when the event does. The
-- Notion Meetings copy shows the day and never sets it.

-- A meeting with no event is given one, a draft on the day it was held
-- (6:00 p.m. in Baghdad), named as the minutes are; the Director of Events
-- completes it in the Diwan. Its date then rules.
create or replace function private.minutes_follow_meeting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.event_id is null then
    if new.meeting_on is null then
      raise exception 'A meeting needs its event' using errcode = '23502';
    end if;
    insert into events.events (slug, title_en, title_ar, starts_at, classes)
    values (
      'meeting-' || to_char(new.meeting_on, 'YYYY-MM-DD') || '-' || left(new.id::text, 8),
      new.title_en,
      coalesce(new.title_ar, new.title_en),
      (new.meeting_on + time '18:00') at time zone 'Asia/Baghdad',
      case when new.body = 'council' then array['member'] else array['member', 'associate', 'honorary'] end
    )
    returning id into new.event_id;
  end if;
  select (e.starts_at at time zone 'Asia/Baghdad')::date
  into new.meeting_on
  from events.events e
  where e.id = new.event_id;
  return new;
end;
$$;

-- Every meeting already kept has its event.
update governance.minutes set event_id = null where event_id is null;

alter table governance.minutes alter column event_id set not null;
alter table governance.minutes drop constraint minutes_event_id_fkey;
alter table governance.minutes add constraint minutes_event_id_fkey
  foreign key (event_id) references events.events (id) on delete restrict;

-- When the event moves, its minutes move with it.
create function private.meeting_follows_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update governance.minutes m
  set meeting_on = (new.starts_at at time zone 'Asia/Baghdad')::date
  where m.event_id = new.id
    and m.meeting_on is distinct from (new.starts_at at time zone 'Asia/Baghdad')::date;
  return null;
end;
$$;
revoke all on function private.meeting_follows_event() from public, anon, authenticated;

create trigger meeting_follows_event
  after update of starts_at on events.events
  for each row execute function private.meeting_follows_event();

-- The date is the event's: private.minutes_follow_meeting sets it on
-- every write, whatever was sent.
select private.build_api();
