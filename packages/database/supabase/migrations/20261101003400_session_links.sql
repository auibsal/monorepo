-- The design review, PR 5b (Nov 4, 2026), A37: a session's outside links
-- (the album the Listening Room played, a recording, a reading list), shown
-- with the session in the program's past sessions. Written by whoever
-- manages the program's events, on the event's page in the Diwan; read by
-- anyone who can see the event.

create table events.session_links (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events.events (id) on delete cascade,
  label_en text not null default '' check (char_length(label_en) <= 200),
  label_ar text not null default '' check (char_length(label_ar) <= 200),
  url text not null check (url ~ '^https://' and char_length(url) <= 500),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint session_links_labelled check (label_en <> '' or label_ar <> '')
);

comment on table events.session_links is
  'Outside links for a session (what was played or read), shown with it among the program''s past sessions.';

create index session_links_event_idx on events.session_links (event_id, created_at);
create index session_links_created_by_idx on events.session_links (created_by);

alter table events.session_links enable row level security;

revoke all on events.session_links from anon, authenticated;
grant select on events.session_links to anon, authenticated;
grant insert (event_id, label_en, label_ar, url) on events.session_links to authenticated;
grant delete on events.session_links to authenticated;
grant all on events.session_links to service_role;

create policy "No third-party apps" on events.session_links
  as restrictive for all to authenticated
  using ((select private.client_allows('events')))
  with check ((select private.client_allows('events')));

create policy "Anyone who sees the session reads its links" on events.session_links
  for select to anon, authenticated
  using ((select private.can_see_event_id(event_id)));
create policy "Event managers add links" on events.session_links
  for insert to authenticated
  with check (exists (
    select 1 from events.events e
    where e.id = event_id
      and (select private.has_permission('events.manage', 'programme', e.programme_id))
  ));
create policy "Event managers remove links" on events.session_links
  for delete to authenticated
  using (exists (
    select 1 from events.events e
    where e.id = event_id
      and (select private.has_permission('events.manage', 'programme', e.programme_id))
  ));

create trigger log_activity
  after insert or update or delete on events.session_links
  for each row execute function private.log_activity();
