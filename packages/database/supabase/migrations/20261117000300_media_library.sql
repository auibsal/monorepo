-- One media library (decisions.md, The site: "One media library" and
-- "Where files live"). Every upload in the Diwan becomes a library item
-- with its file, alt text in English and Arabic, credit, license or
-- release, uploader and where it's used. Replacing keeps every use; an
-- item in use can't be deleted; unused items are listed for the yearly
-- audit. Recently deleted becomes one mechanism for every area (the kinds
-- in private.trash_kinds()), kept 30 days (decisions.md, retention).

create table content.media_items (
  id uuid primary key default gen_random_uuid(),
  bucket text not null check (bucket in ('media', 'library')),
  path text not null,
  file_name text not null check (char_length(file_name) between 1 and 300),
  kind text not null default 'image'
    check (kind in ('image', 'logo', 'pdf', 'captions', 'promo')),
  mime text,
  bytes integer check (bytes >= 0),
  width integer check (width > 0),
  height integer check (height > 0),
  alt_en text check (char_length(alt_en) <= 500),
  alt_ar text check (char_length(alt_ar) <= 500),
  caption_en text check (char_length(caption_en) <= 2200),
  caption_ar text check (char_length(caption_ar) <= 2200),
  credit text check (char_length(credit) <= 200),
  license text not null default 'own'
    check (license in ('own', 'release', 'partner', 'licensed', 'public_domain')),
  -- The signed media release behind it, where there is one.
  release_id uuid references governance.form_submissions (id) on delete set null,
  -- The event a promo kit's images were made for.
  event_id uuid references events.events (id) on delete set null,
  uploaded_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id) on delete set null,
  unique (bucket, path)
);

create index media_items_release_id_idx on content.media_items (release_id);
create index media_items_event_id_idx on content.media_items (event_id);
create index media_items_uploaded_by_idx on content.media_items (uploaded_by);
create index media_items_deleted_by_idx on content.media_items (deleted_by);
create index media_items_path_idx on content.media_items (path);

alter table content.media_items enable row level security;



create policy "No third-party apps" on content.media_items
  as restrictive for all to authenticated
  using ((select private.client_allows('content')))
  with check ((select private.client_allows('content')));
create policy "Not in Recently deleted" on content.media_items
  as restrictive for select to authenticated
  using (deleted_at is null);

-- Anyone holding a role uses the library; the uploader or content.manage
-- changes an item's words.
create policy "Staff read the library" on content.media_items
  for select to authenticated
  using ((select private.i_am_staff()));
-- Whoever uploaded the file records it (staff, or a partner's own logo).
create function private.owns_object(bucket text, path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from storage.objects o
    where o.bucket_id = bucket and o.name = path
      and o.owner_id = (select auth.uid())::text
  );
$$;
revoke all on function private.owns_object(text, text) from public, anon;
grant execute on function private.owns_object(text, text) to authenticated;

create policy "Uploaders add to the library" on content.media_items
  for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and (private.owns_object(bucket, path) or (select private.i_am_staff()))
  );
create policy "The uploader or content managers describe an item" on content.media_items
  for update to authenticated
  using (
    uploaded_by = (select auth.uid())
    or (select private.has_permission_anywhere('content.manage'))
  )
  with check (
    uploaded_by = (select auth.uid())
    or (select private.has_permission_anywhere('content.manage'))
  );

grant select, insert on content.media_items to authenticated;
grant update (alt_en, alt_ar, caption_en, caption_ar, credit, license, release_id, event_id, kind)
  on content.media_items to authenticated;
grant all on content.media_items to service_role;


create trigger log_activity
  after insert or update or delete on content.media_items
  for each row execute function private.log_activity();

-- ── Where an item is used ──────────────────────────────────────────────
-- Every column that holds a media path, read as the record that uses it.
create function private.media_uses(item uuid)
returns table (kind text, record_id uuid, ref text, title_en text, title_ar text)
language sql
stable
security definer
set search_path = ''
as $$
  with m as (select path from content.media_items where id = item)
  select 'event', e.id, e.slug, e.title_en, e.title_ar
    from events.events e, m where e.image_path = m.path and e.deleted_at is null
  union all
  select 'event', e.id, e.slug, e.title_en, e.title_ar
    from events.program_items p join events.events e on e.id = p.event_id, m
    where p.still_path = m.path and e.deleted_at is null
  union all
  select 'partner', p.id, coalesce(p.slug, p.id::text), p.name_en, p.name_ar
    from governance.partners p, m
    where (p.logo_path = m.path or p.logo_pending_path = m.path) and p.deleted_at is null
  union all
  select 'edition', i.id, i.id::text, i.title_en, i.title_ar
    from journal.issues i, m where i.cover_path = m.path or i.pdf_path = m.path
  union all
  select 'piece', p.id, p.id::text, p.title_en, p.title_ar
    from journal.pieces p, m where p.image_path = m.path
  union all
  select 'piece', p.id, p.id::text, p.title_en, p.title_ar
    from journal.piece_media pm join journal.pieces p on p.id = pm.piece_id, m
    where pm.storage_path = m.path
  union all
  select 'episode', e.id, e.slug, e.title_en, e.title_ar
    from programs.episodes e, m
    where e.thumbnail_path = m.path or e.captions_en_path = m.path or e.captions_ar_path = m.path
  union all
  select 'production', p.id, coalesce(p.slug, p.id::text), p.title_en, p.title_ar
    from programs.productions p, m
    where p.poster_path = m.path or p.rights_document_path = m.path
  union all
  select 'memorandum', a.id, a.id::text, coalesce(a.code, ''), coalesce(a.code, '')
    from governance.partner_agreements a, m where a.signed_document_path = m.path;
