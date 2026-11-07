-- The Company's performances are events (audit C8, decisions §1): a
-- production's partners are the partners its performances are held with
-- (events.events.partner_id, Notion's Host), each with the event's partner
-- checklist. The separate production partner list goes (empty in
-- production).

create or replace function private.public_production_partners(production_id uuid)
returns table (name_en text, name_ar text, url text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct pa.name_en, pa.name_ar, pa.url
  from programmes.production_events pe
  join programmes.productions p on p.id = pe.production_id
  join events.events e on e.id = pe.event_id
  join governance.partners pa on pa.id = e.partner_id
  where pe.production_id = public_production_partners.production_id
    and p.is_public
    and e.status in ('published', 'cancelled')
    and pa.is_listed and pa.status = 'active'
  order by pa.name_en;
$$;

drop function programmes.production_partner_choices();
drop function private.production_partner_choices();
drop table programmes.production_partners;
