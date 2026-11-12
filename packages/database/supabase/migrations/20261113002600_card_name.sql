-- The card (decisions.md, Members: the card; fourth prompt, 1): for anyone
-- under 18 the card and its check page show only the first name and last
-- initial; everyone else, the name shown on the site. The class and the
-- role share the card's second line (the app).

create function private.card_name(uid uuid, lang text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.is_minor(p.id) then
      case lang
        when 'ar' then nullif(btrim(concat_ws(' ', p.first_name_ar,
          left(coalesce(p.last_name_ar, p.father_name_ar), 1) || '.')), '.')
        else nullif(btrim(concat_ws(' ', p.first_name_en,
          upper(left(coalesce(p.last_name_en, p.father_name_en), 1)) || '.')), '.')
      end
    else case lang when 'ar' then coalesce(p.full_name_ar, p.full_name_en) else p.full_name_en end
  end
  from core.profiles p where p.id = uid;
$$;

revoke all on function private.card_name(uuid, text) from public, anon, authenticated;

-- The name on the signed-in person's own card.
create function private.my_card_name()
returns table (name_en text, name_ar text)
language sql
stable
security definer
set search_path = ''
as $$
  select private.card_name(auth.uid(), 'en'), private.card_name(auth.uid(), 'ar')
$$;

revoke all on function private.my_card_name() from public, anon;
grant execute on function private.my_card_name() to authenticated;

create function membership.my_card_name()
returns table (name_en text, name_ar text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_card_name() $$;

revoke all on function membership.my_card_name() from public, anon;
grant execute on function membership.my_card_name() to authenticated;

create or replace function private.verify_card(code text, digits text DEFAULT NULL::text)
 RETURNS TABLE(live boolean, number integer, full_name_en text, full_name_ar text, kind text, tier membership.tier, role_en text, role_ar text, since integer, active boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with card as (
    select c.*, coalesce(private.totp_live(c.secret, verify_card.digits), false) as live
    from membership.cards c
    where c.code = lower(trim(verify_card.code))
  )
  select card.live,
    case when card.live then card.number end,
    case when card.live then private.card_name(card.user_id, 'en') end,
    case when card.live then private.card_name(card.user_id, 'ar') end,
    case when card.live then private.membership_kind(card.user_id) end,
    case when card.live and private.membership_kind(card.user_id) = 'member' then m.tier end,
    case when card.live then r.role_en end,
    case when card.live then r.role_ar end,
    case when card.live then private.card_since(card.user_id) end,
    case when card.live then private.membership_kind(card.user_id) is not null end
  from card
  join core.profiles p on p.id = card.user_id
  left join membership.memberships m on m.user_id = card.user_id
  left join private.card_role(card.user_id) r on true;
$function$;
