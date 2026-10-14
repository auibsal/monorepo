-- Waraq: one publication for news, letters and art (owner, Oct 14, 2026).
-- The spec is the Notion project page "Waraq: one publication for news,
-- letters and art" (What the platform needs); the rules are the handbook
-- page "Waraq: how the publication is run". It extends the Journal module
-- (schema `journal`, kept as the code name) instead of adding a system.
--
-- • Desks. Every type of piece belongs to one desk: News, Letters, Gallery,
--   Video or Voices. Letters and Gallery are edition desks: work answers a
--   call for an Edition and is read blind, as the journal was. News, Video
--   and Voices are always open and edited by name.
-- • Editions are journal.issues; an Edition's publish_at is its launch, and
--   every piece tagged to it publishes then unless it has its own time.
-- • A piece moves Editing → Author approved → Approved → Scheduled →
--   Published (or Unpublished). Accepting a submission makes its piece; the
--   editor and the author work on it in the Nexus; the author approves the
--   text; the desk editor and the Editor-in-Chief or Managing Editor (two
--   different people) approve; the Copy Chief marks style done. Then the
--   publish rule (private.publish_check) decides, and the piece goes out on
--   time in its layout. Anything missing sends it back to Editing with a
--   note. Any change to the text after the author's approval clears the
--   approvals.
-- • New permissions: journal.edit.<desk> (desk editors), journal.approve
--   (Editor-in-Chief, Managing Editor), journal.copy (Copy Chief),
--   journal.frontpage (Editor-in-Chief). The spec's waraq.intake is
--   journal.identity.view, waraq.read is journal.review, waraq.submit is
--   membership.
-- • Pen names: a piece under a pen name gets its own contributor record, and
--   no client can read which account a contributor belongs to.

-- ── Desks ───────────────────────────────────────────────────────────────────

create function journal.desk_of(category journal.category)
returns journal.desk
language sql
immutable
set search_path = ''
as $$
  select case
    when category in ('article', 'interview', 'review', 'feature') then 'news'
    when category in ('art_photography', 'photo_essay', 'comic') then 'gallery'
    when category = 'video' then 'video'
    when category in ('column', 'letter') then 'voices'
    else 'letters'
  end::journal.desk;
$$;

-- Letters and Gallery answer a call for an Edition and are read blind.
create function journal.is_edition_desk(desk journal.desk)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select desk in ('letters', 'gallery');
$$;

grant execute on function journal.desk_of(journal.category), journal.is_edition_desk(journal.desk)
  to anon, authenticated, service_role;

