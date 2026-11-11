-- The masthead (decisions.md, Qirtas): every section has its row. A
-- section with no editor of its own reads "Covered by the Editor-in-Chief";
-- Games "Checked by the Managing Editor". Someone covering is never listed
-- as the section's editor.

drop function journal.masthead();
drop function private.qirtas_masthead();

create function private.qirtas_masthead()
returns table (
  role text,
  full_name_en text,
  full_name_ar text,
  title_en text,
  title_ar text,
  covered_by text
)
language sql
stable
security definer
set search_path = ''
as $$
  with held as (
    select distinct on (r.sort, p.full_name_en, a.role)
      a.role, r.sort, p.full_name_en, p.full_name_ar,
      coalesce(nullif(btrim(a.title_en), ''), r.name_en) as title_en,
      coalesce(
        nullif(btrim(a.title_ar), ''),
        case when p.title_form = 'feminine' then r.name_ar_feminine end,
        r.name_ar
      ) as title_ar
    from access.role_assignments a
    join access.roles r on r.key = a.role
    join core.profiles p on p.id = a.user_id
    where (a.role in ('eic', 'managing_editor', 'guest_editor') or r.hiring_owner = 'qirtas')
      and not a.covering
      and not r.retired
      and a.starts_at <= now()
      and (a.ends_at is null or a.ends_at > now())
    order by r.sort, p.full_name_en, a.role
  ),
  open_sections as (
    select r.key as role, r.sort, null::text, null::text, r.name_en, r.name_ar,
      case when r.key = 'games_editor' then 'managing_editor' else 'eic' end
    from access.roles r
    where r.key in ('news_editor', 'voices_editor', 'letters_editor', 'gallery_editor',
        'video_editor', 'games_editor')
      and not exists (select 1 from held h where h.role = r.key)
  )
  select x.role, x.full_name_en, x.full_name_ar, x.title_en, x.title_ar, x.covered_by
  from (
    select h.role, h.sort, h.full_name_en, h.full_name_ar, h.title_en, h.title_ar,
      null::text as covered_by
    from held h
    union all
    select * from open_sections
  ) x
  order by x.sort, x.full_name_en nulls last;
$$;

create function journal.masthead()
returns table (
  role text,
  full_name_en text,
  full_name_ar text,
  title_en text,
  title_ar text,
  covered_by text
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.qirtas_masthead() $$;

comment on function journal.masthead() is
  'Qirtas''s masthead from the roles held (decisions.md, Qirtas): one row per seat, and each section with no editor of its own, with who covers it (eic, or managing_editor for Games).';

revoke all on function private.qirtas_masthead() from public;
revoke all on function journal.masthead() from public;
grant execute on function private.qirtas_masthead() to anon, authenticated, service_role;
grant execute on function journal.masthead() to anon, authenticated, service_role;
