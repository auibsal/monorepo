-- The live card (owner, 2026-10-25): the card's QR changes every 30
-- seconds, so a screenshot stops working within a minute.
--
-- Each card keeps a secret next to its code. The QR is
-- auibsal.org/verify/member/<code>?t=<8 digits>, where the digits are a
-- TOTP (RFC 6238: HMAC-SHA1, 30-second steps, 8 digits) of the secret.
-- The member's phone computes them from the secret (membership.my_card);
-- Google Wallet computes the same digits from the same secret, so the
-- website card and the Wallet pass show the same live code. The check page
-- and the door accept the current step and one on either side (clock
-- drift); a code without live digits still names the card, but says it is
-- not live, and the door refuses it.

alter table membership.cards
  add column secret bytea not null default extensions.gen_random_bytes(20);

comment on column membership.cards.secret is
  'TOTP key for the live code (RFC 6238, SHA-1, 30 s, 8 digits). Read only by the card''s owner, through membership.my_card().';

-- RFC 4226 HOTP with RFC 6238's 30-second counter: 8 digits.
create function private.totp(secret bytea, step bigint)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  mac bytea := extensions.hmac(int8send(step), secret, 'sha1');
  offset_ integer := get_byte(mac, 19) & 15;
  value bigint;
begin
  value := ((get_byte(mac, offset_) & 127)::bigint << 24)
    | (get_byte(mac, offset_ + 1)::bigint << 16)
    | (get_byte(mac, offset_ + 2)::bigint << 8)
    | get_byte(mac, offset_ + 3)::bigint;
  return lpad((value % 100000000)::text, 8, '0');
end;
$$;

-- Whether digits are live now (this step, or one either side).
create function private.totp_live(secret bytea, digits text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select digits ~ '^[0-9]{8}$' and exists (
    select 1 from generate_series(-1, 1) d
    where private.totp(secret, floor(extract(epoch from now()) / 30)::bigint + d) = digits
  );
$$;

revoke all on function private.totp(bytea, bigint), private.totp_live(bytea, text)
  from public, anon, authenticated;

-- ── The member's card now carries its secret ────────────────────────────────

drop function membership.my_card();
drop function membership.reissue_card();
drop function private.my_card();
drop function private.reissue_card();

create function private.my_card()
returns table (number integer, code text, secret text, issued_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_member((select auth.uid())) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  insert into membership.cards (user_id) values ((select auth.uid()))
  on conflict (user_id) do nothing;
  return query
    select c.number, c.code, encode(c.secret, 'hex'), c.issued_at
    from membership.cards c where c.user_id = (select auth.uid());
end;
$$;

-- A new code and a new secret: every earlier link and Wallet pass stops.
create function private.reissue_card()
returns table (number integer, code text, secret text, issued_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_member((select auth.uid())) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  insert into membership.cards (user_id) values ((select auth.uid()))
  on conflict (user_id) do update
    set code = encode(extensions.gen_random_bytes(10), 'hex'),
        secret = extensions.gen_random_bytes(20),
        issued_at = now();
  return query
    select c.number, c.code, encode(c.secret, 'hex'), c.issued_at
    from membership.cards c where c.user_id = (select auth.uid());
end;
$$;

create function membership.my_card()
returns table (number integer, code text, secret text, issued_at timestamptz)
language sql volatile
security invoker
set search_path = ''
as $$ select * from private.my_card() $$;

create function membership.reissue_card()
returns table (number integer, code text, secret text, issued_at timestamptz)
language sql volatile
security invoker
set search_path = ''
as $$ select * from private.reissue_card() $$;

-- ── The check page: whose card, and whether it is live ──────────────────────

drop function membership.verify_card(text);
drop function private.verify_card(text);

create function private.verify_card(code text, digits text default null)
returns table (
  number integer, full_name_en text, full_name_ar text,
  tier membership.tier, member_since date, active boolean, voting boolean,
  live boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.number, p.full_name_en, p.full_name_ar, m.tier, m.member_since,
    private.is_member(c.user_id), private.is_voting_member(c.user_id),
    coalesce(private.totp_live(c.secret, verify_card.digits), false)
  from membership.cards c
  join core.profiles p on p.id = c.user_id
  left join membership.memberships m on m.user_id = c.user_id
  where c.code = lower(trim(verify_card.code));
$$;

create function membership.verify_card(code text, digits text default null)
returns table (
  number integer, full_name_en text, full_name_ar text,
  tier membership.tier, member_since date, active boolean, voting boolean,
  live boolean
)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.verify_card($1, $2) $$;

-- ── The door: only a live card checks in ────────────────────────────────────

drop function events.check_in_card(uuid, text);
drop function private.check_in_card(uuid, text);

create function private.check_in_card(event_id uuid, card_code text, digits text)
returns table (user_id uuid, full_name_en text, full_name_ar text, already boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  holder membership.cards;
begin
  if not private.can_check_in(check_in_card.event_id) then
    raise exception 'events.checkin is required for this event' using errcode = '42501';
  end if;
  select * into holder from membership.cards c
  where c.code = lower(trim(check_in_card.card_code));
  if not found then
    raise exception 'Card not found' using errcode = 'P0002';
  end if;
  if not coalesce(private.totp_live(holder.secret, check_in_card.digits), false) then
    raise exception 'card_not_live' using errcode = '22023';
  end if;
  return query select * from private.check_in(check_in_card.event_id, null, holder.user_id);
end;
$$;

create function events.check_in_card(event_id uuid, card_code text, digits text)
returns table (user_id uuid, full_name_en text, full_name_ar text, already boolean)
language sql volatile
security invoker
set search_path = ''
as $$ select * from private.check_in_card($1, $2, $3) $$;

revoke all on function private.my_card(), private.reissue_card(),
  private.verify_card(text, text), private.check_in_card(uuid, text, text) from public, anon;
grant execute on function private.my_card(), private.reissue_card(),
  private.check_in_card(uuid, text, text) to authenticated, service_role;
grant execute on function private.verify_card(text, text) to anon, authenticated, service_role;

revoke all on function membership.my_card(), membership.reissue_card(),
  membership.verify_card(text, text), events.check_in_card(uuid, text, text) from public;
grant execute on function membership.my_card(), membership.reissue_card(),
  events.check_in_card(uuid, text, text) to authenticated, service_role;
grant execute on function membership.verify_card(text, text) to anon, authenticated, service_role;

-- ── The Google Wallet pass: the API route reads the card as the member ──────
-- (membership.my_card, under their token), so no new function is needed.