$$;
revoke all on function private.media_uses(uuid) from public, anon;

-- Replacing an item's file keeps every use: each record moves to the new
-- path, and the item takes it. The old file is left for the retention job.
create function private.replace_media(item uuid, new_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_path text;
begin
  select path into old_path from content.media_items
  where id = item and deleted_at is null
    and (uploaded_by = auth.uid() or private.has_permission_anywhere('content.manage'));
  if old_path is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from content.media_items where path = new_path) then
    raise exception 'not_in_library' using errcode = 'P0002';
  end if;
  update events.events set image_path = new_path where image_path = old_path;
  update events.program_items set still_path = new_path where still_path = old_path;
  update governance.partners set logo_path = new_path where logo_path = old_path;
  update journal.issues set cover_path = new_path where cover_path = old_path;
  update journal.issues set pdf_path = new_path where pdf_path = old_path;
  update journal.pieces set image_path = new_path where image_path = old_path;
  update journal.piece_media set storage_path = new_path where storage_path = old_path;
  update programs.episodes set thumbnail_path = new_path where thumbnail_path = old_path;
  update programs.productions set poster_path = new_path where poster_path = old_path;
  -- The new upload's own item goes; this one keeps its words and takes the file.
  delete from content.media_items where path = new_path and id <> item;
  update content.media_items set path = new_path, updated_at = now() where id = item;
end;
$$;
revoke all on function private.replace_media(uuid, text) from public, anon;

-- Items no record uses, for the yearly audit (decisions.md, The site).
create function private.unused_media()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.id from content.media_items m
  where m.deleted_at is null
    and not exists (select 1 from private.media_uses(m.id));
$$;
revoke all on function private.unused_media() from public, anon;

-- ── Recently deleted, one mechanism for every area ─────────────────────
create function private.trash_kinds()
returns table (kind text, tbl text, title_en text, title_ar text)
language sql
immutable
set search_path = ''
as $$
  values
    ('event', 'events.events', 'title_en', 'title_ar'),
    ('partner', 'governance.partners', 'name_en', 'name_ar'),
    ('media', 'content.media_items', 'file_name', 'file_name');
$$;

create or replace function private.may_delete(kind text, record_id uuid)
returns boolean
language plpgsql
stable
security definer
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
  end if;
  return false;
end;
$$;

create or replace function private.record_uses(kind text, record_id uuid)
returns jsonb
language plpgsql
stable
security definer
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
  end if;
  if result is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  return result;
end;
$$;

