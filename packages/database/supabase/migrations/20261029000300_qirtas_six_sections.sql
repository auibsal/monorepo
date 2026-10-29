-- Qirtas in six sections (owner, Oct 29, 2026), step 2: the mapping and the
-- rules (the new values were added in 20261029000200).
--
-- * Voices keeps its section and takes the review from News. Games is a
--   section of its own.
-- * Six types a section. The types already in use map into them: an
--   article is a report, a letter a letter to the editor, short drama is
--   drama, art and photography is art, a video a video report (a Next Stop
--   piece a Next Stop episode); prose, the one type with no place, becomes
--   fiction (editors can move a piece to creative nonfiction). The
--   database refuses any other type.
-- * The newsroom door takes News, Voices, Video and Games; the Edition door
--   Letters and Gallery (journal.is_edition_desk, unchanged).
-- * The masthead gains a Voices Editor and a Games Editor.

-- ── The types in use, renamed into their new names ─────────────────────────

alter type journal.category rename value 'article' to 'report';
alter type journal.category rename value 'letter' to 'letter_to_editor';
alter type journal.category rename value 'short_drama' to 'drama';
alter type journal.category rename value 'art_photography' to 'art';
alter type journal.category rename value 'video' to 'video_report';

-- ── Six sections, six types each ────────────────────────────────────────────

create or replace function journal.desk_of(category journal.category)
returns journal.desk
language sql
immutable
set search_path = ''
as $$
  select case
    when category in ('report', 'feature', 'interview', 'profile', 'event_coverage', 'explainer')
      then 'news'
    when category in ('review', 'column', 'opinion_essay', 'letter_to_editor', 'debate', 'recommendations')
      then 'voices'
    when category in ('art', 'photography', 'illustration', 'comic', 'calligraphy', 'photo_essay')
      then 'gallery'
    when category in ('next_stop_episode', 'reel', 'short_film', 'video_report', 'recorded_performance', 'animation')
      then 'video'
    when category in ('crossword', 'quiz', 'word_ladder', 'riddle', 'anagram', 'name_the_book')
      then 'games'
    else 'letters'
  end::journal.desk;
$$;

-- The thirty-six types. Retired values stay in the enum (an enum keeps its
-- labels) and are refused here.
create function journal.is_current_category(category journal.category)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select category in (
    'report', 'feature', 'interview', 'profile', 'event_coverage', 'explainer',
    'review', 'column', 'opinion_essay', 'letter_to_editor', 'debate', 'recommendations',
    'poetry', 'fiction', 'creative_nonfiction', 'drama', 'translation', 'six_words',
    'art', 'photography', 'illustration', 'comic', 'calligraphy', 'photo_essay',
    'next_stop_episode', 'reel', 'short_film', 'video_report', 'recorded_performance', 'animation',
    'crossword', 'quiz', 'word_ladder', 'riddle', 'anagram', 'name_the_book'
  );
$$;

revoke all on function journal.is_current_category(journal.category) from public;
grant execute on function journal.is_current_category(journal.category)
  to anon, authenticated, service_role;

-- ── The work already sent ───────────────────────────────────────────────────
-- A new name for a piece's type is not an edit: approvals stay.

alter table journal.pieces disable trigger after_piece_content_change;

update journal.pieces set category = 'fiction' where category = 'prose';
update journal.submissions set category = 'fiction' where category = 'prose';
update journal.blind_entries set category = 'fiction' where category = 'prose';

update journal.pieces set category = 'next_stop_episode'
where category = 'video_report'
  and (title_en ilike '%next stop%' or title_ar like '%المحطة القادمة%');

-- The section is computed from the type; rows whose section moved (reviews
-- into Voices) are computed again.
update journal.pieces set category = category where desk is distinct from journal.desk_of(category);
update journal.submissions set category = category where desk is distinct from journal.desk_of(category);
update journal.blind_entries set category = category where desk is distinct from journal.desk_of(category);

alter table journal.pieces enable trigger after_piece_content_change;

alter table journal.pieces add constraint pieces_category_current
  check (journal.is_current_category(category));
alter table journal.submissions add constraint submissions_category_current
  check (journal.is_current_category(category));
alter table journal.blind_entries add constraint blind_entries_category_current
  check (journal.is_current_category(category));

-- Every Video type is a video.
alter table journal.submissions drop constraint submissions_video_link;
alter table journal.submissions add constraint submissions_video_link
  check (journal.desk_of(category) <> 'video' or video_url is not null);

-- ── What members send ───────────────────────────────────────────────────────

create or replace function private.before_submission_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c journal.calls;
  existing integer;
  recent integer;
  desk journal.desk := journal.desk_of(new.category);
