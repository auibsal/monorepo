-- One partner register (owner, 2026-10-25: "the whole partners thing
-- everywhere should be reworked"). Charity campaigns kept their own list of
-- partners (charity.partners); they now name a partner from the register
-- the Diwan's Partners section keeps (governance.partners), like Qirtas calls
-- and productions already do. Any charity partner on record moves into the
-- register first (as a charity, unlisted), and its campaigns follow it.

insert into governance.partners (slug, name_en, name_ar, kind, status, url,
  description_en, description_ar, logo_path, is_listed)
select c.slug, c.name_en, c.name_ar, 'charity', 'active',
  case when c.url ~ '^https://' then c.url end,
  left(c.description_en, 1000), left(c.description_ar, 1000), c.logo_path, false
from charity.partners c
on conflict (slug) do nothing;

alter table charity.campaigns drop constraint campaigns_partner_id_fkey;

update charity.campaigns k
set partner_id = g.id
from charity.partners c
join governance.partners g on g.slug = c.slug
where k.partner_id = c.id;

alter table charity.campaigns
  add constraint campaigns_partner_id_fkey
  foreign key (partner_id) references governance.partners (id) on delete set null;

comment on column charity.campaigns.partner_id is
  'The partner the campaign gives to, from the one register (governance.partners).';

drop table charity.partners;

-- The names of partners on the register, for whoever names one on their
-- own work (a campaign, a call, a production) without managing the register
-- itself: members see active and prospective partners; a partner's guest
-- (a verified affiliation, "Guest of …") sees their own. Names only.
create function private.partner_names()
returns table (id uuid, name_en text, name_ar text, kind text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.name_en, coalesce(p.name_ar, p.name_en), p.kind
  from governance.partners p
  where (private.membership_is_member() and p.status in ('active', 'prospect'))
    or exists (
      select 1 from governance.partner_affiliations a
      where a.partner_id = p.id and a.user_id = (select auth.uid()) and a.status = 'verified'
    )
  order by p.name_en;
$$;

create function governance.partner_names()
returns table (id uuid, name_en text, name_ar text, kind text)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.partner_names() $$;

revoke all on function private.partner_names(), governance.partner_names() from public, anon;
grant execute on function private.partner_names(), governance.partner_names()
  to authenticated, service_role;
