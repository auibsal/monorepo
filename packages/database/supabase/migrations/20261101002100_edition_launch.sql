-- An Edition's Launch Night (owner, Nov 4, 2026, design review C11).
--
-- Each Edition may name the event that launches it, picked in the Diwan.
-- Before an Edition is published its row is the masthead's alone, so the
-- Editions page reads only the launch event's id, through
-- journal.edition_launch(), and only for an Edition that is published or
-- has a published call; the event itself is read as any event is, under
-- its own policies. `list` is kept free as an Edition's slug: the plain
-- list of Editions lives at /qirtas/editions/list.

alter table journal.issues
  add column launch_event_id uuid references events.events (id) on delete set null,
  add constraint issues_slug_not_list check (slug <> 'list');

create index issues_launch_event_id_idx on journal.issues (launch_event_id);

comment on column journal.issues.launch_event_id is
  'The event that launches the Edition (Launch Night); shown on the Editions page.';

create function private.edition_launch(issue_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select i.launch_event_id
  from journal.issues i
  where i.id = edition_launch.issue_id
    and (
      i.status = 'published'
      or exists (
        select 1 from journal.calls c
        where c.issue_id = i.id and c.is_published
      )
    );
$$;

revoke all on function private.edition_launch(uuid) from public;
grant execute on function private.edition_launch(uuid) to anon, authenticated, service_role;

create function journal.edition_launch(issue_id uuid)
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$ select private.edition_launch($1) $$;

revoke all on function journal.edition_launch(uuid) from public;
grant execute on function journal.edition_launch(uuid) to anon, authenticated, service_role;
