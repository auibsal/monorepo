-- The Company, activated (decisions.md, What the Society does: the
-- Company; Get involved and roles).
--
-- 1. No rights, no show: a production is shown publicly only once its
--    rights are cleared.
-- 2. The playbill: a public production's credits come from the roles
--    scoped to it (director, stage manager, designers, crew, cast…), named
--    by the display-name function, in the roles' own order.

create function private.production_rights_before_public()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_public and new.rights_status <> 'cleared'
    and (tg_op = 'INSERT' or not old.is_public or new.rights_status is distinct from old.rights_status) then
    raise exception 'rights_not_cleared' using errcode = '23514',
      hint = 'No rights, no show: clear the rights before the production is shown.';
  end if;
  return new;
end;
$$;
revoke all on function private.production_rights_before_public() from public, anon, authenticated;

create trigger production_rights_before_public
  before insert or update of is_public, rights_status on programmes.productions
  for each row execute function private.production_rights_before_public();

create function private.production_playbill(production uuid)
returns table (role_key text, role_en text, role_ar text, role_order integer, name_en text, name_ar text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.key, coalesce(a.title_en, r.name_en), coalesce(a.title_ar, r.name_ar), r.sort,
    p.full_name_en, p.full_name_ar
  from programmes.productions x
  join access.role_assignments a
    on a.scope_type = 'production' and a.scope_id = x.id
  join access.roles r on r.key = a.role
  join core.profiles p on p.id = a.user_id
  where x.id = production_playbill.production
    and x.is_public and x.rights_status = 'cleared'
    and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now() or x.stage = 'closed')
    -- Members under 18 appear only with a parent's consent.
    and not private.is_limited_minor(a.user_id)
  order by r.sort, a.created_at;
$$;

revoke all on function private.production_playbill(uuid) from public;
grant execute on function private.production_playbill(uuid) to anon, authenticated;

create function programmes.production_playbill(production uuid)
returns table (role_key text, role_en text, role_ar text, role_order integer, name_en text, name_ar text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.production_playbill(production) $$;

revoke all on function programmes.production_playbill(uuid) from public;
grant execute on function programmes.production_playbill(uuid) to anon, authenticated;

comment on function programmes.production_playbill(uuid) is
  'A public production''s playbill: everyone holding a role scoped to it, in the roles'' order (decisions.md, the Company).';
