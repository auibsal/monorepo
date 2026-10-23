-- Fewer gates on the way to print (owner, 2026-10-24: "many steps require
-- too much bureaucracy"). A piece on a named desk (News, Video, Voices)
-- publishes on the desk editor's approval. An Edition piece (Letters,
-- Gallery) needs the desk editor and the Editor-in-Chief or Managing
-- Editor, two people. The Copy Chief's style check is recorded when it is
-- given and never required. The author's approval and the agreement on
-- submitted work stay as they were.

-- The approvals a piece needs before the rule lets it through.
create function private.required_approvals(desk journal.desk)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case when desk in ('letters', 'gallery')
    then array['desk', 'chief'] else array['desk'] end;
$$;

create or replace function private.publish_check(piece_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  p journal.pieces;
  b journal.piece_bodies;
  problems text[] := '{}'::text[];
  needed text;
begin
  select * into p from journal.pieces where id = publish_check.piece_id;
  select * into b from journal.piece_bodies where piece_bodies.piece_id = p.id;

  foreach needed in array private.required_approvals(p.desk) loop
    if not exists (select 1 from journal.approvals a where a.piece_id = p.id and a.kind = needed) then
      problems := array_append(problems, needed || '_approval');
    end if;
  end loop;
  if p.submission_id is not null then
    if p.author_approved_at is null then
      problems := array_append(problems, 'author_approval');
    end if;
    if not exists (select 1 from journal.agreements a where a.submission_id = p.submission_id) then
      problems := array_append(problems, 'agreement');
    end if;
  end if;

  -- Every piece has an Arabic and an English title.
  if char_length(btrim(coalesce(p.title_en, ''))) = 0 or char_length(btrim(coalesce(p.title_ar, ''))) = 0 then
    problems := array_append(problems, 'titles');
  end if;

  -- What its type needs.
  if p.desk = 'gallery' then
    if not exists (select 1 from journal.piece_media m where m.piece_id = p.id) and p.image_path is null then
      problems := array_append(problems, 'images');
    end if;
  elsif p.category = 'video' then
    if p.video_url is null then
      problems := array_append(problems, 'video');
    end if;
  else
    if (p.language in ('en', 'bilingual') and char_length(btrim(coalesce(b.body_en, ''))) = 0)
       or (p.language in ('ar', 'bilingual') and char_length(btrim(coalesce(b.body_ar, ''))) = 0) then
      problems := array_append(problems, 'text');
    end if;
  end if;
  if p.category in ('article', 'feature', 'interview')
     and char_length(btrim(coalesce(p.deck_en, p.deck_ar, ''))) = 0 then
    problems := array_append(problems, 'deck');
  end if;

  return nullif(array_to_string(problems, ','), '');
end;
$$;

create or replace function private.try_publish(piece_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  p journal.pieces;
  problem text;
  launch timestamptz;
  due timestamptz;
begin
  select * into p from journal.pieces where id = try_publish.piece_id for update;
  if not found or p.status in ('published', 'unpublished') then
    return p.status;
  end if;
  -- Only a piece whose author has approved it (or a staff piece) and whose
  -- required approvals are in is ready; until then nothing moves.
  if (p.submission_id is not null and p.author_approved_at is null)
     or exists (
       select 1 from unnest(private.required_approvals(p.desk)) needed
       where not exists (select 1 from journal.approvals a where a.piece_id = p.id and a.kind = needed)
     ) then
    return p.status;
  end if;

  problem := private.publish_check(p.id);
  if problem is not null then
    update journal.pieces set status = 'editing', edit_note = problem where id = p.id;
    return 'editing';
  end if;

  select i.publish_at into launch from journal.issues i where i.id = p.issue_id;
  due := coalesce(p.publish_at, launch, now());
  if due > now() then
    update journal.pieces
    set status = 'scheduled', publish_at = due, edit_note = null
    where id = p.id;
    return 'scheduled';
  end if;

  update journal.pieces
  set status = 'published', published_at = now(), publish_at = coalesce(p.publish_at, now()),
      edit_note = null
  where id = p.id;
  perform private.enqueue('journal.piece_published', jsonb_build_object('piece_id', p.id));
  return 'published';
end;
$$;
