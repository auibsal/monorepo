-- The final audit (Oct 31, 2026): what the platform no longer uses.
--
-- 1. Search reads no index table. The public documents are searched in the
--    app (search-page.tsx); content.document_sections was never written
--    since the documents moved to the Library, so it goes, and search keeps
--    events, pieces and productions.
-- 2. AUIB's dates live in core.external_events (the hourly sync); the old
--    events.campus_events was never filled. The member calendar feed now
--    reads the synced dates (lib/api/calendar.ts).
-- 3. Functions nothing calls: governance.joinable_partners (members no
--    longer ask to join a partner: partners verify their own people),
--    governance.council_roster (the Council page reads council_members)
--    and journal.my_author_page (an author's page is /qirtas/authors/<slug>,
--    the byline's slug).
-- 4. No feature switches (owner, Oct 30, 2026): volunteer certificates are
--    simply allowed; the setting the certificate guard still read goes.
--
-- Kept on purpose: governance.handbook_pages (the old handbook, read only,
-- each page now in Notion) and governance.library_documents with the
-- private `library` bucket wait for the owner (PROGRESS.md); the money
-- columns on signed memoranda and production reports stay as records, but
-- nothing writes them any more (the Diwan's forms dropped them).

-- ── 1. Search without the index table ──────────────────────────────────────
create or replace function private.search(query text, max_results integer default 30)
returns table (kind text, id uuid, slug text, title_en text, title_ar text, snippet text,
  occurred_at timestamptz, rank real)
language sql
stable
security definer
set search_path = ''
as $$
  with q as (
    select websearch_to_tsquery('simple'::regconfig, left(coalesce(query, ''), 200)) as tsq
  )
  select * from (
    select 'event'::text, e.id, e.slug, e.title_en, e.title_ar,
      coalesce(e.summary_en, e.summary_ar), e.starts_at, ts_rank(e.search, q.tsq)
    from events.events e, q
    where e.search @@ q.tsq and e.status = 'published' and not e.members_only
    union all
    select 'piece', p.id, p.slug, p.title_en, p.title_ar,
      null, p.published_at, ts_rank(p.search, q.tsq)
    from journal.pieces p, q
    where p.search @@ q.tsq and p.status = 'published' and p.published_at <= now()
    union all
    select 'production', p.id, p.slug, p.title_en, p.title_ar,
      coalesce(p.summary_en, p.summary_ar), p.created_at,
      ts_rank(to_tsvector('simple'::regconfig, concat_ws(' ', p.title_en, p.title_ar,
        p.summary_en, p.summary_ar, p.playwright)), q.tsq)
    from programmes.productions p, q
    where p.is_public and p.stage not in ('proposal', 'cancelled')
      and to_tsvector('simple'::regconfig, concat_ws(' ', p.title_en, p.title_ar,
        p.summary_en, p.summary_ar, p.playwright)) @@ q.tsq
  ) results (kind, id, slug, title_en, title_ar, snippet, occurred_at, rank)
  where char_length(btrim(coalesce(query, ''))) >= 2
  order by rank desc, occurred_at desc nulls last
  limit least(greatest(max_results, 1), 50);
$$;

drop table content.document_sections;

-- ── 2. One table for AUIB's dates ──────────────────────────────────────────
drop table events.campus_events;

-- ── 3. Functions nothing calls ─────────────────────────────────────────────
drop function governance.joinable_partners();
drop function private.joinable_partners();
drop function governance.council_roster();
drop function private.council_roster();
drop function journal.my_author_page();
drop function private.my_author_page();

-- ── 4. No switch for volunteer certificates ────────────────────────────────
create or replace function private.guard_certificate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' or new.president_signed_by is not null or new.advisor_signed_by is not null
      or new.serial is not null then
      raise exception 'certificate_starts_draft' using errcode = '22023';
    end if;
  elsif current_user = 'authenticated' then
    if old.status <> 'draft'
      or new.status is distinct from old.status
      or new.serial is distinct from old.serial
      or new.president_signed_by is distinct from old.president_signed_by
      or new.advisor_signed_by is distinct from old.advisor_signed_by
      or new.verification_code is distinct from old.verification_code then
      raise exception 'certificate_locked' using errcode = '42501';
    end if;
    -- Editing a draft after a signature clears nothing silently: refuse.
    if old.president_signed_by is not null or old.advisor_signed_by is not null then
      raise exception 'certificate_signed' using errcode = '22023';
    end if;
  end if;
  if new.kind in ('fellowship', 'honorary') and new.resolution_id is not null and not exists (
    select 1 from governance.resolutions res where res.id = new.resolution_id and res.status = 'adopted'
  ) then
    raise exception 'resolution_not_adopted' using errcode = '22023';
  end if;
  return new;
end;
$$;

delete from core.settings where key = 'features.volunteer_certificates';
