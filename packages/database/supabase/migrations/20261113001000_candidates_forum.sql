-- Elections (decisions.md, Governance): each election has a candidates'
-- forum in the week before voting, recorded for those who can't come. The
-- forum is an ordinary event (made in Notion like every event); the
-- election names it, and its recording is the event's link from the night.

alter table governance.elections
  add column forum_event_id uuid references events.events (id) on delete set null;

create index elections_forum_event_id_idx on governance.elections (forum_event_id);

comment on column governance.elections.forum_event_id is
  'The candidates'' forum: an event in the seven days before voting opens; its recording is the event''s session link.';

-- The forum falls in the week before voting.
create function private.check_forum_week()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  forum_at timestamptz;
begin
  if new.forum_event_id is null then
    return new;
  end if;
  select starts_at into forum_at from events.events where id = new.forum_event_id;
  if forum_at is null
    or forum_at < new.voting_opens_at - interval '7 days'
    or forum_at >= new.voting_opens_at then
    raise exception 'forum_not_in_the_week_before_voting' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.check_forum_week() from public, anon, authenticated;

create trigger check_forum_week before insert or update of forum_event_id, voting_opens_at
  on governance.elections
  for each row execute function private.check_forum_week();
