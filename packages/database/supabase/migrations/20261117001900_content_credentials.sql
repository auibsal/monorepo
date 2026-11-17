-- Content Credentials (the owner, Nov 17, 2026; decisions.md, Media): a
-- media item records whether its original carries a C2PA manifest, read
-- from the bytes as it is uploaded; a photo that does shows a link to
-- verify them. Nothing claims credentials until the photos carry them.
alter table content.media_items
  add column content_credentials boolean not null default false;

comment on column content.media_items.content_credentials is
  'The original carries Content Credentials (C2PA), read at upload; the original is kept byte for byte.';

-- A replaced file brings its own answer.
create or replace function private.replace_media(item uuid, new_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_path text;
  credentials boolean;
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
  -- The new upload's own item goes; this one keeps its words and takes the
  -- file, with whether the new file carries Content Credentials.
  select m.content_credentials into credentials from content.media_items m
  where m.path = new_path and m.id <> item;
  delete from content.media_items where path = new_path and id <> item;
  update content.media_items
  set path = new_path, content_credentials = coalesce(credentials, false), updated_at = now()
  where id = item;
end;
$$;

select private.build_api();
