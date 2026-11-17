-- B8: Archive, Recently deleted in every area, every edit in History, and
-- earlier versions (decisions.md, The site: "Recently deleted", "History",
-- "Archive"). The Archive needs no column: a record is archived by its own
-- finished state (a canceled event, a closed production with its report,
-- an ended partner), so nothing is kept twice.

-- ── Recently deleted, every area ──────────────────────────────────────
alter table journal.pieces
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users (id) on delete set null;
create index pieces_deleted_by_idx on journal.pieces (deleted_by);
create index pieces_deleted_at_idx on journal.pieces (deleted_at) where deleted_at is not null;
create policy "Not in Recently deleted" on journal.pieces
  as restrictive for select to anon, authenticated
  using (deleted_at is null);

alter table journal.issues
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users (id) on delete set null;
create index issues_deleted_by_idx on journal.issues (deleted_by);
create index issues_deleted_at_idx on journal.issues (deleted_at) where deleted_at is not null;
create policy "Not in Recently deleted" on journal.issues
  as restrictive for select to anon, authenticated
  using (deleted_at is null);

alter table programs.productions
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users (id) on delete set null;
create index productions_deleted_by_idx on programs.productions (deleted_by);
create index productions_deleted_at_idx on programs.productions (deleted_at) where deleted_at is not null;
create policy "Not in Recently deleted" on programs.productions
  as restrictive for select to anon, authenticated
  using (deleted_at is null);

alter table programs.episodes
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users (id) on delete set null;
create index episodes_deleted_by_idx on programs.episodes (deleted_by);
create index episodes_deleted_at_idx on programs.episodes (deleted_at) where deleted_at is not null;
create policy "Not in Recently deleted" on programs.episodes
  as restrictive for select to anon, authenticated
  using (deleted_at is null);

alter table programs.openings
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users (id) on delete set null;
create index openings_deleted_by_idx on programs.openings (deleted_by);
create index openings_deleted_at_idx on programs.openings (deleted_at) where deleted_at is not null;
create policy "Not in Recently deleted" on programs.openings
  as restrictive for select to anon, authenticated
  using (deleted_at is null);

alter table core.announcements
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users (id) on delete set null;
create index announcements_deleted_by_idx on core.announcements (deleted_by);
create index announcements_deleted_at_idx on core.announcements (deleted_at) where deleted_at is not null;
create policy "Not in Recently deleted" on core.announcements
  as restrictive for select to anon, authenticated
  using (deleted_at is null);

create or replace function private.trash_kinds()
returns table (kind text, tbl text, title_en text, title_ar text)
language sql
immutable
set search_path = ''
as $$
  values
    ('event', 'events.events', 'title_en', 'title_ar'),
    ('partner', 'governance.partners', 'name_en', 'name_ar'),
    ('media', 'content.media_items', 'file_name', 'file_name'),
    ('piece', 'journal.pieces', 'title_en', 'title_ar'),
    ('edition', 'journal.issues', 'title_en', 'title_ar'),
    ('production', 'programs.productions', 'title_en', 'title_ar'),
    ('episode', 'programs.episodes', 'title_en', 'title_ar'),
    ('opening', 'programs.openings', 'title_en', 'title_ar'),
    ('announcement', 'core.announcements', 'title_en', 'title_ar');
$$;

create or replace function private.may_delete(kind text, record_id uuid)
returns boolean
language plpgsql
stable security definer
set search_path = ''
as $$
begin
  if kind = 'event' then
    return exists (
      select 1 from events.events e
      where e.id = record_id
        and private.leads_event('events.manage', e.id, e.program_id)
    );
  elsif kind = 'partner' then
    return private.has_permission('partners.manage');
  elsif kind = 'media' then
    return exists (
      select 1 from content.media_items m
      where m.id = record_id
        and (m.uploaded_by = auth.uid() or private.has_permission_anywhere('content.manage'))
    );
  elsif kind = 'piece' then
    return private.piece_editor(record_id);
  elsif kind = 'edition' then
    return private.has_permission('journal.approve', 'issue', record_id)
      or private.has_permission('journal.publish', 'issue', record_id);
  elsif kind = 'production' then
    return private.has_permission('productions.manage');
  elsif kind = 'episode' then
    return private.has_permission('content.manage');
  elsif kind = 'opening' then
    return exists (
      select 1 from programs.openings o
      where o.id = record_id and private.handles_opening(o.owner, o.program_id)
    );
  elsif kind = 'announcement' then
    return private.may_write_notices();
  end if;
  return false;
