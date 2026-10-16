-- Site search also finds productions: the public ones, by the same rule as
-- auibsal.org/programs/productions (programmes.public_productions). There
-- are few, so their text is matched without a stored search column.

create or replace function content.search(query text, max_results integer default 30)
returns table (
  kind text,
  id uuid,
  slug text,
  title_en text,
  title_ar text,
  snippet text,
  occurred_at timestamptz,
  rank real
)
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
    select 'document', d.id, d.path || case when d.anchor = '' then '' else '#' || d.anchor end,
      case when d.locale = 'en' then d.title end,
      case when d.locale = 'ar' then d.title end,
      left(d.body, 240), d.updated_at, ts_rank(d.search, q.tsq)
    from content.document_sections d, q
    where d.search @@ q.tsq
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
