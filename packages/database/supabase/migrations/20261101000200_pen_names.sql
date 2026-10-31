-- Pen names, not Anonymous (owner, Oct 31, 2026). An author may publish
-- under a pen name (`submissions.pen_name`, made a pen-name byline by
-- `make_piece`), as before; the Anonymous byline and choice added by
-- 20261101000000 are removed. A byline is always a member.

drop trigger if exists anonymous_byline on journal.pieces;
drop function if exists private.anonymous_byline();
revoke insert (anonymous) on journal.submissions from authenticated;
alter table journal.submissions drop column if exists anonymous;

alter table journal.contributors drop constraint if exists contributors_person;
drop index if exists journal.contributors_one_anonymous;
-- The Anonymous row goes unless a piece or a credit already carries it.
delete from journal.contributors c
where c.is_anonymous
  and not exists (select 1 from journal.pieces p where p.contributor_id = c.id)
  and not exists (select 1 from journal.piece_credits k where k.contributor_id = c.id);
alter table journal.contributors drop column if exists is_anonymous;
alter table journal.contributors
  add constraint contributors_person check (user_id is not null) not valid;

-- The newsroom names a byline by choosing a member (and, if they write
-- under one, a pen name). Clients never read `contributors.user_id`, so a
-- pen name can't be traced back to its author; this finds the member's
-- byline, or makes it, and returns only its id.
create function private.byline_for(person uuid, pen_name text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  pen text := nullif(btrim(pen_name), '');
  found_id uuid;
  base_slug text;
  candidate text;
  n integer := 1;
begin
  if not private.can_edit_puzzles() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from core.profiles p where p.id = person) then
    raise exception 'Member not found' using errcode = 'P0002';
  end if;
  if pen is not null and char_length(pen) not between 2 and 80 then
    raise exception 'A pen name is 2 to 80 characters' using errcode = '22023';
  end if;

  select c.id into found_id from journal.contributors c
  where c.user_id = person
    and c.is_pen_name = (pen is not null)
    and (pen is null or c.name_en = pen)
  order by c.created_at
  limit 1;
  if found_id is not null then
    return found_id;
  end if;

  base_slug := coalesce(
    nullif(trim(both '-' from regexp_replace(lower(coalesce(pen,
      (select p.full_name_en from core.profiles p where p.id = person))),
      '[^a-z0-9]+', '-', 'g')), ''),
    'contributor'
  );
  candidate := base_slug;
  while exists (select 1 from journal.contributors c where c.slug = candidate) loop
    n := n + 1;
    candidate := base_slug || '-' || n;
  end loop;
  insert into journal.contributors (slug, user_id, name_en, name_ar, is_pen_name)
  values (candidate, person, coalesce(pen, ''), pen, pen is not null)
  returning id into found_id;
  return found_id;
end;
$$;
revoke all on function private.byline_for(uuid, text) from public, anon;
grant execute on function private.byline_for(uuid, text) to authenticated;

create function journal.byline_for(person uuid, pen_name text default null)
returns uuid
language sql volatile
security invoker
set search_path = ''
as $$ select private.byline_for($1, $2) $$;
revoke all on function journal.byline_for(uuid, text) from public, anon;
grant execute on function journal.byline_for(uuid, text) to authenticated;