-- Desk editors for a desk: journal.edit.<desk> globally or for the Edition.
-- The Editor-in-Chief and Managing Editor (journal.approve) see every desk.
create function private.is_desk_editor(desk journal.desk, issue_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select access.has_permission('journal.edit.' || desk::text, 'issue', issue_id)
    or access.has_permission('journal.approve', 'issue', issue_id);
$$;

-- Who may edit a piece's text and metadata: its desk editors, the Copy
-- Chief, publishers (journal.publish: the Arabic Editor and Guest Editors
-- through journal.manage are not enough), the Editor-in-Chief and ME.
create function private.can_edit_piece(desk journal.desk, issue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_desk_editor(desk, issue_id)
    or access.has_permission('journal.copy', 'issue', issue_id)
    or access.has_permission('journal.publish', 'issue', issue_id);
$$;

revoke all on function private.is_desk_editor(journal.desk, uuid) from public, anon;
revoke all on function private.can_edit_piece(journal.desk, uuid) from public, anon;
grant execute on function private.is_desk_editor(journal.desk, uuid) to authenticated, service_role;
grant execute on function private.can_edit_piece(journal.desk, uuid) to authenticated, service_role;

-- ── Editions ────────────────────────────────────────────────────────────────

alter table journal.issues
  add column season_en text check (char_length(season_en) <= 60),
  add column season_ar text check (char_length(season_ar) <= 60);

comment on table journal.issues is
  'Waraq Editions: a curated issue of the best Letters and Gallery work each semester. publish_at is the launch.';

-- A call may be for Letters, Gallery or both. decisions_at is the one
-- announced day every author hears (the letters wait until then).
alter table journal.calls
  add column decisions_at timestamptz,
  add column desks journal.desk[] not null default '{letters,gallery}'
    check (cardinality(desks) > 0 and desks <@ '{letters,gallery}'::journal.desk[]);

-- ── Submissions ─────────────────────────────────────────────────────────────

alter table journal.submissions
  alter column call_id drop not null,
  add column desk journal.desk generated always as (journal.desk_of(category)) stored,
  add column pen_name text check (char_length(btrim(pen_name)) between 2 and 80),
  -- Standfirst for news: one or two sentences under the headline.
  add column deck text check (char_length(deck) <= 400),
  add column video_url text check (video_url ~ '^https://[^\s]+$' and char_length(video_url) <= 500),
  -- Consent of every identifiable person in an image (a parent or guardian
  -- for anyone under 18), and that the work has not appeared elsewhere.
  add column consent_confirmed boolean not null default false,
  add column first_publication_confirmed boolean not null default false,
  add constraint submissions_call_for_edition_desks
    check ((call_id is not null) = journal.is_edition_desk(journal.desk_of(category))),
  add constraint submissions_gallery_consent
    check (journal.desk_of(category) <> 'gallery' or consent_confirmed),
  add constraint submissions_first_publication
    check (first_publication_confirmed or journal.desk_of(category) = 'news'),
  add constraint submissions_video_link
    check (category <> 'video' or video_url is not null);

create index submissions_desk_idx on journal.submissions (desk, status) where call_id is null;

alter table journal.blind_entries
  add column desk journal.desk generated always as (journal.desk_of(category)) stored;

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
  -- Serialise submissions per author so the counts below can't race.
  perform pg_advisory_xact_lock(hashtext('journal.submissions:' || new.author_id::text));

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

-- Desk editors read work sent to their desk (News, Video, Voices), by name.
create policy "Desk editors read named submissions"
  on journal.submissions for select to authenticated
  using (call_id is null and (select private.is_desk_editor(desk)));

create policy "Desk editors read named submission files"
  on journal.submission_files for select to authenticated
  using (exists (
    select 1 from journal.submissions s
    where s.id = submission_id and s.call_id is null
      and (select private.is_desk_editor(s.desk))
  ));

create policy "Desk editors read named status history"
  on journal.status_history for select to authenticated
  using (exists (
    select 1 from journal.submissions s
    where s.id = submission_id and s.call_id is null
      and (select private.is_desk_editor(s.desk))
  ));

grant insert (pen_name, deck, video_url, consent_confirmed, first_publication_confirmed)
  on journal.submissions to authenticated;
grant update (pen_name, deck, video_url) on journal.submissions to authenticated;

-- ── Contributors ────────────────────────────────────────────────────────────

alter table journal.contributors
  add column is_pen_name boolean not null default false;

-- Which account a contributor is stays private: a pen name must not lead
-- back to its author. Clients read every other column.
revoke select on journal.contributors from anon, authenticated;
grant select (id, slug, name_en, name_ar, bio_en, bio_ar, is_pen_name, created_at, updated_at)
  on journal.contributors to anon, authenticated;

-- The contributor form after acceptance: the author sets how their name is
-- spelled and their bio (third person, present tense, 50 words at most).
create function journal.update_my_contributor(
  contributor_id uuid,
  name_en text,
  name_ar text,
  bio_en text,
  bio_ar text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from journal.contributors c
    where c.id = update_my_contributor.contributor_id and c.user_id = auth.uid()
  ) then
    raise exception 'Contributor not found' using errcode = 'P0002';
  end if;
  if char_length(btrim(coalesce(name_en, ''))) < 2 then
    raise exception 'name_required' using errcode = '22023';
  end if;
  if array_length(regexp_split_to_array(btrim(coalesce(bio_en, '')), '\s+'), 1) > 50
     or array_length(regexp_split_to_array(btrim(coalesce(bio_ar, '')), '\s+'), 1) > 50 then
    raise exception 'bio_too_long' using errcode = '22023';
  end if;
  update journal.contributors c
  set name_en = btrim(update_my_contributor.name_en),
      name_ar = nullif(btrim(coalesce(update_my_contributor.name_ar, '')), ''),
      bio_en = nullif(btrim(coalesce(update_my_contributor.bio_en, '')), ''),
      bio_ar = nullif(btrim(coalesce(update_my_contributor.bio_ar, '')), '')
  where c.id = update_my_contributor.contributor_id;
end;
$$;

-- The caller's own contributor records (a real name and any pen names).
create function journal.my_contributors()
returns table (id uuid, slug text, name_en text, name_ar text, bio_en text, bio_ar text, is_pen_name boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.slug, c.name_en, c.name_ar, c.bio_en, c.bio_ar, c.is_pen_name
  from journal.contributors c
  where c.user_id = auth.uid()
  order by c.is_pen_name, c.name_en;
$$;

revoke all on function journal.update_my_contributor(uuid, text, text, text, text) from public, anon;
revoke all on function journal.my_contributors() from public, anon;
grant execute on function journal.update_my_contributor(uuid, text, text, text, text) to authenticated;
grant execute on function journal.my_contributors() to authenticated;

-- ── Pieces ──────────────────────────────────────────────────────────────────

alter table journal.pieces drop constraint pieces_status_check;
alter table journal.pieces drop constraint pieces_check1;
alter table journal.pieces alter column status set default 'editing';
update journal.pieces set status = 'editing' where status = 'draft';

alter table journal.pieces
  add column desk journal.desk generated always as (journal.desk_of(category)) stored,
  add column deck_en text check (char_length(deck_en) <= 400),
  add column deck_ar text check (char_length(deck_ar) <= 400),
  add column video_url text check (video_url ~ '^https://[^\s]+$' and char_length(video_url) <= 500),
  -- The front page: 1 is the lead story, chosen by the Editor-in-Chief.
  add column front_rank smallint check (front_rank between 1 and 12),
  -- When the editor asked the author for the final check, and when the
  -- author approved the text as it now stands.
  add column author_requested_at timestamptz,
  add column author_approved_at timestamptz,
  -- Why the publish rule sent the piece back (private.publish_check codes).
  add column edit_note text check (char_length(edit_note) <= 2000),
  add column unpublished_at timestamptz,
  add column unpublish_note text check (char_length(unpublish_note) <= 2000),
  add constraint pieces_status_check check (status in (
    'editing', 'author_approved', 'approved', 'scheduled', 'published', 'unpublished'
  )),
  add constraint pieces_scheduled_has_time check (status <> 'scheduled' or publish_at is not null),
  add constraint pieces_published_has_time check (status <> 'published' or published_at is not null),
  add constraint pieces_front_is_published check (front_rank is null or status = 'published');

create unique index pieces_front_rank_idx on journal.pieces (front_rank) where front_rank is not null;
create index pieces_desk_published_idx on journal.pieces (desk, published_at desc) where status = 'published';

alter table journal.pieces drop column search;
alter table journal.pieces add column search tsvector generated always as (
  private.search_vector(title_en, title_ar, deck_en, deck_ar, credit_en, credit_ar)
) stored;
create index pieces_search_idx on journal.pieces using gin (search);

-- More people on a piece than its author: reporters, photographers,
-- illustrators, translators.
create table journal.piece_credits (
  piece_id uuid not null references journal.pieces (id) on delete cascade,
  contributor_id uuid not null references journal.contributors (id) on delete cascade,
  role text not null check (role in ('author', 'reporter', 'photographer', 'illustrator', 'translator')),
  sort smallint not null default 0,
  primary key (piece_id, contributor_id, role)
);

create index piece_credits_contributor_id_idx on journal.piece_credits (contributor_id);

-- Images for gallery pieces, photo essays and comics (panels in order), and
-- a news story's photo. Files are in the public `media` bucket under
-- waraq/<piece id>/.
create table journal.piece_media (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null references journal.pieces (id) on delete cascade,
  storage_path text not null unique check (storage_path ~ '^waraq/[0-9a-f-]{36}/[^/]+$'),
  alt_en text not null default '' check (char_length(alt_en) <= 500),
  alt_ar text not null default '' check (char_length(alt_ar) <= 500),
  caption_en text check (char_length(caption_en) <= 1000),
  caption_ar text check (char_length(caption_ar) <= 1000),
  width integer check (width > 0),
  height integer check (height > 0),
  sort smallint not null default 0,
  created_at timestamptz not null default now()
);

create index piece_media_piece_id_idx on journal.piece_media (piece_id, sort);

create table journal.approvals (
  piece_id uuid not null references journal.pieces (id) on delete cascade,
  -- desk: the desk editor; chief: the Editor-in-Chief or Managing Editor;
  -- copy: the Copy Chief's style check.
  kind text not null check (kind in ('desk', 'chief', 'copy')),
  approved_by uuid not null references auth.users (id) on delete cascade default auth.uid(),
  approved_at timestamptz not null default now(),
  primary key (piece_id, kind)
);

create index approvals_approved_by_idx on journal.approvals (approved_by);

-- The conversation between editors and the author about a piece: the edit
-- letter, questions, and the author's replies.
create table journal.piece_notes (
  id bigint generated always as identity primary key,
  piece_id uuid not null references journal.pieces (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index piece_notes_piece_id_idx on journal.piece_notes (piece_id, created_at);
create index piece_notes_author_id_idx on journal.piece_notes (author_id);

-- Corrections are made openly, with a dated note at the end of the piece.
create table journal.corrections (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null references journal.pieces (id) on delete cascade,
  note_en text check (char_length(note_en) <= 1000),
  note_ar text check (char_length(note_ar) <= 1000),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (note_en is not null or note_ar is not null)
);

create index corrections_piece_id_idx on journal.corrections (piece_id, created_at);
create index corrections_created_by_idx on journal.corrections (created_by);

-- True when the caller wrote the piece (through its contributor record).
create function private.is_piece_author(piece_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from journal.pieces p
    join journal.contributors c on c.id = p.contributor_id
    where p.id = is_piece_author.piece_id and c.user_id = auth.uid()
  );
$$;

create function private.piece_editor(piece_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from journal.pieces p
    where p.id = piece_editor.piece_id and private.can_edit_piece(p.desk, p.issue_id)
  );
$$;

revoke all on function private.is_piece_author(uuid) from public, anon;
revoke all on function private.piece_editor(uuid) from public, anon;
grant execute on function private.is_piece_author(uuid) to authenticated, service_role;
grant execute on function private.piece_editor(uuid) to authenticated, service_role;

-- ── The publish rule ────────────────────────────────────────────────────────

-- Why a piece cannot publish yet, as comma-separated codes the Nexus
-- translates (desk_approval, chief_approval, copy_check, author_approval,
-- agreement, titles, images, video, text, deck), or null when it can.
create function private.publish_check(piece_id uuid)
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
begin
  select * into p from journal.pieces where id = publish_check.piece_id;
  select * into b from journal.piece_bodies where piece_bodies.piece_id = p.id;

  if not exists (select 1 from journal.approvals a where a.piece_id = p.id and a.kind = 'desk') then
    problems := array_append(problems, 'desk_approval');
  end if;
  if not exists (select 1 from journal.approvals a where a.piece_id = p.id and a.kind = 'chief') then
    problems := array_append(problems, 'chief_approval');
  end if;
  if not exists (select 1 from journal.approvals a where a.piece_id = p.id and a.kind = 'copy') then
    problems := array_append(problems, 'copy_check');
  end if;
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

-- Moves a piece as far as the rule allows: Approved (or Scheduled) once
-- everything is in place, Published when its time has come. When it was
-- ready for that and something is missing, it goes back to Editing with
-- the reason.
create function private.try_publish(piece_id uuid)
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
  -- three approvals are in is ready.
  if (p.submission_id is not null and p.author_approved_at is null)
     or (select count(*) from journal.approvals a where a.piece_id = p.id) < 3 then
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

revoke all on function private.publish_check(uuid) from public, anon, authenticated;
revoke all on function private.try_publish(uuid) from public, anon, authenticated;

-- What the rule would say now, for the piece's editors and author.
create function journal.publish_readiness(piece_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.piece_editor(publish_readiness.piece_id) or private.is_piece_author(publish_readiness.piece_id)) then
    raise exception 'Piece not found' using errcode = 'P0002';
  end if;
  return private.publish_check(publish_readiness.piece_id);
end;
$$;

-- No piece goes out except through the rule: a client cannot write a
-- piece's status or its approval fields, and a piece made from a
-- submission is never published before the agreement is signed.
create or replace function private.before_piece_publish()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('scheduled', 'published')
     and new.submission_id is not null
     and not exists (
       select 1 from journal.agreements a where a.submission_id = new.submission_id
     ) then
    raise exception 'The author has not signed the Publication Agreement'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

-- A change to what readers will read, after the author approved it, needs
-- the author and the approvals again. Corrections to a published piece go
-- through journal.corrections instead and keep it published.
create function private.reset_piece_approvals(piece_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from journal.approvals a where a.piece_id = reset_piece_approvals.piece_id;
  update journal.pieces
  set status = 'editing', author_approved_at = null
  where id = reset_piece_approvals.piece_id
    and status in ('editing', 'author_approved', 'approved', 'scheduled');
end;
$$;

revoke all on function private.reset_piece_approvals(uuid) from public, anon, authenticated;

create function private.after_piece_content_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status in ('author_approved', 'approved', 'scheduled')
     or (old.status = 'editing' and exists (select 1 from journal.approvals a where a.piece_id = new.id)) then
    perform private.reset_piece_approvals(new.id);
  end if;
  return null;
end;
$$;

create trigger after_piece_content_change
  after update of title_en, title_ar, deck_en, deck_ar, credit_en, credit_ar, language,
    category, video_url, contributor_id
  on journal.pieces
  for each row
  when (
    old.title_en is distinct from new.title_en or old.title_ar is distinct from new.title_ar
    or old.deck_en is distinct from new.deck_en or old.deck_ar is distinct from new.deck_ar
    or old.credit_en is distinct from new.credit_en or old.credit_ar is distinct from new.credit_ar
    or old.language is distinct from new.language or old.category is distinct from new.category
    or old.video_url is distinct from new.video_url or old.contributor_id is distinct from new.contributor_id
  )
  execute function private.after_piece_content_change();

create function private.after_piece_body_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from journal.pieces p
    where p.id = new.piece_id
      and (p.status in ('author_approved', 'approved', 'scheduled')
        or (p.status = 'editing' and exists (select 1 from journal.approvals a where a.piece_id = p.id)))
  ) then
    perform private.reset_piece_approvals(new.piece_id);
  end if;
  return null;
end;
$$;

create trigger after_piece_body_change
  after update of body_en, body_ar on journal.piece_bodies
  for each row
  when (old.body_en is distinct from new.body_en or old.body_ar is distinct from new.body_ar)
  execute function private.after_piece_body_change();

-- Media and credits are part of what readers see too.
create function private.after_piece_parts_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.piece_id, old.piece_id);
begin
  if exists (
    select 1 from journal.pieces p
    where p.id = target
      and (p.status in ('author_approved', 'approved', 'scheduled')
        or (p.status = 'editing' and exists (select 1 from journal.approvals a where a.piece_id = p.id)))
  ) then
    perform private.reset_piece_approvals(target);
  end if;
  return null;
end;
$$;

create trigger after_piece_media_change after insert or update or delete on journal.piece_media
  for each row execute function private.after_piece_parts_change();
create trigger after_piece_credits_change after insert or update or delete on journal.piece_credits
  for each row execute function private.after_piece_parts_change();

revoke all on function private.after_piece_content_change() from public, anon, authenticated;
revoke all on function private.after_piece_body_change() from public, anon, authenticated;
revoke all on function private.after_piece_parts_change() from public, anon, authenticated;

-- The thread on a piece. Editors are named; the author is "the author",
-- so a pen name never leads back to a real name.
create function journal.piece_thread(piece_id uuid)
returns table (id bigint, body text, created_at timestamptz, mine boolean, from_author boolean, writer_name_en text, writer_name_ar text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  author uuid;
begin
  if not (private.piece_editor(piece_thread.piece_id) or private.is_piece_author(piece_thread.piece_id)) then
    raise exception 'Piece not found' using errcode = 'P0002';
  end if;
  select c.user_id into author from journal.pieces p
  join journal.contributors c on c.id = p.contributor_id
  where p.id = piece_thread.piece_id;
  return query
    select n.id, n.body, n.created_at, n.author_id = auth.uid(), n.author_id = author,
      case when n.author_id = author then null else pr.full_name_en end,
      case when n.author_id = author then null else pr.full_name_ar end
    from journal.piece_notes n
    left join core.profiles pr on pr.id = n.author_id
    where n.piece_id = piece_thread.piece_id
    order by n.created_at;
end;
$$;

revoke all on function journal.piece_thread(uuid) from public, anon;
grant execute on function journal.piece_thread(uuid) to authenticated, service_role;

-- A note from an editor reaches the author by email (the edit letter);
-- a note from the author reaches the piece's desk editors in the Nexus.
create function private.after_piece_note()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  author uuid;
begin
  select c.user_id into author from journal.pieces p
  join journal.contributors c on c.id = p.contributor_id
  where p.id = new.piece_id;
  if author is not null and new.author_id <> author then
    perform private.enqueue('journal.piece_note',
      jsonb_build_object('piece_id', new.piece_id, 'user_id', author, 'note_id', new.id));
  end if;
  return null;
end;
$$;

create trigger after_piece_note after insert on journal.piece_notes
  for each row execute function private.after_piece_note();

revoke all on function private.after_piece_note() from public, anon, authenticated;

-- After a decision the review team may know who wrote a piece, but a pen
-- name stays a pen name: only the Submissions Manager keeps the real one.
create or replace function journal.entry_author(blind_entry_id uuid)
returns table (author_name_en text, author_name_ar text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case when s.pen_name is not null and not private.can_view_identity(b.issue_id)
      then s.pen_name else p.full_name_en end,
    case when s.pen_name is not null and not private.can_view_identity(b.issue_id)
      then s.pen_name else p.full_name_ar end
  from journal.blind_entries b
  join journal.decisions d on d.blind_entry_id = b.id
  join journal.blind_keys k on k.blind_entry_id = b.id
  join journal.submissions s on s.id = k.submission_id
  join core.profiles p on p.id = s.author_id
  where b.id = entry_author.blind_entry_id
    and (private.is_assigned_reader(b.id) or private.is_issue_editor(b.issue_id)
      or private.can_view_identity(b.issue_id));
$$;

-- ── Moves on a piece ────────────────────────────────────────────────────────

-- The editor asks the author for the final check (72 hours: name, title,
-- every line break, bio; errors only).
create function journal.request_author_approval(piece_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p journal.pieces;
  author uuid;
begin
  select * into p from journal.pieces where id = request_author_approval.piece_id;
  if not found or not private.can_edit_piece(p.desk, p.issue_id) then
    raise exception 'Piece not found' using errcode = 'P0002';
  end if;
  if p.status <> 'editing' or p.submission_id is null then
    raise exception 'Only a piece in editing has an author to ask' using errcode = '22023';
  end if;
  select c.user_id into author from journal.contributors c where c.id = p.contributor_id;
  update journal.pieces set author_requested_at = now() where id = p.id;
  perform private.enqueue('journal.final_check',
    jsonb_build_object('piece_id', p.id, 'user_id', author));
end;
$$;

-- The author approves the text as it stands.
create function journal.author_approve(piece_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  p journal.pieces;
begin
  select * into p from journal.pieces where id = author_approve.piece_id for update;
  if not found or not private.is_piece_author(p.id) or p.submission_id is null then
    raise exception 'Piece not found' using errcode = 'P0002';
  end if;
  if p.status <> 'editing' then
    raise exception 'This piece is not waiting for your approval' using errcode = '22023';
  end if;
  update journal.pieces
  set status = 'author_approved', author_approved_at = now()
  where id = p.id;
  return private.try_publish(p.id);
end;
$$;

-- An approval: desk (the desk editor), chief (Editor-in-Chief or Managing
-- Editor, never the same person as the desk approval) or copy (Copy Chief).
create function journal.approve_piece(piece_id uuid, kind text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  p journal.pieces;
  other uuid;
begin
  select * into p from journal.pieces where id = approve_piece.piece_id for update;
  if not found then
    raise exception 'Piece not found' using errcode = 'P0002';
  end if;
  if private.is_piece_author(p.id) then
    raise exception 'You cannot approve your own piece' using errcode = '42501';
  end if;
  if not (p.status = 'author_approved' or (p.status = 'editing' and p.submission_id is null)) then
    raise exception 'The author approves the text first' using errcode = '22023';
  end if;

  if kind = 'desk' then
    if not access.has_permission('journal.edit.' || p.desk::text, 'issue', p.issue_id) then
      raise exception 'journal.edit.% is required', p.desk using errcode = '42501';
    end if;
    select a.approved_by into other from journal.approvals a where a.piece_id = p.id and a.kind = 'chief';
  elsif kind = 'chief' then
    if not access.has_permission('journal.approve', 'issue', p.issue_id) then
      raise exception 'journal.approve is required' using errcode = '42501';
    end if;
    select a.approved_by into other from journal.approvals a where a.piece_id = p.id and a.kind = 'desk';
  elsif kind = 'copy' then
    if not access.has_permission('journal.copy', 'issue', p.issue_id) then
      raise exception 'journal.copy is required' using errcode = '42501';
    end if;
  else
    raise exception 'Unknown approval' using errcode = '22023';
  end if;
  if other = auth.uid() then
    raise exception 'The desk and the chief approvals come from two people' using errcode = '22023';
  end if;

  insert into journal.approvals (piece_id, kind) values (p.id, approve_piece.kind)
  on conflict on constraint approvals_pkey do nothing;
  return private.try_publish(p.id);
end;
$$;

create function journal.withdraw_approval(piece_id uuid, kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from journal.approvals a
    where a.piece_id = withdraw_approval.piece_id and a.kind = withdraw_approval.kind
      and a.approved_by = auth.uid()
  ) then
    raise exception 'Approval not found' using errcode = 'P0002';
  end if;
  delete from journal.approvals a
  where a.piece_id = withdraw_approval.piece_id and a.kind = withdraw_approval.kind;
  update journal.pieces
  set status = case when author_approved_at is not null then 'author_approved' else 'editing' end
  where id = withdraw_approval.piece_id and status in ('approved', 'scheduled');
end;
$$;

-- Sets or clears the piece's own publish time, then applies the rule.
create function journal.schedule_piece(piece_id uuid, publish_at timestamptz)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  p journal.pieces;
begin
  select * into p from journal.pieces where id = schedule_piece.piece_id for update;
  if not found or not (
    access.has_permission('journal.approve', 'issue', p.issue_id)
    or access.has_permission('journal.edit.' || p.desk::text, 'issue', p.issue_id)
  ) then
    raise exception 'Piece not found' using errcode = 'P0002';
  end if;
  if p.status in ('published', 'unpublished') then
    raise exception 'This piece is already out' using errcode = '22023';
  end if;
  update journal.pieces set publish_at = schedule_piece.publish_at where id = p.id;
  if p.status = 'scheduled' then
    update journal.pieces set status = 'approved' where id = p.id;
  end if;
  return private.try_publish(p.id);
end;
$$;

-- Unpublishing is one click and leaves a dated note.
create function journal.unpublish_piece(piece_id uuid, note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p journal.pieces;
begin
  select * into p from journal.pieces where id = unpublish_piece.piece_id for update;
  if not found or not (
    access.has_permission('journal.approve', 'issue', p.issue_id)
    or access.has_permission('journal.edit.' || p.desk::text, 'issue', p.issue_id)
  ) then
    raise exception 'Piece not found' using errcode = 'P0002';
  end if;
  if p.status <> 'published' then
    raise exception 'Only a published piece can be unpublished' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(note, ''))) = 0 then
    raise exception 'note_required' using errcode = '22023';
  end if;
  update journal.pieces
  set status = 'unpublished', unpublished_at = now(),
      unpublish_note = to_char(now() at time zone 'Asia/Baghdad', 'YYYY-MM-DD') || ': ' || btrim(note),
      front_rank = null
  where id = p.id;
end;
$$;

-- Back to Editing (an unpublished piece, or one that needs more work).
create function journal.reopen_piece(piece_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p journal.pieces;
begin
  select * into p from journal.pieces where id = reopen_piece.piece_id for update;
  if not found or not private.can_edit_piece(p.desk, p.issue_id) then
    raise exception 'Piece not found' using errcode = 'P0002';
  end if;
  if p.status = 'published' then
    raise exception 'Unpublish it first' using errcode = '22023';
  end if;
  delete from journal.approvals a where a.piece_id = p.id;
  update journal.pieces
  set status = 'editing', author_approved_at = null, front_rank = null
  where id = p.id;
end;
$$;

-- The front page (Editor-in-Chief): rank 1 is the lead story.
create function journal.set_front(piece_id uuid, front_rank smallint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not access.has_permission('journal.frontpage') then
    raise exception 'journal.frontpage is required' using errcode = '42501';
  end if;
  if set_front.front_rank is not null then
    if not exists (
      select 1 from journal.pieces p where p.id = set_front.piece_id and p.status = 'published'
    ) then
      raise exception 'Only a published piece goes on the front page' using errcode = '22023';
    end if;
    update journal.pieces p set front_rank = null
    where p.front_rank = set_front.front_rank and p.id <> set_front.piece_id;
  end if;
  update journal.pieces p set front_rank = set_front.front_rank where p.id = set_front.piece_id;
end;
$$;

-- A staff piece (no submission): written by the newsroom, e.g. news, a
-- Side Quest episode or an invited Guest Page.
create function journal.create_staff_piece(
  category journal.category,
  language journal.language,
  title_en text,
  title_ar text,
  contributor_id uuid,
  issue_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  desk journal.desk := journal.desk_of(category);
  base_slug text;
  candidate text;
  n integer := 1;
  new_id uuid;
begin
  if not private.can_edit_piece(desk, create_staff_piece.issue_id) then
    raise exception 'journal.edit.% is required', desk using errcode = '42501';
  end if;
  if not exists (select 1 from journal.contributors c where c.id = create_staff_piece.contributor_id) then
    raise exception 'Contributor not found' using errcode = 'P0002';
  end if;
  base_slug := left(coalesce(
    nullif(trim(both '-' from regexp_replace(lower(coalesce(title_en, '')), '[^a-z0-9]+', '-', 'g')), ''),
    'piece'
  ), 70);
  candidate := base_slug;
  while exists (select 1 from journal.pieces p where p.slug = candidate) loop
    n := n + 1;
    candidate := base_slug || '-' || n;
  end loop;
  insert into journal.pieces (issue_id, contributor_id, slug, category, language, title_en, title_ar, status)
  values (create_staff_piece.issue_id, create_staff_piece.contributor_id, candidate,
    create_staff_piece.category, create_staff_piece.language,
    nullif(btrim(coalesce(create_staff_piece.title_en, '')), ''),
    nullif(btrim(coalesce(create_staff_piece.title_ar, '')), ''), 'editing')
  returning id into new_id;
  insert into journal.piece_bodies (piece_id) values (new_id);
  return new_id;
end;
$$;

-- ── From submission to piece ────────────────────────────────────────────────

-- The piece for an accepted submission (idempotent). Its contributor is the
-- author under their name, or a separate record for a pen name.
create function private.make_piece(submission_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  sub journal.submissions;
  author core.profiles;
  contributor uuid;
  piece uuid;
  display_en text;
  display_ar text;
  base_slug text;
  candidate text;
  n integer := 1;
  blind text;
begin
  select * into sub from journal.submissions where id = make_piece.submission_id;
  select p.id into piece from journal.pieces p where p.submission_id = sub.id;
  if found then
    return piece;
  end if;

  select * into author from core.profiles where id = sub.author_id;
  if sub.pen_name is not null then
    display_en := btrim(sub.pen_name);
    display_ar := btrim(sub.pen_name);
  else
    display_en := coalesce(nullif(btrim(author.full_name_en), ''), 'Contributor');
    display_ar := author.full_name_ar;
  end if;

  select c.id into contributor from journal.contributors c
  where c.user_id = sub.author_id
    and c.is_pen_name = (sub.pen_name is not null)
    and (sub.pen_name is null or c.name_en = display_en)
  order by c.created_at
  limit 1;

  if contributor is null then
    base_slug := coalesce(
      nullif(trim(both '-' from regexp_replace(lower(display_en), '[^a-z0-9]+', '-', 'g')), ''),
      'contributor'
    );
    candidate := base_slug;
    while exists (select 1 from journal.contributors c where c.slug = candidate) loop
      n := n + 1;
      candidate := base_slug || '-' || n;
    end loop;
    insert into journal.contributors (slug, user_id, name_en, name_ar, is_pen_name)
    values (candidate, sub.author_id, display_en, display_ar, sub.pen_name is not null)
    returning id into contributor;
  end if;

  select b.blind_id into blind from journal.blind_keys k
  join journal.blind_entries b on b.id = k.blind_entry_id
  where k.submission_id = sub.id;

  base_slug := left(coalesce(
    nullif(trim(both '-' from regexp_replace(lower(sub.title), '[^a-z0-9]+', '-', 'g')), ''),
    lower(replace(coalesce(blind, 'piece'), 'W-', 'piece-'))
  ), 70);
  candidate := base_slug;
  n := 1;
  while exists (select 1 from journal.pieces p where p.slug = candidate) loop
    n := n + 1;
    candidate := base_slug || '-' || n;
  end loop;

  insert into journal.pieces
    (issue_id, contributor_id, submission_id, slug, category, language, title_en, title_ar,
     deck_en, deck_ar, video_url, status)
  values (
    private.call_issue(sub.call_id), contributor, sub.id, candidate, sub.category, sub.language,
    case when sub.language = 'ar' then null else sub.title end,
    case when sub.language = 'ar' then sub.title end,
    case when sub.language = 'ar' then null else sub.deck end,
    case when sub.language = 'ar' then sub.deck end,
    sub.video_url,
    'editing'
  )
  returning id into piece;

  insert into journal.piece_bodies (piece_id, body_en, body_ar)
  values (
    piece,
    case when sub.language = 'ar' then null else sub.body_html end,
    case when sub.language = 'ar' then sub.body_html end
  );

  return piece;
end;
$$;

revoke all on function private.make_piece(uuid) from public, anon, authenticated;

-- Kept for the Nexus (Administration → Waraq → Accepted): the piece for an
-- accepted blind entry. Accepting now makes it straight away.
create or replace function journal.piece_from_entry(blind_entry_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry journal.blind_entries;
  submission uuid;
begin
  select * into entry from journal.blind_entries b where b.id = piece_from_entry.blind_entry_id;
  if not found or not private.can_edit_piece(entry.desk, entry.issue_id) then
    raise exception 'journal.publish is required for this issue' using errcode = '42501';
  end if;
  if not exists (
    select 1 from journal.decisions d
    where d.blind_entry_id = entry.id and d.decision in ('accept', 'accept_with_edits')
  ) then
    raise exception 'Only accepted work becomes a piece' using errcode = '22023';
  end if;
  select k.submission_id into submission from journal.blind_keys k where k.blind_entry_id = entry.id;
  return private.make_piece(submission);
end;
$$;

-- Decisions on named work (News, Video, Voices) have no blind entry.
alter table journal.decisions
  alter column blind_entry_id drop not null,
  add column submission_id uuid unique references journal.submissions (id) on delete cascade,
  add constraint decisions_one_target check ((blind_entry_id is null) <> (submission_id is null));

create policy "Desk editors read decisions on named work"
  on journal.decisions for select to authenticated
  using (submission_id is not null and exists (
    select 1 from journal.submissions s
    where s.id = submission_id and (select private.is_desk_editor(s.desk))
  ));

-- Blind decisions: the Editor-in-Chief and Managing Editor (journal.decide)
-- or the desk's editor (Letters or Gallery). Accepting makes the piece.
create or replace function journal.decide(blind_entry_id uuid, decision text, notes text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry journal.blind_entries;
  submission journal.submissions;
  new_id uuid;
begin
  select * into entry from journal.blind_entries where id = decide.blind_entry_id for update;
  if not found or not (
    access.has_permission('journal.decide', 'issue', entry.issue_id)
    or access.has_permission('journal.edit.' || entry.desk::text, 'issue', entry.issue_id)
  ) then
    raise exception 'journal.decide is required' using errcode = '42501';
  end if;
  if entry.status <> 'selection' then
    raise exception 'Only pieces in selection can be decided' using errcode = '22023';
  end if;

  insert into journal.decisions (blind_entry_id, decision, notes)
  values (entry.id, decide.decision, decide.notes)
  returning id into new_id;

  select s.* into submission from journal.submissions s
  join journal.blind_keys k on k.submission_id = s.id
  where k.blind_entry_id = entry.id;

  perform private.set_submission_status(
    submission.id,
    case when decide.decision = 'decline' then 'declined' else 'accepted' end::journal.submission_status,
    decide.notes
  );
  if decide.decision <> 'decline' then
    perform private.make_piece(submission.id);
  end if;

  -- Authors hear by email either way, all on one announced day: the
  -- letter waits until the call's decisions day when one is set.
  perform private.enqueue('journal.decision',
    jsonb_build_object(
      'submission_id', submission.id,
      'user_id', submission.author_id,
      'decision', decide.decision,
      'send_after', (select c.decisions_at from journal.calls c where c.id = submission.call_id)
    ));
  return new_id;
end;
$$;

-- Named work: the desk editor decides by name.
create function journal.decide_named(submission_id uuid, decision text, notes text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  s journal.submissions;
  new_id uuid;
begin
  select * into s from journal.submissions where id = decide_named.submission_id for update;
  if not found or s.call_id is not null or not private.is_desk_editor(s.desk) then
    raise exception 'Submission not found' using errcode = 'P0002';
  end if;
  if s.status not in ('in_review', 'selection') then
    raise exception 'Only work in review can be decided' using errcode = '22023';
  end if;
  if decision not in ('accept', 'accept_with_edits', 'decline') then
    raise exception 'Unknown decision' using errcode = '22023';
  end if;
  if s.status = 'in_review' then
    perform private.set_submission_status(s.id, 'selection', null);
  end if;

  insert into journal.decisions (submission_id, decision, notes)
  values (s.id, decide_named.decision, decide_named.notes)
  returning id into new_id;

  perform private.set_submission_status(
    s.id,
    case when decide_named.decision = 'decline' then 'declined' else 'accepted' end::journal.submission_status,
    decide_named.notes
  );
  if decide_named.decision <> 'decline' then
    perform private.make_piece(s.id);
  end if;
  perform private.enqueue('journal.decision',
    jsonb_build_object('submission_id', s.id, 'user_id', s.author_id, 'decision', decide_named.decision));
  return new_id;
end;
$$;

-- Moves on the board: named work belongs to its desk editors from intake
-- to decision; edition work keeps the Submissions Manager's intake and the
-- editors' review.
create or replace function journal.transition_submission(
  id uuid,
  to_status journal.submission_status,
  note text default null
)
returns journal.submission_status
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  s journal.submissions;
  issue uuid;
  is_identity boolean;
  is_editor boolean;
begin
  select sub.* into s from journal.submissions sub where sub.id = transition_submission.id;
  if not found then
    select sub.* into s from journal.submissions sub
    join journal.blind_keys k on k.submission_id = sub.id
    where k.blind_entry_id = transition_submission.id;
  end if;
  if not found then
    raise exception 'Submission not found' using errcode = 'P0002';
  end if;

  if s.call_id is null then
    is_editor := private.is_desk_editor(s.desk);
    if to_status = 'withdrawn' then
      if not (s.author_id = auth.uid() or is_editor) then
        raise exception 'Only the author or the desk editor can withdraw' using errcode = '42501';
      end if;
    elsif to_status in ('accepted', 'declined') then
      raise exception 'Record a decision to accept or decline' using errcode = '22023';
    elsif not is_editor then
      raise exception 'journal.edit.% is required', s.desk using errcode = '42501';
    end if;
    perform private.set_submission_status(s.id, to_status, note);
    if to_status = 'intake_check' then
      update journal.submissions set intake_returned_at = null, intake_note = null where id = s.id;
    end if;
    return to_status;
  end if;

  issue := private.call_issue(s.call_id);
  is_identity := private.can_view_identity(issue);
  is_editor := private.is_issue_editor(issue) or private.is_desk_editor(s.desk, issue);

  if to_status = 'withdrawn' then
    if not (s.author_id = auth.uid() or is_identity) then
      raise exception 'Only the author or the Submissions Manager can withdraw'
        using errcode = '42501';
    end if;
  elsif to_status in ('accepted', 'declined') then
    raise exception 'Record a decision to accept or decline' using errcode = '22023';
  elsif s.status in ('received', 'intake_check') then
    if not is_identity then
      raise exception 'journal.identity.view is required for intake' using errcode = '42501';
    end if;
  elsif not is_editor then
    raise exception 'journal.manage or journal.decide is required' using errcode = '42501';
  end if;

  if to_status = 'in_review' and s.status = 'intake_check' then
    perform private.ensure_blind_entry(s.id);
  end if;

  perform private.set_submission_status(s.id, to_status, note);

  if to_status = 'intake_check' then
    update journal.submissions set intake_returned_at = null, intake_note = null where id = s.id;
  end if;

  return to_status;
end;
$$;

-- The fix request, once, before the deadline: the Submissions Manager for
-- edition work, the desk editor for named work.
create or replace function journal.return_for_formatting(submission_id uuid, note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s journal.submissions;
begin
  select * into s from journal.submissions where id = return_for_formatting.submission_id;
  if not found or not (
    (s.call_id is not null and private.can_view_identity(private.call_issue(s.call_id)))
    or (s.call_id is null and private.is_desk_editor(s.desk))
  ) then
    raise exception 'journal.identity.view is required' using errcode = '42501';
  end if;
  if s.status not in ('received', 'intake_check') then
    raise exception 'Only submissions in intake can be returned' using errcode = '22023';
  end if;
  if s.intake_returned_at is not null then
    raise exception 'A fix is requested once' using errcode = '22023';
  end if;
  if s.status = 'received' then
    perform private.set_submission_status(s.id, 'intake_check', 'Returned for formatting');
  end if;

  update journal.submissions
  set intake_returned_at = now(), intake_note = note
  where id = s.id;

  perform private.enqueue('journal.returned_for_formatting',
    jsonb_build_object('submission_id', s.id, 'user_id', s.author_id, 'note', note));
end;
$$;

-- Named work in intake and review, with the author, for its desk editors.
create function journal.desk_queue()
returns table (
  submission_id uuid,
  desk journal.desk,
  category journal.category,
  language journal.language,
  title text,
  deck text,
  status journal.submission_status,
  author_id uuid,
  author_name_en text,
  author_name_ar text,
  pen_name text,
  file_count integer,
  intake_note text,
  intake_returned_at timestamptz,
  piece_id uuid,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.desk, s.category, s.language, s.title, s.deck, s.status, s.author_id,
    p.full_name_en, p.full_name_ar, s.pen_name,
    (select count(*)::integer from journal.submission_files f where f.submission_id = s.id),
    s.intake_note, s.intake_returned_at,
    (select pc.id from journal.pieces pc where pc.submission_id = s.id),
    s.created_at
  from journal.submissions s
  left join core.profiles p on p.id = s.author_id
  where s.call_id is null and private.is_desk_editor(s.desk)
  order by s.created_at desc;
$$;

revoke all on function journal.desk_queue() from public, anon;
grant execute on function journal.desk_queue() to authenticated, service_role;

-- Signing the agreement may be the last thing a piece was waiting for.
create function private.after_agreement_signed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  piece uuid;
begin
  select p.id into piece from journal.pieces p where p.submission_id = new.submission_id;
  if piece is not null then
    perform private.try_publish(piece);
  end if;
  return null;
end;
$$;

create trigger after_agreement_signed after insert on journal.agreements
  for each row execute function private.after_agreement_signed();

revoke all on function private.after_agreement_signed() from public, anon, authenticated;

-- The scheduled job: pieces whose time has come go through the rule again;
-- an Edition publishes at its launch.
create or replace function private.publish_scheduled()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  total integer := 0;
  n integer;
  due uuid;
begin
  if exists (
    select 1 from content.news_posts
    where status = 'scheduled' and publish_at <= now()
  ) then
    update content.news_posts set status = 'published', published_at = publish_at
    where status = 'scheduled' and publish_at <= now();
    get diagnostics n = row_count; total := total + n;
  end if;

  if exists (
    select 1 from journal.issues
    where status = 'scheduled' and publish_at <= now()
  ) then
    update journal.issues set status = 'published', published_at = publish_at
    where status = 'scheduled' and publish_at <= now();
    get diagnostics n = row_count; total := total + n;
  end if;

  for due in
    select p.id from journal.pieces p
    where p.status = 'scheduled' and p.publish_at <= now()
    order by p.publish_at
  loop
    update journal.pieces set status = 'approved' where id = due;
    if private.try_publish(due) = 'published' then
      total := total + 1;
    end if;
  end loop;

  return total;
end;
$$;

revoke all on function private.publish_scheduled() from public, anon, authenticated;

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table journal.piece_credits enable row level security;
alter table journal.piece_media enable row level security;
alter table journal.approvals enable row level security;
alter table journal.piece_notes enable row level security;
alter table journal.corrections enable row level security;

-- Pieces: desk editors, the Copy Chief and publishers work on them; the
-- author reads their own; readers see published ones.
drop policy "Journal publishers manage pieces" on journal.pieces;
create policy "Piece editors read pieces"
  on journal.pieces for select to authenticated
  using ((select private.can_edit_piece(desk, issue_id)));
create policy "Piece editors write pieces"
  on journal.pieces for update to authenticated
  using ((select private.can_edit_piece(desk, issue_id)))
  with check ((select private.can_edit_piece(desk, issue_id)));
create policy "Authors read their own pieces"
  on journal.pieces for select to authenticated
  using ((select private.is_piece_author(id)));

drop policy "Journal publishers manage piece text" on journal.piece_bodies;
create policy "Piece editors read piece text"
  on journal.piece_bodies for select to authenticated
  using ((select private.piece_editor(piece_id)));
create policy "Piece editors write piece text"
  on journal.piece_bodies for update to authenticated
  using ((select private.piece_editor(piece_id)))
  with check ((select private.piece_editor(piece_id)));
create policy "Authors read their own piece text"
  on journal.piece_bodies for select to authenticated
  using ((select private.is_piece_author(piece_id)));

create policy "Anyone reads credits on published pieces"
  on journal.piece_credits for select to anon, authenticated
  using (exists (
    select 1 from journal.pieces p
    where p.id = piece_id and p.status = 'published' and p.published_at <= now()
  ));
create policy "Piece editors manage credits"
  on journal.piece_credits for all to authenticated
  using ((select private.piece_editor(piece_id)))
  with check ((select private.piece_editor(piece_id)));

create policy "Anyone reads media of published pieces"
  on journal.piece_media for select to anon, authenticated
  using (exists (
    select 1 from journal.pieces p
    where p.id = piece_id and p.status = 'published' and p.published_at <= now()
  ));
create policy "Piece editors and authors read media"
  on journal.piece_media for select to authenticated
  using ((select private.piece_editor(piece_id)) or (select private.is_piece_author(piece_id)));
create policy "Piece editors manage media"
  on journal.piece_media for all to authenticated
  using ((select private.piece_editor(piece_id)))
  with check ((select private.piece_editor(piece_id)));

create policy "Piece editors and authors read approvals"
  on journal.approvals for select to authenticated
  using ((select private.piece_editor(piece_id)) or (select private.is_piece_author(piece_id)));

create policy "Piece editors and authors read notes"
  on journal.piece_notes for select to authenticated
  using ((select private.piece_editor(piece_id)) or (select private.is_piece_author(piece_id)));
create policy "Piece editors and authors write notes"
  on journal.piece_notes for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and ((select private.piece_editor(piece_id)) or (select private.is_piece_author(piece_id)))
  );

create policy "Anyone reads corrections to published pieces"
  on journal.corrections for select to anon, authenticated
  using (exists (
    select 1 from journal.pieces p
    where p.id = piece_id and p.status = 'published' and p.published_at <= now()
  ));
create policy "Piece editors read and add corrections"
  on journal.corrections for select to authenticated
  using ((select private.piece_editor(piece_id)));
create policy "Piece editors add corrections"
  on journal.corrections for insert to authenticated
  with check ((select private.piece_editor(piece_id)));

create policy "Third-party apps reach only their areas"
  on journal.piece_credits as restrictive for all to authenticated
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));
create policy "Third-party apps reach only their areas"
  on journal.piece_media as restrictive for all to authenticated
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));
create policy "Third-party apps reach only their areas"
  on journal.approvals as restrictive for all to authenticated
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));
create policy "Third-party apps reach only their areas"
  on journal.piece_notes as restrictive for all to authenticated
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));
create policy "Third-party apps reach only their areas"
  on journal.corrections as restrictive for all to authenticated
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));

-- Contributors: managed by anyone who edits pieces.
drop policy "Journal publishers manage contributors" on journal.contributors;
create policy "Piece editors manage contributors"
  on journal.contributors for all to authenticated
  using (
    (select access.has_permission_anywhere('journal.publish'))
    or (select access.has_permission_anywhere('journal.approve'))
    or (select access.has_permission_anywhere('journal.copy'))
    or (select access.has_permission_anywhere('journal.edit.news'))
    or (select access.has_permission_anywhere('journal.edit.letters'))
    or (select access.has_permission_anywhere('journal.edit.gallery'))
    or (select access.has_permission_anywhere('journal.edit.video'))
    or (select access.has_permission_anywhere('journal.edit.voices'))
  )
  with check (
    (select access.has_permission_anywhere('journal.publish'))
    or (select access.has_permission_anywhere('journal.approve'))
    or (select access.has_permission_anywhere('journal.copy'))
    or (select access.has_permission_anywhere('journal.edit.news'))
    or (select access.has_permission_anywhere('journal.edit.letters'))
    or (select access.has_permission_anywhere('journal.edit.gallery'))
    or (select access.has_permission_anywhere('journal.edit.video'))
    or (select access.has_permission_anywhere('journal.edit.voices'))
  );

-- Editions: the Editor-in-Chief and Managing Editor run them too.
create policy "Chiefs read and write editions"
  on journal.issues for all to authenticated
  using ((select access.has_permission('journal.approve', 'issue', id)))
  with check ((select access.has_permission('journal.approve', 'issue', id)));

-- Media for pieces: editors upload under media/waraq/<piece id>/.
create policy "Piece editors upload Waraq media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = 'waraq'
    and (select private.piece_editor(((storage.foldername(name))[2])::uuid))
  );
create policy "Piece editors remove Waraq media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = 'waraq'
    and (select private.piece_editor(((storage.foldername(name))[2])::uuid))
  );

-- ── Grants ──────────────────────────────────────────────────────────────────

-- Pieces: clients write content columns only; status, approvals and the
-- front page move through the functions above.
revoke insert, update, delete on journal.pieces from authenticated;
grant update (issue_id, contributor_id, slug, category, language, title_en, title_ar,
  deck_en, deck_ar, credit_en, credit_ar, image_path, video_url, members_only, sort)
  on journal.pieces to authenticated;
revoke insert, delete on journal.piece_bodies from authenticated;
grant update (body_en, body_ar) on journal.piece_bodies to authenticated;

grant select on journal.piece_credits, journal.piece_media, journal.corrections to anon, authenticated;
grant select on journal.approvals, journal.piece_notes to authenticated;
grant insert, update, delete on journal.piece_credits, journal.piece_media to authenticated;
grant insert (piece_id, body) on journal.piece_notes to authenticated;
grant insert (piece_id, note_en, note_ar) on journal.corrections to authenticated;
grant all on journal.piece_credits, journal.piece_media, journal.approvals,
  journal.piece_notes, journal.corrections to service_role;
grant usage, select on all sequences in schema journal to service_role;

revoke all on function
  journal.request_author_approval(uuid),
  journal.author_approve(uuid),
  journal.approve_piece(uuid, text),
  journal.withdraw_approval(uuid, text),
  journal.schedule_piece(uuid, timestamptz),
  journal.unpublish_piece(uuid, text),
  journal.reopen_piece(uuid),
  journal.set_front(uuid, smallint),
  journal.create_staff_piece(journal.category, journal.language, text, text, uuid, uuid),
  journal.decide_named(uuid, text, text),
  journal.publish_readiness(uuid)
  from public, anon;
grant execute on function
  journal.request_author_approval(uuid),
  journal.author_approve(uuid),
  journal.approve_piece(uuid, text),
  journal.withdraw_approval(uuid, text),
  journal.schedule_piece(uuid, timestamptz),
  journal.unpublish_piece(uuid, text),
  journal.reopen_piece(uuid),
  journal.set_front(uuid, smallint),
  journal.create_staff_piece(journal.category, journal.language, text, text, uuid, uuid),
  journal.decide_named(uuid, text, text),
  journal.publish_readiness(uuid)
  to authenticated, service_role;

create trigger log_activity after insert or update or delete on journal.approvals
  for each row execute function private.log_activity();
create trigger log_activity after insert or update or delete on journal.corrections
  for each row execute function private.log_activity();

create trigger revalidate after insert or update or delete on journal.piece_media
  for each statement execute function private.queue_revalidation('journal');
create trigger revalidate after insert or update or delete on journal.piece_credits
  for each statement execute function private.queue_revalidation('journal');
create trigger revalidate after insert or update or delete on journal.corrections
  for each statement execute function private.queue_revalidation('journal');

-- ── The masthead ────────────────────────────────────────────────────────────

insert into access.permissions (key, description) values
  ('journal.edit.news', 'Waraq News Editor: assign, edit and fact-check news; approve for the desk'),
  ('journal.edit.letters', 'Waraq Letters Editor: run blind reading and approve Letters'),
  ('journal.edit.gallery', 'Waraq Gallery Editor: curate art, photography and comics; approve for the desk'),
  ('journal.edit.video', 'Waraq Video Editor: Side Quest and video pieces; approve for the desk'),
  ('journal.edit.voices', 'Waraq Voices: letters to the editor and columns; approve for the desk'),
  ('journal.approve', 'Waraq Editor-in-Chief or Managing Editor: the second approval, Editions'),
  ('journal.copy', 'Waraq Copy Chief: house style in both languages, the last check before publish'),
  ('journal.frontpage', 'Waraq front page: the lead story and the order of the front page')
on conflict (key) do nothing;

update access.permissions
set description = 'Run the Waraq pipeline: calls, the board, editors'' notes'
where key = 'journal.manage';
update access.permissions
set description = 'Edit Waraq pieces and contributors on any desk'
where key = 'journal.publish';

insert into access.roles (key, name_en, name_ar, is_council, spending_limit_iqd, sort) values
  ('news_editor', 'News Editor', 'محرر الأخبار', false, null, 125),
  ('letters_editor', 'Letters Editor', 'محرر الآداب', false, null, 126),
  ('gallery_editor', 'Gallery Editor', 'محرر المعرض', false, null, 127),
  ('video_editor', 'Video Editor', 'محرر المرئيات', false, null, 128),
  ('reporter', 'Reporter', 'مراسل', false, null, 155),
  ('photographer', 'Photographer', 'مصوّر', false, null, 156),
  ('illustrator', 'Illustrator', 'رسّام', false, null, 157)
on conflict (key) do nothing;

update access.roles set name_en = 'Copy Chief', name_ar = 'رئيس التدقيق' where key = 'copy_editor';
update access.roles set name_ar = 'المحرر العربي' where key = 'arabic_editor';

-- "Fewer, clearer roles than the journal's 15": nobody lays anything out by
-- hand. No one holds these roles (checked in production, Oct 14, 2026).
delete from access.roles where key in ('digital_editor', 'art_director', 'layout_designer')
  and not exists (
    select 1 from access.role_assignments a
    where a.role in ('digital_editor', 'art_director', 'layout_designer')
  );

insert into access.role_permissions (role, permission)
select role, permission from (values
  ('eic', array['journal.approve', 'journal.frontpage', 'journal.edit.voices']),
  ('managing_editor', array['journal.approve', 'journal.edit.voices']),
  ('news_editor', array['journal.edit.news', 'library.read']),
  ('letters_editor', array['journal.edit.letters', 'journal.manage', 'journal.decide', 'library.read']),
  ('gallery_editor', array['journal.edit.gallery', 'journal.manage', 'journal.decide', 'library.read']),
  ('video_editor', array['journal.edit.video', 'library.read']),
  ('arabic_editor', array['journal.publish']),
  ('copy_editor', array['journal.copy']),
  ('reporter', array['library.read']),
  ('photographer', array['library.read']),
  ('illustrator', array['library.read'])
) as bundles (role, permissions),
lateral unnest(permissions) as permission
on conflict do nothing;

-- The Copy Chief checks style; it no longer needs to publish.
delete from access.role_permissions where role = 'copy_editor' and permission = 'journal.publish';

-- ── The name ────────────────────────────────────────────────────────────────

update core.settings set value = '"Waraq"' where key = 'journal.name_en';
update core.settings set value = '"ورق"' where key = 'journal.name_ar';
insert into core.settings (key, value, is_public, description) values
  ('journal.tagline_en', '"AUIB''s paper of news, letters and art"', true, 'Waraq''s full title (English).'),
  ('journal.tagline_ar', '"صحيفة الجامعة للأخبار والآداب والفنون"', true, 'Waraq''s full title (Arabic).')
on conflict (key) do nothing;

update core.programmes
set slug = 'waraq', name_en = 'Waraq', name_ar = 'ورق'
where slug = 'journal';

-- ── Edition 1 ───────────────────────────────────────────────────────────────
-- From the project calendar: the call opens October 25 and closes
-- December 3, 2026 (Baghdad time) for Letters and Gallery; Edition 1
-- launches on February 24, 2027 at Launch Night. The launch time is set in
-- the Nexus when it is known (it decides when every piece goes out).

-- Where the journal's Issue 1 is still on record (not in production, which
-- is empty), it becomes Edition 1 and its call moves to the new dates.
update journal.issues
set slug = 'edition-1', title_en = 'Edition 1', title_ar = 'الإصدار الأول'
where volume = 1 and number = 1 and slug = 'issue-1' and status = 'draft';

update journal.calls c
set title_en = 'Edition 1: call for Letters and Gallery',
    title_ar = 'الإصدار الأول: دعوة للمشاركة في الآداب والمعرض',
    opens_at = '2026-10-25 00:00:00+03',
    closes_at = '2026-12-03 23:59:59+03'
from journal.issues i
where i.id = c.issue_id and i.slug = 'edition-1'
  and not exists (select 1 from journal.submissions s where s.call_id = c.id);

insert into journal.issues (volume, number, slug, title_en, title_ar, status)
values (1, 1, 'edition-1', 'Edition 1', 'الإصدار الأول', 'draft')
on conflict (volume, number) do nothing;

insert into journal.calls (issue_id, title_en, title_ar, opens_at, closes_at, max_per_person, desks, is_published)
select i.id, 'Edition 1: call for Letters and Gallery', 'الإصدار الأول: دعوة للمشاركة في الآداب والمعرض',
  '2026-10-25 00:00:00+03', '2026-12-03 23:59:59+03', 2, '{letters,gallery}', true
from journal.issues i
where i.volume = 1 and i.number = 1
  and not exists (select 1 from journal.calls c where c.issue_id = i.id);

-- Decisions sent December 17, 2026.
update journal.calls c set decisions_at = '2026-12-17 00:00:00+03'
from journal.issues i
where i.id = c.issue_id and i.volume = 1 and i.number = 1 and c.decisions_at is null;