end;
$$;

create or replace function private.record_uses(kind text, record_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not private.may_delete(kind, record_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if kind = 'event' then
    select jsonb_build_object(
      'title_en', e.title_en, 'title_ar', e.title_ar,
      'blocked', case when e.status <> 'draft' then 'unpublish_first' end,
      'uses', '[]'::jsonb)
    into result
    from events.events e where e.id = record_id and e.deleted_at is null;
  elsif kind = 'partner' then
    select jsonb_build_object(
      'title_en', p.name_en, 'title_ar', p.name_ar,
      'blocked', case
        when p.is_listed then 'unlist_first'
        when exists (select 1 from events.event_organizations o
                     join events.events e on e.id = o.event_id
                     where o.partner_id = p.id and e.deleted_at is null)
          or exists (select 1 from governance.partner_agreements a
                     where a.partner_id = p.id)
          then 'in_use'
      end,
      'uses', coalesce((
        select jsonb_agg(u order by u->>'title_en')
        from (
          select jsonb_build_object('kind', 'event',
            'title_en', e.title_en, 'title_ar', e.title_ar) u
          from events.event_organizations o
          join events.events e on e.id = o.event_id
          where o.partner_id = p.id and e.deleted_at is null
          union all
          select jsonb_build_object('kind', 'memorandum',
            'title_en', coalesce(a.code, 'Memorandum'),
            'title_ar', coalesce(a.code, 'مذكرة تفاهم'))
          from governance.partner_agreements a
          where a.partner_id = p.id
        ) s
      ), '[]'::jsonb))
    into result
    from governance.partners p where p.id = record_id and p.deleted_at is null;
  elsif kind = 'media' then
    select jsonb_build_object(
      'title_en', m.file_name, 'title_ar', m.file_name,
      'blocked', case when exists (select 1 from private.media_uses(m.id)) then 'in_use' end,
      'uses', coalesce((
        select jsonb_agg(jsonb_build_object('kind', u.kind,
          'title_en', u.title_en, 'title_ar', u.title_ar) order by u.title_en)
        from private.media_uses(m.id) u
      ), '[]'::jsonb))
    into result
    from content.media_items m where m.id = record_id and m.deleted_at is null;
  elsif kind = 'piece' then
    select jsonb_build_object('title_en', p.title_en, 'title_ar', p.title_ar,
      'blocked', case
        when p.status = 'published' then 'unpublish_first'
        when exists (select 1 from journal.prize_entries e where e.piece_id = p.id) then 'in_use'
      end,
      'uses', '[]'::jsonb)
    into result
    from journal.pieces p where p.id = record_id and p.deleted_at is null;
  elsif kind = 'edition' then
    select jsonb_build_object('title_en', i.title_en, 'title_ar', i.title_ar,
      'blocked', case
        when i.status <> 'draft' then 'unpublish_first'
        when exists (select 1 from journal.pieces p where p.issue_id = i.id and p.deleted_at is null)
          or exists (select 1 from journal.blind_entries b where b.issue_id = i.id)
          then 'in_use'
      end,
      'uses', coalesce((
        select jsonb_agg(jsonb_build_object('kind', 'piece',
          'title_en', p.title_en, 'title_ar', p.title_ar) order by p.title_en)
        from journal.pieces p where p.issue_id = i.id and p.deleted_at is null
      ), '[]'::jsonb))
    into result
    from journal.issues i where i.id = record_id and i.deleted_at is null;
  elsif kind = 'production' then
    select jsonb_build_object('title_en', p.title_en, 'title_ar', p.title_ar,
      'blocked', case when p.stage not in ('proposal', 'canceled') then 'cancel_first' end,
      'uses', '[]'::jsonb)
    into result
    from programs.productions p where p.id = record_id and p.deleted_at is null;
  elsif kind = 'episode' then
    select jsonb_build_object('title_en', e.title_en, 'title_ar', e.title_ar,
      'blocked', case when e.published_at is not null then 'unpublish_first' end,
      'uses', '[]'::jsonb)
    into result
    from programs.episodes e where e.id = record_id and e.deleted_at is null;
  elsif kind = 'opening' then
    select jsonb_build_object('title_en', o.title_en, 'title_ar', o.title_ar,
      'blocked', case
        when o.is_open then 'close_first'
        when exists (select 1 from programs.opening_replies r where r.opening_id = o.id) then 'in_use'
      end,
      'uses', '[]'::jsonb)
    into result
    from programs.openings o where o.id = record_id and o.deleted_at is null;
  elsif kind = 'announcement' then
    select jsonb_build_object('title_en', a.title_en, 'title_ar', a.title_ar,
      'blocked', case when a.sent_at is not null then 'sent' end,
      'uses', '[]'::jsonb)
    into result
    from core.announcements a where a.id = record_id and a.deleted_at is null;
  end if;
  if result is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  return result;
end;
$$;

-- Each area's Recently deleted, as one plain query over every area (so
-- the linter can check it), newest first; only what the caller may
-- restore.
create or replace function private.recently_deleted(kind text)
returns table (id uuid, title_en text, title_ar text, deleted_at timestamptz, purges_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.title_en, d.title_ar, d.deleted_at, d.deleted_at + interval '30 days'
  from (
  select 'event', r.id, r.title_en, r.title_ar, r.deleted_at from events.events r where r.deleted_at is not null
  union all
  select 'partner', r.id, r.name_en, r.name_ar, r.deleted_at from governance.partners r where r.deleted_at is not null
  union all
  select 'media', r.id, r.file_name, r.file_name, r.deleted_at from content.media_items r where r.deleted_at is not null
  union all
  select 'piece', r.id, r.title_en, r.title_ar, r.deleted_at from journal.pieces r where r.deleted_at is not null
  union all
  select 'edition', r.id, r.title_en, r.title_ar, r.deleted_at from journal.issues r where r.deleted_at is not null
  union all
  select 'production', r.id, r.title_en, r.title_ar, r.deleted_at from programs.productions r where r.deleted_at is not null
  union all
  select 'episode', r.id, r.title_en, r.title_ar, r.deleted_at from programs.episodes r where r.deleted_at is not null
  union all
  select 'opening', r.id, r.title_en, r.title_ar, r.deleted_at from programs.openings r where r.deleted_at is not null
  union all
  select 'announcement', r.id, r.title_en, r.title_ar, r.deleted_at from core.announcements r where r.deleted_at is not null
  ) as d (kind, id, title_en, title_ar, deleted_at)
  where d.kind = recently_deleted.kind
    and private.may_delete(d.kind, d.id)
  order by d.deleted_at desc;
$$;

-- ── Every edit in History ─────────────────────────────────────────────
create trigger log_activity after insert or update or delete on programs.openings
  for each row execute function private.log_activity();
create trigger log_activity after insert or update or delete on core.announcements
  for each row execute function private.log_activity();

create or replace function private.history_tables()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'events.events',
    'journal.pieces',
    'journal.issues',
    'journal.prize_rounds',
    'journal.calls',
    'journal.story_assignments',
    'programs.productions',
    'programs.episodes',
    'programs.openings',
    'governance.partners',
    'governance.partner_agreements',
    'governance.elections',
    'governance.society_documents',
    'core.announcements',
    'core.presets',
    'content.media_items'
  ]
$$;

-- ── Earlier versions ──────────────────────────────────────────────────
-- Each save of a piece's text, a description or a page keeps the words it
-- replaced; whoever may edit the record reads them and restores one by
-- saving it again (so the record's own rules decide). The last 50 are kept.
create table core.record_versions (
  id bigint generated always as identity primary key,
  record_table text not null,
  record_id uuid not null,
  fields jsonb not null,
  saved_by uuid references auth.users (id) on delete set null,
  saved_at timestamptz not null default now()
);
create index record_versions_record_idx on core.record_versions (record_table, record_id, id desc);
create index record_versions_saved_by_idx on core.record_versions (saved_by);
alter table core.record_versions enable row level security;

create function private.may_edit_record(record_table text, record_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  case record_table
    when 'journal.piece_bodies' then
      return private.piece_editor(record_id);
    when 'events.events' then
      return exists (select 1 from events.events e where e.id = record_id
        and private.leads_event('events.manage', e.id, e.program_id));
    when 'programs.productions' then
      return private.may_manage_production(record_id);
    when 'programs.episodes' then
      return private.has_permission('content.manage');
    when 'programs.openings' then
      return exists (select 1 from programs.openings o where o.id = record_id
        and private.handles_opening(o.owner, o.program_id));
    when 'governance.partners' then
      return private.has_permission('partners.manage');
    when 'governance.society_documents' then
      return private.has_permission('governance.manage');
    when 'core.programs' then
      return private.has_permission('programs.manage');
    else
      return false;
  end case;
end;
$$;
revoke all on function private.may_edit_record(text, uuid) from public, anon;
grant execute on function private.may_edit_record(text, uuid) to authenticated;

create policy "No third-party apps" on core.record_versions
  as restrictive for all to authenticated
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));
create policy "Editors read earlier versions" on core.record_versions
  for select to authenticated
  using ((select private.may_edit_record(record_table, record_id)));
grant select on core.record_versions to authenticated;

-- TG_ARGV: the key column, then the columns kept.
create function private.keep_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_json jsonb := to_jsonb(old);
  new_json jsonb := to_jsonb(new);
  key uuid := (old_json ->> tg_argv[0])::uuid;
  kept jsonb := '{}'::jsonb;
  col text;
  changed boolean := false;
  tbl text := tg_table_schema || '.' || tg_table_name;
begin
  foreach col in array tg_argv[1:] loop
    kept := kept || jsonb_build_object(col, old_json -> col);
    if (old_json -> col) is distinct from (new_json -> col) then
      changed := true;
    end if;
  end loop;
  if changed and exists (
    select 1 from jsonb_each_text(kept) where nullif(value, '') is not null
  ) then
    insert into core.record_versions (record_table, record_id, fields, saved_by)
    values (tbl, key, kept, auth.uid());
    delete from core.record_versions v
    where v.record_table = tbl and v.record_id = key
      and v.id < (select min(id) from (
        select id from core.record_versions
        where record_table = tbl and record_id = key
        order by id desc limit 50) last);
  end if;
  return new;
end;
$$;
revoke all on function private.keep_version() from public, anon, authenticated;

create trigger keep_version before update on journal.piece_bodies
  for each row execute function private.keep_version('piece_id', 'body_en', 'body_ar');
create trigger keep_version before update on events.events
  for each row execute function private.keep_version('id', 'description_en', 'description_ar');
create trigger keep_version before update on programs.productions
  for each row execute function private.keep_version('id', 'summary_en', 'summary_ar');
create trigger keep_version before update on programs.episodes
  for each row execute function private.keep_version('id', 'summary_en', 'summary_ar');
create trigger keep_version before update on programs.openings
  for each row execute function private.keep_version('id', 'body_en', 'body_ar', 'eligibility_en', 'eligibility_ar');
create trigger keep_version before update on governance.partners
  for each row execute function private.keep_version('id', 'description_en', 'description_ar');
create trigger keep_version before update on governance.society_documents
  for each row execute function private.keep_version('id', 'summary_en', 'summary_ar', 'body_en', 'body_ar');
create trigger keep_version before update on core.programs
  for each row execute function private.keep_version('id', 'summary_en', 'summary_ar', 'rhythm_en', 'rhythm_ar');

select private.build_api();
