-- The design review, PR 6b (owner, Nov 5, 2026: PR 6 goes ahead).
--
-- A24 (decision D11): a translation may show its original beside it, an
-- exception to one language per page. The original is kept with the
-- piece's text (journal.piece_bodies.original, in original_lang, a
-- two- or three-letter language code), read under the same rules as the
-- text, and a change to it resets approvals like any change to the text.
--
-- A21: topics, curated by the editors. A topic (journal.topics) is named
-- in both languages and added or renamed by whoever publishes Qirtas
-- (journal.publish); a piece's editors tag it with topics
-- (journal.piece_topics, private.piece_editor). Each topic has its page,
-- /qirtas/topics/<slug>, listing its published pieces.

-- ── A24: the original beside a translation ─────────────────────────────────

alter table journal.piece_bodies
  add column original text,
  add column original_lang text check (original_lang ~ '^[a-z]{2,3}$'),
  add constraint piece_bodies_original_has_language
    check ((original is null) = (original_lang is null));

comment on column journal.piece_bodies.original is
  'The original a translation was made from, shown beside it (D11); sanitized like the text.';
comment on column journal.piece_bodies.original_lang is
  'The original''s language, a two- or three-letter code (fr, fa, ku).';

grant update (original, original_lang) on journal.piece_bodies to authenticated;

drop trigger after_piece_body_change on journal.piece_bodies;
create trigger after_piece_body_change
  after update of body_en, body_ar, original, original_lang on journal.piece_bodies
  for each row
  when (old.body_en is distinct from new.body_en or old.body_ar is distinct from new.body_ar
    or old.original is distinct from new.original
    or old.original_lang is distinct from new.original_lang)
  execute function private.after_piece_body_change();

-- ── A21: topics ────────────────────────────────────────────────────────────

create table journal.topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name_en text not null check (char_length(btrim(name_en)) between 1 and 60),
  name_ar text not null check (char_length(btrim(name_ar)) between 1 and 60),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table journal.topics is
  'Topics the editors curate; each has its page listing its published pieces.';

create index topics_created_by_idx on journal.topics (created_by);

create table journal.piece_topics (
  piece_id uuid not null references journal.pieces (id) on delete cascade,
  topic_id uuid not null references journal.topics (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (piece_id, topic_id)
);

comment on table journal.piece_topics is
  'The topics a piece is tagged with, by its editors.';

create index piece_topics_topic_idx on journal.piece_topics (topic_id);

alter table journal.topics enable row level security;
alter table journal.piece_topics enable row level security;

revoke all on journal.topics, journal.piece_topics from anon, authenticated;
grant select on journal.topics, journal.piece_topics to anon, authenticated;
grant insert (slug, name_en, name_ar) on journal.topics to authenticated;
grant update (slug, name_en, name_ar) on journal.topics to authenticated;
grant delete on journal.topics to authenticated;
grant insert (piece_id, topic_id) on journal.piece_topics to authenticated;
grant delete on journal.piece_topics to authenticated;
grant all on journal.topics, journal.piece_topics to service_role;

create policy "No third-party apps" on journal.topics
  as restrictive for all to authenticated
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));
create policy "No third-party apps" on journal.piece_topics
  as restrictive for all to authenticated
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));

create policy "Anyone reads topics" on journal.topics
  for select to anon, authenticated using (true);
create policy "Publishers add topics" on journal.topics
  for insert to authenticated
  with check ((select private.has_permission('journal.publish')));
create policy "Publishers rename topics" on journal.topics
  for update to authenticated
  using ((select private.has_permission('journal.publish')))
  with check ((select private.has_permission('journal.publish')));
create policy "Publishers remove topics" on journal.topics
  for delete to authenticated
  using ((select private.has_permission('journal.publish')));

-- A published piece's topics are public; a piece's editors see its own
-- before it is published.
create function private.piece_is_out(piece_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from journal.pieces p
    where p.id = piece_is_out.piece_id and p.status = 'published' and p.published_at <= now()
  );
$$;

revoke all on function private.piece_is_out(uuid) from public;
grant execute on function private.piece_is_out(uuid) to anon, authenticated, service_role;

create policy "Anyone reads a published piece's topics" on journal.piece_topics
  for select to anon using ((select private.piece_is_out(piece_id)));
create policy "Published pieces' topics, and their editors' own" on journal.piece_topics
  for select to authenticated using (
    (select private.piece_is_out(piece_id)) or (select private.piece_editor(piece_id))
  );
create policy "Piece editors tag pieces" on journal.piece_topics
  for insert to authenticated with check ((select private.piece_editor(piece_id)));
create policy "Piece editors untag pieces" on journal.piece_topics
  for delete to authenticated using ((select private.piece_editor(piece_id)));

-- The public pages refresh when topics change.
create trigger revalidate
  after insert or update or delete on journal.topics
  for each statement execute function private.queue_revalidation('journal');
create trigger revalidate
  after insert or delete on journal.piece_topics
  for each statement execute function private.queue_revalidation('journal');