create or replace function private.trash_record(kind text, record_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uses jsonb := private.record_uses(kind, record_id);
  target text := (select k.tbl from private.trash_kinds() k where k.kind = trash_record.kind);
begin
  if uses->>'blocked' is not null then
    raise exception '%', uses->>'blocked' using errcode = '23514';
  end if;
  execute format(
    'update %s set deleted_at = now(), deleted_by = auth.uid() where id = $1', target)
  using record_id;
end;
$$;

create or replace function private.restore_record(kind text, record_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target text := (select k.tbl from private.trash_kinds() k where k.kind = restore_record.kind);
  n integer;
begin
  if target is null or not private.may_delete(kind, record_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  execute format(
    'update %s set deleted_at = null, deleted_by = null where id = $1 and deleted_at is not null',
    target)
  using record_id;
  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function private.recently_deleted(kind text)
returns table (id uuid, title_en text, title_ar text, deleted_at timestamptz, purges_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  k record;
begin
  select * into k from private.trash_kinds() t where t.kind = recently_deleted.kind;
  if k is null then
    return;
  end if;
  return query execute format(
    'select r.id, r.%I::text, r.%I::text, r.deleted_at, r.deleted_at + interval ''30 days''
     from %s r where r.deleted_at is not null and private.may_delete($1, r.id)
     order by r.deleted_at desc',
    k.title_en, k.title_ar, k.tbl)
  using kind;
end;
$$;

create or replace function private.purge_recently_deleted()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  k record;
  n integer;
  total integer := 0;
begin
  for k in select * from private.trash_kinds() loop
    execute format(
      'delete from %s where deleted_at < now() - interval ''30 days''', k.tbl);
    get diagnostics n = row_count;
    total := total + n;
  end loop;
  return total;
end;
$$;

-- The retention route removes a purged item's file before the rows go.
create or replace function core.retention_due()
returns table (kind text, ref text)
language sql
stable
set search_path = ''
as $$
  select 'tour_photo', p from private.unclaimed_tour_photos() p
  union all
  select 'guest_account', g::text from private.idle_guest_accounts() g
  union all
  select 'deleted_account', a::text from private.accounts_to_delete() a
  union all
  select 'media_file', m.bucket || ':' || m.path
  from content.media_items m
  where m.deleted_at < now() - interval '30 days';
$$;

-- ── The names the Diwan calls ──────────────────────────────────────────
create function core.media_uses(item uuid)
returns table (kind text, record_id uuid, ref text, title_en text, title_ar text)
language sql stable security invoker set search_path = ''
as $$ select * from private.media_uses(item) $$;
create function core.replace_media(item uuid, new_path text)
returns void language sql security invoker set search_path = ''
as $$ select private.replace_media(item, new_path) $$;
create function core.unused_media()
returns setof uuid language sql stable security invoker set search_path = ''
as $$ select * from private.unused_media() $$;
revoke all on function core.media_uses(uuid), core.replace_media(uuid, text),
  core.unused_media() from public, anon;
grant execute on function private.media_uses(uuid), private.replace_media(uuid, text),
  private.unused_media(), core.media_uses(uuid), core.replace_media(uuid, text),
  core.unused_media() to authenticated;
revoke all on function private.trash_kinds() from public, anon;
grant execute on function private.trash_kinds() to authenticated;

-- ── The files already uploaded become library items ────────────────────
-- Avatars are personal and stay out of the library.
insert into content.media_items (bucket, path, file_name, kind, mime, bytes, uploaded_by, created_at)
select o.bucket_id, o.name,
  regexp_replace(o.name, '^.*/', ''),
  case
    when o.metadata->>'mimetype' = 'application/pdf' then 'pdf'
    when o.metadata->>'mimetype' = 'text/vtt' then 'captions'
    when o.name like 'partners/%' then 'logo'
    else 'image'
  end,
  o.metadata->>'mimetype',
  nullif(o.metadata->>'size', '')::integer,
  o.owner, o.created_at
from storage.objects o
where o.bucket_id in ('media', 'library')
  and o.name not like 'avatars/%'
  and o.name not like '%/.emptyFolderPlaceholder'
on conflict (bucket, path) do nothing;

create or replace function private.retention_schedule()
 RETURNS TABLE(rule text, keeps text, runs text)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  values
    ('Unpublished Write for Qirtas submissions and their files', '12 months after the decision', null),
    ('Write for Qirtas drafts', '12 months after the last change', 'private.purge_stale_drafts'),
    ('Blind copies, assignments, scores and decisions of deleted submissions', '12 months', 'private.purge_blind_entries'),
    ('Invitation lists', '30 days after the list is sent', 'private.purge_tour_lists'),
    ('Unclaimed spring 2026 Tour pages', 'until the spring 2027 Tour (tour.unclaimed_until)', 'private.purge_unclaimed_tour_pages'),
    ('Associate membership requests', '1 year after the decision', 'private.purge_associate_requests'),
    ('Qalam consent forms (F-38, F-39) and the roster with attendance', '3 years after the program year', 'private.purge_qalam_records'),
    ('Incident records', '2 years after the case closes (Qalam''s: 7 years)', 'private.purge_incident_records'),
    ('Ballots, ballot receipts and voter lists', '1 year after the vote closes', 'private.purge_expired_ballots'),
    ('Who voted for the Prize', '1 year after the vote closes', 'private.purge_prize_vote_receipts'),
    ('Get involved replies', '12 months after the last change', 'private.purge_opening_replies'),
    ('Removal requests', '2 years after closing', 'private.purge_removal_requests'),
    ('Unconfirmed Sunday Paper sign-ups', 'until the confirmation window closes', 'private.purge_unconfirmed_subscribers'),
    ('Sign-ups never confirmed', '7 days', 'private.purge_unconfirmed_sign_ups'),
    ('Unconfirmed personal email requests', '7 days', 'private.purge_personal_email_requests'),
    ('Codes for a new AUIB address or a merge', '1 day', 'private.purge_address_codes'),
    ('Requests to merge two accounts', '1 year after the decision', 'private.purge_merge_requests'),
    ('Calendar feed addresses', '12 months without a sign-in', 'private.purge_idle_devices'),
    ('Guest accounts', '2 years without a sign-in, holding no role', null),
    ('Accounts their owners deleted', '30 days after the request, unless they sign in again', null),
    ('The activity log', '12 months', 'private.purge_activity_log'),
    ('Sent emails in the outbox', '30 days after sending', 'private.prune_outbox'),
    ('Problem reports', '1 year', 'private.purge_problem_reports'),
    ('Trip emergency contacts and health notes (F-45)', '7 days after the trip', 'private.purge_trip_contacts'),
    ('Recently deleted items (every area)', '30 days after deletion', 'private.purge_recently_deleted');
$function$;

select private.build_api();
