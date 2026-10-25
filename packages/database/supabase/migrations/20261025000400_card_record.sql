-- One check for cards and certificates (owner, 2026-10-25): a card's check
-- page can also list the member's certificates (Fellowship, service,
-- productions…), each linking to its own check. Off by default: anyone
-- holding the card's link would see the record, so the member turns it on
-- (Card security on /account). Each certificate stays checkable by its own
-- code either way.

alter table core.profiles
  add column show_certificates_on_card boolean not null default false;

comment on column core.profiles.show_certificates_on_card is
  'Whether the card''s public check page lists the member''s certificates. The member''s choice; off by default.';

grant select (show_certificates_on_card) on core.profiles to authenticated;
grant update (show_certificates_on_card) on core.profiles to authenticated;

-- The certificates a card's check page shows: issued or revoked ones, and
-- only when the card's owner has said so.
create function private.card_record(code text)
returns table (
  kind text, serial text, verification_code text, status text,
  role_en text, role_ar text, issued_at timestamptz, revoked_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.kind, c.serial, c.verification_code, c.status,
    c.role_en, c.role_ar, c.issued_at, c.revoked_at
  from membership.cards card
  join core.profiles p on p.id = card.user_id and p.show_certificates_on_card
  join membership.certificates c on c.user_id = card.user_id
  where card.code = lower(trim(card_record.code))
    and c.status in ('issued', 'revoked')
  order by c.issued_at desc;
$$;

create function membership.card_record(code text)
returns table (
  kind text, serial text, verification_code text, status text,
  role_en text, role_ar text, issued_at timestamptz, revoked_at timestamptz
)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.card_record($1) $$;

revoke all on function private.card_record(text) from public;
grant execute on function private.card_record(text) to anon, authenticated, service_role;
revoke all on function membership.card_record(text) from public;
grant execute on function membership.card_record(text) to anon, authenticated, service_role;