begin
  -- Serialize submissions per author so the counts below can't race.
  perform pg_advisory_xact_lock(hashtext('journal.submissions:' || new.author_id::text));

  -- Six Words come only from the Typewriter Tour, transcribed by officers.
  if new.category = 'six_words' then
    raise exception 'six_words_on_tour' using errcode = '22023';
  end if;
  if not journal.is_current_category(new.category) then
    raise exception 'category_retired' using errcode = '22023';
  end if;

  if journal.is_edition_desk(desk) then
    select * into c from journal.calls where id = new.call_id;
    if not found or not c.is_published then
      raise exception 'Call not found' using errcode = 'P0002';
    end if;
    if now() < c.opens_at or now() > c.closes_at then
      raise exception 'This call is not open' using errcode = '22023';
    end if;
    if not (desk = any (c.desks)) then
      raise exception 'This call is not for % work', desk using errcode = '22023';
    end if;

    -- Conflicts and staff work: the Editor-in-Chief, Managing Editor and
    -- Submissions Manager do not submit while in office, and no one submits
    -- to a desk they edit.
    if access.has_permission('journal.approve', 'issue', c.issue_id)
       or access.has_permission('journal.identity.view', 'issue', c.issue_id) then
      raise exception 'staff_cannot_submit' using errcode = '42501';
    end if;
    if access.has_permission('journal.edit.' || desk::text, 'issue', c.issue_id) then
      raise exception 'desk_editor_cannot_submit' using errcode = '42501';
    end if;

    select count(*) into existing from journal.submissions s
    where s.call_id = new.call_id and s.author_id = new.author_id and s.status <> 'withdrawn';
    if existing >= c.max_per_person then
      raise exception 'You can send at most % submissions to this call', c.max_per_person
        using errcode = '23514';
    end if;
  elsif new.call_id is not null then
    raise exception '% work is not sent to a call', desk using errcode = '22023';
  end if;

  select count(*) into recent from journal.submissions s
  where s.author_id = new.author_id and s.created_at > now() - interval '1 hour';
  if recent >= 3 then
    raise exception 'Too many submissions in the last hour; try again later'
      using errcode = '54000';
  end if;

  new.status := 'received';
  return new;
end;
$$;

-- ── What a piece needs before it publishes ──────────────────────────────────

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
  elsif p.desk = 'video' then
    if p.video_url is null then
      problems := array_append(problems, 'video');
    end if;
  else
    if (p.language in ('en', 'bilingual') and char_length(btrim(coalesce(b.body_en, ''))) = 0)
       or (p.language in ('ar', 'bilingual') and char_length(btrim(coalesce(b.body_ar, ''))) = 0) then
      problems := array_append(problems, 'text');
    end if;
  end if;
  if p.category in ('report', 'feature', 'interview')
     and char_length(btrim(coalesce(p.deck_en, p.deck_ar, ''))) = 0 then
    problems := array_append(problems, 'deck');
  end if;

  return nullif(array_to_string(problems, ','), '');
end;
$$;

-- ── The masthead: a Voices Editor and a Games Editor ────────────────────────

insert into access.permissions (key, description) values
  ('journal.edit.games', 'Qirtas Games Editor: edit crosswords, quizzes and the other games; approve for the section');

insert into access.roles (key, name_en, name_ar, is_council, spending_limit_iqd, sort) values
  ('voices_editor', 'Voices Editor', 'محرر الأصوات', false, null, 128),
  ('games_editor', 'Games Editor', 'محرر الألعاب', false, null, 129);

insert into access.role_permissions (role, permission) values
  ('voices_editor', 'journal.edit.voices'),
  ('voices_editor', 'library.read'),
  ('games_editor', 'journal.edit.games'),
  ('games_editor', 'library.read'),
  ('president', 'journal.edit.games');

-- Whoever edits a section edits the games and keeps the contributors.
create or replace function private.can_edit_puzzles()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select access.has_permission_anywhere('journal.approve')
    or access.has_permission_anywhere('journal.publish')
    or access.has_permission_anywhere('journal.copy')
    or access.has_permission_anywhere('journal.edit.news')
    or access.has_permission_anywhere('journal.edit.letters')
    or access.has_permission_anywhere('journal.edit.gallery')
    or access.has_permission_anywhere('journal.edit.video')
    or access.has_permission_anywhere('journal.edit.voices')
    or access.has_permission_anywhere('journal.edit.games');
$$;

alter policy "Select by authenticated" on journal.contributors
  using (
    exists (
      select 1 from journal.pieces p
      where p.contributor_id = contributors.id and p.status = 'published' and p.published_at <= now()
    )
    or user_id = (select auth.uid())
    or (select private.can_edit_puzzles())
  );
alter policy "Piece editors manage contributors (insert)" on journal.contributors
  with check ((select private.can_edit_puzzles()));
alter policy "Piece editors manage contributors (update)" on journal.contributors
  using ((select private.can_edit_puzzles()))
  with check ((select private.can_edit_puzzles()));
alter policy "Piece editors manage contributors (delete)" on journal.contributors
  using ((select private.can_edit_puzzles()));
