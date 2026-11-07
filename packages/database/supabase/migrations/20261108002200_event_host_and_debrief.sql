-- Events (decisions §13): the event's host ("the Society, or the partner
-- the event is held for", Notion's Host), shown on the event page as "Held
-- with <partner>", and the link to its debrief (F-13, kept in Notion).

create table events.debriefs (
  event_id uuid primary key references events.events (id) on delete cascade,
  url text not null check (url ~ '^https://'),
  updated_at timestamptz not null default now()
);
comment on table events.debriefs is
  'Each event''s debrief (F-13), a Notion page, linked for the event''s staff only (decisions §13).';
alter table events.debriefs enable row level security;
create policy "No third-party apps" on events.debriefs
  as restrictive for all to authenticated
  using ((select private.client_allows('events')))
  with check ((select private.client_allows('events')));
create policy "The event's staff read its debrief link" on events.debriefs
  for select to authenticated
  using ((select private.has_permission('events.manage')) or (select private.leads_event_id(event_id)));
revoke all on events.debriefs from anon, authenticated;
grant select on events.debriefs to authenticated;
grant all on events.debriefs to service_role;

-- The partner a published event is held with, for its public page.
create function private.event_host(event_slug text)
returns table (name_en text, name_ar text, slug text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.name_en, p.name_ar, p.slug
  from events.events e
  join governance.partners p on p.id = e.partner_id
  where e.slug = event_slug
    and e.status in ('published', 'cancelled')
    and p.status = 'active';
$$;
revoke all on function private.event_host(text) from public;
grant execute on function private.event_host(text) to anon, authenticated;

create function events.event_host(event_slug text)
returns table (name_en text, name_ar text, slug text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.event_host(event_slug) $$;
revoke all on function events.event_host(text) from public;
grant execute on function events.event_host(text) to anon, authenticated;
