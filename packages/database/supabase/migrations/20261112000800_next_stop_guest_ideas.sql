-- Next Stop's guest ideas (decisions.md, Next Stop): a private list of
-- people the show might invite, kept on the site so no names are kept in
-- Notion. Seen only by the Director of Media, the producer and the host.

insert into access.permissions (key, description) values
  ('media.guest_ideas', 'Keep Next Stop''s private list of guest ideas (the Director of Media, the producer and the host).')
on conflict (key) do nothing;

insert into access.role_permissions (role, permission) values
  ('media_director', 'media.guest_ideas'),
  ('next_stop_producer', 'media.guest_ideas'),
  ('next_stop_host', 'media.guest_ideas')
on conflict do nothing;

create table programmes.next_stop_guest_ideas (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  why text check (char_length(why) <= 1000),
  status text not null default 'idea'
    check (status in ('idea', 'asked', 'agreed', 'declined', 'appeared')),
  episode_id uuid references programmes.episodes (id) on delete set null,
  added_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index next_stop_guest_ideas_episode_idx on programmes.next_stop_guest_ideas (episode_id);
create index next_stop_guest_ideas_added_by_idx on programmes.next_stop_guest_ideas (added_by);

create trigger set_updated_at before update on programmes.next_stop_guest_ideas
  for each row execute function private.set_updated_at();

alter table programmes.next_stop_guest_ideas enable row level security;

create policy "No third-party apps" on programmes.next_stop_guest_ideas
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('programmes')))
  with check ((select private.client_allows('programmes')));

create policy "Next Stop keeps its guest ideas" on programmes.next_stop_guest_ideas
  for all to authenticated
  using ((select private.has_permission('media.guest_ideas')))
  with check ((select private.has_permission('media.guest_ideas')));

grant select, insert, update (name, why, status, episode_id), delete
  on programmes.next_stop_guest_ideas to authenticated;

comment on table programmes.next_stop_guest_ideas is
  'People Next Stop might invite (decisions.md, Next Stop): private to the Director of Media, the producer and the host; never in Notion.';
