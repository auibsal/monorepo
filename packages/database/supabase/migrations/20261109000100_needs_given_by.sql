-- Sponsors in kind (decisions §2 and §3): a need can be given by a partner
-- instead of Student Life, and the event page thanks it with "Supported by"
-- and its name or logo only. The partner is picked from the register,
-- never typed.

alter table programmes.needs
  add column given_by uuid references governance.partners (id) on delete set null,
  add constraint needs_given_by_when_provided
    check (given_by is null or status in ('provided', 'partly_provided'));
comment on column programmes.needs.given_by is
  'The partner that gave this need in kind; null when Student Life provided it (decisions §3).';
create index needs_given_by_idx on programmes.needs (given_by);

-- The partners that gave a published event's needs, for its public page:
-- active, listed partners only (the listing is their consent).
create function private.event_sponsors(event_slug text)
returns table (name_en text, name_ar text, slug text, url text, logo_path text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct p.name_en, p.name_ar, p.slug, p.url, p.logo_path
  from events.events e
  join programmes.needs n on n.event_id = e.id
  join governance.partners p on p.id = n.given_by
  where e.slug = event_slug
    and e.status in ('published', 'canceled')
    and not e.members_only
    and n.status in ('provided', 'partly_provided')
    and p.status = 'active'
    and p.is_listed
  order by p.name_en;
$$;
revoke all on function private.event_sponsors(text) from public;
grant execute on function private.event_sponsors(text) to anon, authenticated;

create function events.event_sponsors(event_slug text)
returns table (name_en text, name_ar text, slug text, url text, logo_path text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.event_sponsors(event_slug) $$;
revoke all on function events.event_sponsors(text) from public;
grant execute on function events.event_sponsors(text) to anon, authenticated;
