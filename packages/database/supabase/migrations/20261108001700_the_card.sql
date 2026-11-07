-- The card (decisions §6, §11): number, name, class or Guest, the current
-- role on a second line while it is held, the year since, and the live QR.
-- The check page shows those fields only for a live code; an old code shows
-- "This code is not current". Google Wallet carries the same fields and is
-- brought up to date when the class or the role changes.

-- ── The second line and the year ─────────────────────────────────────────────

-- The role the card shows while it is held: the highest seat first, then
-- the first held. An event's lead names the event ("Event Lead, Writing
-- workshop"). Null when the person holds none.
create function private.card_role(uid uuid)
returns table (role_en text, role_ar text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(a.title_en, r.name_en)
      || case when e.id is not null then ', ' || e.title_en else '' end,
    coalesce(a.title_ar, r.name_ar)
      || case when e.id is not null then '، ' || e.title_ar else '' end
  from access.role_assignments a
  join access.roles r on r.key = a.role
  left join events.events e on a.scope_type = 'event' and e.id = a.scope_id
  where a.user_id = uid
    and a.starts_at <= now()
    and (a.ends_at is null or a.ends_at > now())
  order by r.is_council desc, r.sort, a.starts_at
  limit 1;
$$;
revoke all on function private.card_role(uuid) from public, anon, authenticated;

-- The year on the card: a Member's member since, a guest's first day, or
-- the account's for a partner's people.
create function private.card_since(uid uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select extract(year from coalesce(
    (select m.member_since::timestamptz from membership.memberships m where m.user_id = uid),
    (select g.created_at from membership.guests g where g.user_id = uid),
    (select p.created_at from core.profiles p where p.id = uid)
  ) at time zone 'Asia/Baghdad')::integer;
$$;
revoke all on function private.card_since(uuid) from public, anon, authenticated;

-- The signed-in person's second line and year, for their card.
create function private.my_card_face()
returns table (role_en text, role_ar text, since integer)
language sql
stable
security definer
set search_path = ''
as $$
  select r.role_en, r.role_ar, private.card_since((select auth.uid()))
  from (select 1) one
  left join private.card_role((select auth.uid())) r on true
  where private.membership_kind((select auth.uid())) is not null;
$$;
revoke all on function private.my_card_face() from public, anon;
grant execute on function private.my_card_face() to authenticated;

create function membership.my_card_face()
returns table (role_en text, role_ar text, since integer)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_card_face() $$;
revoke all on function membership.my_card_face() from public, anon;
grant execute on function membership.my_card_face() to authenticated;

-- What a pass in Google Wallet carries, read by the platform's outbox only.
create function private.wallet_card(uid uuid)
returns table (
  code text, number integer, secret text, full_name_en text, full_name_ar text,
  locale text, kind text, tier membership.tier, role_en text, role_ar text,
  since integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.code, c.number, encode(c.secret, 'hex'), p.full_name_en, p.full_name_ar,
    p.locale, private.membership_kind(uid), m.tier, r.role_en, r.role_ar,
    private.card_since(uid)
  from membership.cards c
  join core.profiles p on p.id = c.user_id
  left join membership.memberships m on m.user_id = c.user_id
  left join private.card_role(uid) r on true
  where c.user_id = uid;
$$;
revoke all on function private.wallet_card(uuid) from public, anon, authenticated;
grant execute on function private.wallet_card(uuid) to service_role;

create function membership.wallet_card(uid uuid)
returns table (
  code text, number integer, secret text, full_name_en text, full_name_ar text,
  locale text, kind text, tier membership.tier, role_en text, role_ar text,
  since integer
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.wallet_card(uid) $$;
revoke all on function membership.wallet_card(uuid) from public, anon, authenticated;
grant execute on function membership.wallet_card(uuid) to service_role;

-- ── The check page: the fields only for a live code ──────────────────────────

drop function membership.verify_card(text, text);
drop function private.verify_card(text, text);

create function private.verify_card(code text, digits text default null)
returns table (
  live boolean, number integer, full_name_en text, full_name_ar text,
  kind text, tier membership.tier, role_en text, role_ar text, since integer,
  active boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with card as (
    select c.*, coalesce(private.totp_live(c.secret, verify_card.digits), false) as live
    from membership.cards c
    where c.code = lower(trim(verify_card.code))
  )
  select card.live,
    case when card.live then card.number end,
    case when card.live then p.full_name_en end,
    case when card.live then p.full_name_ar end,
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
$$;
revoke all on function private.verify_card(text, text) from public;
grant execute on function private.verify_card(text, text) to anon, authenticated, service_role;

create function membership.verify_card(code text, digits text default null)
returns table (
  live boolean, number integer, full_name_en text, full_name_ar text,
  kind text, tier membership.tier, role_en text, role_ar text, since integer,
  active boolean
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.verify_card(code, digits) $$;
revoke all on function membership.verify_card(text, text) from public;
grant execute on function membership.verify_card(text, text) to anon, authenticated, service_role;

-- ── Google Wallet keeps up ───────────────────────────────────────────────────

-- Queue a refresh of the person's saved pass, when they hold one.
create function private.refresh_wallet_pass(uid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from membership.wallet_passes w
    where w.user_id = uid and w.state <> 'expired'
  ) then
    perform private.enqueue('wallet.refresh', jsonb_build_object('user_id', uid));
  end if;
end;
$$;
revoke all on function private.refresh_wallet_pass(uuid) from public, anon, authenticated;

create function private.wallet_follows_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.refresh_wallet_pass(coalesce(new.user_id, old.user_id));
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    perform private.refresh_wallet_pass(old.user_id);
  end if;
  return null;
end;
$$;
revoke all on function private.wallet_follows_role() from public, anon, authenticated;

create trigger wallet_follows_role
  after insert or update or delete on access.role_assignments
  for each row execute function private.wallet_follows_role();

create trigger wallet_follows_class
  after update of tier on membership.memberships
  for each row when (new.tier is distinct from old.tier)
  execute function private.wallet_follows_role();

-- A role that runs out on its date changes no row: once a day, the passes
-- of anyone whose role ended or began since yesterday are refreshed.
create function private.refresh_wallet_passes_for_terms()
returns void
language sql
security definer
set search_path = ''
as $$
  select private.refresh_wallet_pass(u.user_id)
  from (
    select distinct a.user_id from access.role_assignments a
    where (a.ends_at between now() - interval '1 day' and now())
       or (a.starts_at between now() - interval '1 day' and now())
  ) u;
$$;
revoke all on function private.refresh_wallet_passes_for_terms() from public, anon, authenticated;

select cron.schedule('sal-wallet-terms', '20 3 * * *',
  $$ select private.refresh_wallet_passes_for_terms() $$);
