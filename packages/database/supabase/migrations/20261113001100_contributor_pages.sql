-- Contributor pages (decisions.md, Qirtas): each contributor has a page
-- listing their pieces, by preferred or pen name; Anonymous pieces are left
-- out, and a minor appears only with a parent's consent.

create or replace function private.author_card(author_slug text)
returns table(id uuid, slug text, name_en text, name_ar text, bio_en text, bio_ar text, is_pen_name boolean, kind text, roles_en text[], roles_ar text[])
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.slug, c.name_en, c.name_ar, c.bio_en, c.bio_ar, c.is_pen_name,
    case when c.user_id is not null and not c.is_pen_name then private.membership_kind(c.user_id) end,
    case when c.user_id is not null and not c.is_pen_name then (
      select array_agg(coalesce(nullif(ra.title_en, ''), r.name_en) order by r.sort, ra.starts_at)
      from access.role_assignments ra join access.roles r on r.key = ra.role
      where ra.user_id = c.user_id and ra.role not in ('partner_rep', 'partner_lead')
        and ra.starts_at <= now() and (ra.ends_at is null or ra.ends_at > now())
    ) end,
    case when c.user_id is not null and not c.is_pen_name then (
      select array_agg(coalesce(nullif(ra.title_ar, ''), r.name_ar, r.name_en) order by r.sort, ra.starts_at)
      from access.role_assignments ra join access.roles r on r.key = ra.role
      where ra.user_id = c.user_id and ra.role not in ('partner_rep', 'partner_lead')
        and ra.starts_at <= now() and (ra.ends_at is null or ra.ends_at > now())
    ) end
  from journal.contributors c
  where c.slug = author_slug
    -- Anonymous pieces have no page; a minor's appears only with a
    -- parent's consent (decisions.md, Qirtas).
    and not c.is_anonymous
    and (c.user_id is null or not private.is_limited_minor(c.user_id))
    and (
      (c.user_id is not null and not c.is_pen_name)
      or exists (
        select 1 from journal.pieces p
        where p.contributor_id = c.id and p.status = 'published' and p.published_at <= now()
      )
    );
$$;
