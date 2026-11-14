-- The records made before the ninth to twelfth site prompts, brought to
-- the new standard (the owner, Nov 14, 2026; decisions.md, Members, Qirtas,
-- and Documents and forms).
--
-- 1. Contributors. There are no contributor records or pages: a byline is
--    the writer's short name from the site, a pen name or "Anonymous"
--    (decisions.md, Qirtas). journal.contributors stays only as the link
--    from a piece to its byline, because it keeps a pen name from being
--    traced to its writer (clients never read contributors.user_id).
--    - A member's byline that no piece or credit uses is deleted.
--    - The bios go, and so do the writer's own edits of a byline's name:
--      a member's byline is their short name, kept by the trigger
--      names_to_bylines, and nobody types it.
--    - Every member's byline is set to their short name now.
-- 2. The Code of Conduct is no longer signed: it is accepted with the
--    sign-up line and kept on the account (core.profiles.accepted_versions).
--    Each signed Code of Conduct record becomes that acceptance (its
--    version and the time it was signed) and is then deleted, with its AGR
--    number and check code. The thirteen signed kinds already follow the
--    standard and are kept as they are.

-- ── 1. Contributors ──────────────────────────────────────────────────────
delete from journal.contributors c
where not c.is_pen_name
  and not c.is_anonymous
  and not exists (select 1 from journal.pieces p where p.contributor_id = c.id)
  and not exists (select 1 from journal.piece_credits pc where pc.contributor_id = c.id);

drop function if exists journal.update_my_contributor(uuid, text, text, text, text);
drop function if exists private.update_my_contributor(uuid, text, text, text, text);

drop function if exists journal.my_contributors();
drop function if exists private.my_contributors();

alter table journal.contributors drop column bio_en, drop column bio_ar;

create function private.my_contributors()
returns table (id uuid, slug text, name_en text, name_ar text, is_pen_name boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.slug, c.name_en, c.name_ar, c.is_pen_name
  from journal.contributors c
  where c.user_id = auth.uid()
  order by c.is_pen_name, c.name_en;
$$;
revoke all on function private.my_contributors() from public, anon;
grant execute on function private.my_contributors() to authenticated;

create function journal.my_contributors()
returns table (id uuid, slug text, name_en text, name_ar text, is_pen_name boolean)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_contributors() $$;
revoke all on function journal.my_contributors() from public, anon;
grant execute on function journal.my_contributors() to authenticated;

update journal.contributors c
set name_en = p.full_name_en, name_ar = p.full_name_ar
from core.profiles p
where p.id = c.user_id
  and not c.is_pen_name
  and not c.is_anonymous
  and (c.name_en is distinct from p.full_name_en or c.name_ar is distinct from p.full_name_ar);

-- ── 2. The Code of Conduct, from signed records to the account ───────────
update core.profiles p
set accepted_versions = coalesce(p.accepted_versions, '{}'::jsonb)
  || jsonb_build_object(
    'code_of_conduct', coc.version::text,
    'code_of_conduct_at', coc.signed_at
  )
from (
  select f.submitted_by as person, max(f.form_version) as version, min(f.signed_at) as signed_at
  from governance.form_submissions f
  where f.form_key = 'code-of-conduct' and f.submitted_by is not null
  group by f.submitted_by
) coc
where p.id = coc.person
  and not (coalesce(p.accepted_versions, '{}'::jsonb) ? 'code_of_conduct');

-- membership.pledges and the other links set their reference to null.
delete from governance.form_submissions where form_key = 'code-of-conduct';
