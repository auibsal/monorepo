-- The design review, PR 6 (A41): an event run with a partner, and its
-- checklist on the partner's dashboard.
--
-- An event may name the partner it is run with (events.events.partner_id,
-- from the one register, set by the event's managers). Its checklist
-- (events.joint_tasks) is shared: each item belongs to the Society's side
-- or the partner's. The event's managers keep the whole list; the
-- partner's team (partners.own for that partner) adds and ticks its own
-- side's items, and sees its joint events, even while they are planned,
-- through events.my_joint_events() (Events, on the partner's dashboard).

alter table events.events
  add column partner_id uuid references governance.partners (id) on delete set null;

create index events_partner_id_idx on events.events (partner_id) where partner_id is not null;

grant insert (partner_id), update (partner_id) on events.events to authenticated;

comment on column events.events.partner_id is
  'The partner this event is run with; its team sees the event and its checklist on their dashboard.';

create table events.joint_tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events.events (id) on delete cascade,
  side text not null check (side in ('society', 'partner')),
  label text not null check (char_length(btrim(label)) between 1 and 200),
  due_on date,
  done_at timestamptz,
  done_by uuid references auth.users (id) on delete set null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table events.joint_tasks is
  'A joint event''s checklist: each item the Society''s or the partner''s, ticked by its side.';

create index joint_tasks_event_idx on events.joint_tasks (event_id, created_at);
create index joint_tasks_done_by_idx on events.joint_tasks (done_by);
create index joint_tasks_created_by_idx on events.joint_tasks (created_by);

-- Who may act for the event: its managers (private.manages_event, from
-- What's on), or the team of its partner.
create function private.partners_on_event(event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from events.events e
    where e.id = partners_on_event.event_id
      and e.partner_id is not null
      and private.has_permission('partners.own', 'partner', e.partner_id)
  );
$$;

revoke all on function private.partners_on_event(uuid) from public;
grant execute on function private.partners_on_event(uuid) to authenticated, service_role;

-- Ticking records who and when; only the item's side (or the event's
-- managers) ticks it.
create function private.tick_joint_task()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.done_at is distinct from old.done_at then
    new.done_by := case when new.done_at is null then null else auth.uid() end;
    if new.done_at is not null then
      new.done_at := now();
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.tick_joint_task() from public, anon, authenticated;

create trigger tick_joint_task
  before update on events.joint_tasks
  for each row execute function private.tick_joint_task();

alter table events.joint_tasks enable row level security;

revoke all on events.joint_tasks from anon, authenticated;
grant select on events.joint_tasks to authenticated;
grant insert (event_id, side, label, due_on) on events.joint_tasks to authenticated;
grant update (label, due_on, done_at) on events.joint_tasks to authenticated;
grant delete on events.joint_tasks to authenticated;
grant all on events.joint_tasks to service_role;

create policy "No third-party apps" on events.joint_tasks
  as restrictive for all to authenticated
  using ((select private.client_allows('events')))
  with check ((select private.client_allows('events')));

create policy "Both sides read the checklist" on events.joint_tasks
  for select to authenticated
  using (
    (select private.manages_event(event_id)) or (select private.partners_on_event(event_id))
  );
create policy "Each side adds its items" on events.joint_tasks
  for insert to authenticated
  with check (
    (select private.manages_event(event_id))
    or (side = 'partner' and (select private.partners_on_event(event_id)))
  );
create policy "Each side ticks its items" on events.joint_tasks
  for update to authenticated
  using (
    (select private.manages_event(event_id))
    or (side = 'partner' and (select private.partners_on_event(event_id)))
  )
  with check (
    (select private.manages_event(event_id))
    or (side = 'partner' and (select private.partners_on_event(event_id)))
  );
create policy "Each side removes its items" on events.joint_tasks
  for delete to authenticated
  using (
    (select private.manages_event(event_id))
    or (side = 'partner' and (select private.partners_on_event(event_id)))
  );

-- The partner's joint events, for its team (drafts included: they plan
-- them together), soonest first, then the past.
create function private.my_joint_events()
returns table (
  id uuid, slug text, title_en text, title_ar text, starts_at timestamptz,
  ends_at timestamptz, venue_en text, venue_ar text, status text, partner_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.slug, e.title_en, e.title_ar, e.starts_at, e.ends_at,
    e.venue_en, e.venue_ar, e.status, e.partner_id
  from events.events e
  where e.partner_id is not null
    and e.status <> 'cancelled'
    and private.has_permission('partners.own', 'partner', e.partner_id)
  order by (e.starts_at < now()), case when e.starts_at >= now() then e.starts_at end,
    e.starts_at desc;
$$;

revoke all on function private.my_joint_events() from public;
grant execute on function private.my_joint_events() to authenticated, service_role;

create function events.my_joint_events()
returns table (
  id uuid, slug text, title_en text, title_ar text, starts_at timestamptz,
  ends_at timestamptz, venue_en text, venue_ar text, status text, partner_id uuid
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.my_joint_events();
$$;

revoke all on function events.my_joint_events() from public;
grant execute on function events.my_joint_events() to authenticated;

create trigger log_activity
  after insert or update or delete on events.joint_tasks
  for each row execute function private.log_activity();
