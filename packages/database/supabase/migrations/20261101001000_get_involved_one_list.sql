-- Owner, Oct 31, 2026: Get involved is one list of every open opportunity,
-- with no sections. The public list (programmes.open_places) now carries
-- the Company's coming auditions beside the roles, Apprenticeships, First
-- Ink, volunteer places and places with partners, soonest first: what
-- closes or happens first leads, then what stays open, newest first.
--
-- An audition is listed while its production is public and auditioning
-- and the audition is still to come: the production's title, what to
-- prepare, the places and the day (closes_at), with The Company's name
-- where a program's would be. Members sign up on /company/auditions.

create or replace function private.open_places()
returns table (
  id uuid, kind text, owner text, title_en text, title_ar text,
  body_en text, body_ar text, skills text[], closes_at timestamptz,
  places integer, term_from date, term_to date, desk journal.desk,
  programme_slug text, programme_name_en text, programme_name_ar text,
  partner_name_en text, partner_name_ar text, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select * from (
    select o.id, o.kind, o.owner, o.title_en, o.title_ar, o.body_en, o.body_ar,
      o.skills, o.closes_at, o.places, o.term_from, o.term_to, o.desk,
      g.slug, g.name_en, g.name_ar, p.name_en, p.name_ar, o.created_at
    from programmes.openings o
    left join core.programmes g on g.id = o.programme_id
    left join governance.partners p on p.id = o.partner_id
    where o.is_open and (o.closes_at is null or o.closes_at > now())
    union all
    select a.id, 'audition', 'program', pr.title_en, pr.title_ar,
      a.prepare_en, a.prepare_ar, '{}'::text[], a.starts_at, a.capacity,
      null, null, null,
      g.slug, g.name_en, g.name_ar, null, null, a.created_at
    from programmes.auditions a
    join programmes.productions pr on pr.id = a.production_id
    left join core.programmes g on g.id = pr.programme_id
    where pr.is_public and pr.stage = 'auditions' and a.starts_at > now()
  ) places
  order by places.closes_at nulls last, places.created_at desc;
$$;
