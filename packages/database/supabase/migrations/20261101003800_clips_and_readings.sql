-- The design review, PR 5d (Nov 5, 2026).
--
-- A12: a piece may be paired with a clip from Qirtas's Video section (a Next
-- Stop episode, a reel, a recorded performance): the newsroom picks it on the
-- piece's page and the public piece shows it after the text while the clip is
-- published.
--
-- A11 (decision D10): a few short readings, on the current plans. A piece
-- may carry one recording of itself, kept in its own public bucket,
-- readings/<piece id>/<random>.<ext>, at most 10 MB a file and thirty
-- readings in all (about 300 MB at most, inside the Free plan's 1 GB of
-- files beside the images). Nothing is paid for.

alter table journal.pieces
  add column clip_id uuid references journal.pieces (id) on delete set null,
  add column reading_path text,
  add constraint pieces_clip_not_itself check (clip_id is null or clip_id <> id),
  add constraint pieces_reading_path_shape check (
    reading_path is null or reading_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(mp3|m4a)$'
  );

create index pieces_clip_id_idx on journal.pieces (clip_id);

grant update (clip_id, reading_path) on journal.pieces to authenticated;

comment on column journal.pieces.clip_id is
  'A clip from the Video section paired with the piece; shown after the text while the clip is published.';
comment on column journal.pieces.reading_path is
  'A recording of the piece read aloud, readings/<piece id>/<file>; thirty at most across Qirtas.';

-- A clip is a Video piece; a reading sits in the piece's own folder, is
-- never of a members-only piece (the bucket is public), and the readings
-- stay few.
create function private.check_clip_and_reading()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.clip_id is not null
    and new.clip_id is distinct from old.clip_id
    and not exists (
      select 1 from journal.pieces p where p.id = new.clip_id and p.desk = 'video'
    )
  then
    raise exception 'clip_not_video' using errcode = '22023';
  end if;
  -- The bucket is public, so a members-only piece is never read aloud.
  if new.reading_path is not null and new.members_only then
    raise exception 'reading_members_only' using errcode = '22023';
  end if;
  if new.reading_path is not null
    and new.reading_path is distinct from old.reading_path
  then
    if split_part(new.reading_path, '/', 1) <> new.id::text then
      raise exception 'reading_not_its_own' using errcode = '22023';
    end if;
    if old.reading_path is null and (
      select count(*) from journal.pieces p
      where p.reading_path is not null and p.id <> new.id
    ) >= 30 then
      raise exception 'readings_full' using errcode = '53400';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.check_clip_and_reading() from public, anon, authenticated;

create trigger check_clip_and_reading
  before update of clip_id, reading_path, members_only on journal.pieces
  for each row execute function private.check_clip_and_reading();

-- The readings bucket: public, audio only, small files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('readings', 'readings', true, 10485760, array['audio/mpeg', 'audio/mp4', 'audio/x-m4a']);

-- Whoever edits the piece (its desk, approval or publishing,
-- private.piece_editor, as for its images) records and removes its reading.
-- The bucket is public, so nobody needs a policy to hear one; the clause
-- joins the merged policies (one per role and action, advisor 0006).
do $$
declare
  clause constant text := '(bucket_id = ''readings'' and (select private.piece_editor(((storage.foldername(name))[1])::uuid)))';
  p record;
begin
  for p in
    select policyname, cmd, qual, with_check
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname in ('Insert by authenticated', 'Delete by authenticated', 'Select by authenticated')
  loop
    if p.cmd = 'INSERT' then
      execute format('alter policy %I on storage.objects with check ((%s) or %s)',
        p.policyname, p.with_check, clause);
    else
      execute format('alter policy %I on storage.objects using ((%s) or %s)',
        p.policyname, p.qual, clause);
    end if;
  end loop;
end;
$$;
