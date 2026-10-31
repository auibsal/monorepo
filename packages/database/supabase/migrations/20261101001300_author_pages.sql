-- Owner, Oct 31, 2026: a member's work is their author page.
--   1. A person's own byline lives at /qirtas/authors/<their name>, the
--      name in English with dashes ("shaheen-farjo"), kept in step when the
--      name changes. Pen names keep their own slugs.
--   2. The author page says what the person is to the Society (Member,
--      Partner or Guest) and the roles they hold, for their own byline only:
--      a pen name never says anything that could trace it.
--   3. A member's own page opens even before anything is published, and
--      only they see their submissions and drafts on it (Your work moved
--      there); journal.my_author_page() gives them its address.

-- ── 1. Name slugs ───────────────────────────────────────────────────────────
create function private.name_slug(name text, keep_id uuid default null)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  base text := nullif(trim(both '-' from regexp_replace(lower(coalesce(name, '')), '[^a-z0-9]+', '-', 'g')), '');
  candidate text;
  n integer := 1;
begin
  if base is null then
    return null;
  end if;
  base := left(base, 60);
  candidate := base;
  while exists (
    select 1 from journal.contributors c
    where c.slug = candidate and c.id is distinct from keep_id
  ) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  return candidate;
end;
$$;
revoke all on function private.name_slug(text, uuid) from public, anon, authenticated;

-- Runs after contributor_names (alphabetical: "contributor_names" <
-- "name_slug"), so the profile's name is already in place.
create function private.own_byline_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text;
begin
  if new.user_id is null or new.is_pen_name then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.name_en is not distinct from old.name_en
    and new.slug is not distinct from old.slug then
    return new;
  end if;
  wanted := private.name_slug(new.name_en, new.id);
  if wanted is not null then
    new.slug := wanted;
  end if;
  return new;
end;
$$;
revoke all on function private.own_byline_slug() from public, anon, authenticated;

create trigger name_slug before insert or update of name_en, slug, user_id, is_pen_name
  on journal.contributors
  for each row execute function private.own_byline_slug();

-- Every own-name byline takes its name's slug now.
do $$
declare
  c record;
begin
  for c in
    select id, name_en from journal.contributors
    where user_id is not null and not is_pen_name
    order by created_at
  loop
    update journal.contributors set slug = coalesce(private.name_slug(c.name_en, c.id), slug)
    where id = c.id;
  end loop;
end;
$$;

-- ── 2. What the author is to the Society ────────────────────────────────────
-- Public: an author page's name, bio and, for a person's own byline, their
-- kind and roles. A pen name shows only once it has published work, and
-- never a kind or a role.
create function private.author_card(author_slug text)
returns table (
  id uuid, slug text, name_en text, name_ar text, bio_en text, bio_ar text,
  is_pen_name boolean, kind text, roles_en text[], roles_ar text[]
)
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
    and (
      (c.user_id is not null and not c.is_pen_name)
      or exists (
        select 1 from journal.pieces p
        where p.contributor_id = c.id and p.status = 'published' and p.published_at <= now()
      )
    );
$$;
revoke all on function private.author_card(text) from public;
grant execute on function private.author_card(text) to anon, authenticated;

create function journal.author_card(author_slug text)
returns table (
  id uuid, slug text, name_en text, name_ar text, bio_en text, bio_ar text,
  is_pen_name boolean, kind text, roles_en text[], roles_ar text[]
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.author_card($1) $$;
grant execute on function journal.author_card(text) to anon, authenticated;

-- ── 3. The member's own author page ─────────────────────────────────────────
-- The caller's own-name byline (made if they have none yet); its slug is
-- the address of their author page, where they see their own work.
create function private.my_author_page()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  found_slug text;
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  select c.slug into found_slug from journal.contributors c
  where c.user_id = uid and not c.is_pen_name
  order by c.created_at limit 1;
  if found_slug is null then
    if not exists (select 1 from core.profiles p where p.id = uid and coalesce(p.full_name_en, '') <> '') then
      return null;
    end if;
    insert into journal.contributors (slug, user_id, name_en, is_pen_name)
    values ('tmp-' || replace(gen_random_uuid()::text, '-', ''), uid, '', false)
    returning slug into found_slug;
  end if;
  return found_slug;
end;
$$;
revoke all on function private.my_author_page() from public, anon;
grant execute on function private.my_author_page() to authenticated;

create function journal.my_author_page()
returns text
language sql
security invoker
set search_path = ''
as $$ select private.my_author_page() $$;
revoke all on function journal.my_author_page() from public, anon;
grant execute on function journal.my_author_page() to authenticated;
