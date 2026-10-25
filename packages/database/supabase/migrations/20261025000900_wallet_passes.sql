-- Google Wallet passes (owner, 2026-10-25): the site keeps track of the
-- passes it has issued, hears from Google when a member saves or removes
-- one, and retires a pass when it stops being good.
--
-- A pass is named after the card code it was issued for
-- (<issuer>.card-<code>). The API route records it when it hands out the
-- "Add to Google Wallet" link; Google's callback (/api/wallet/google/callback)
-- marks it saved or removed. When the code is reset, the membership ends or
-- the account is deleted, a trigger queues membership.wallet_expire and the
-- outbox marks the pass expired in Google Wallet, so it no longer shows as
-- a live card. Written only by the API (service role).

create table membership.wallet_passes (
  code text primary key,
  user_id uuid references auth.users (id) on delete set null,
  state text not null default 'issued'
    check (state in ('issued', 'saved', 'removed', 'expired')),
  -- When Google's latest save or removal message was sent (from its
  -- expiry), so a late delivery never undoes a newer one.
  event_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table membership.wallet_passes is
  'Google Wallet passes issued for membership cards, by card code. Written only by the API; read by the member and members.manage.';

create index wallet_passes_user_id_idx on membership.wallet_passes (user_id);

create trigger set_updated_at before update on membership.wallet_passes
  for each row execute function private.set_updated_at();

alter table membership.wallet_passes enable row level security;

create policy "Members and member managers read Wallet passes"
  on membership.wallet_passes as permissive for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.has_permission('members.manage'))
  );
create policy "Third-party apps reach only their areas"
  on membership.wallet_passes as restrictive for all to authenticated
  using ((select private.client_allows('membership')))
  with check ((select private.client_allows('membership')));

revoke all on membership.wallet_passes from anon, authenticated;
grant select on membership.wallet_passes to authenticated;
grant all on membership.wallet_passes to service_role;

-- ── Retiring passes ─────────────────────────────────────────────────────────

-- Queue the passes for these codes to be marked expired in Google Wallet.
create function private.expire_wallet_codes(codes text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  live text[];
begin
  select array_agg(w.code order by w.code) into live
  from membership.wallet_passes w
  where w.code = any (codes) and w.state <> 'expired';
  if live is not null then
    perform private.enqueue('membership.wallet_expire',
      jsonb_build_object('codes', to_jsonb(live)));
  end if;
end;
$$;

-- Every pass a member holds.
create function private.expire_wallet_passes(uid uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  select private.expire_wallet_codes(array(
    select w.code from membership.wallet_passes w where w.user_id = uid
  ));
$$;

-- A reset card: the pass for the old code goes.
create function private.after_card_code_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.expire_wallet_codes(array[old.code]);
  return new;
end;
$$;

create trigger after_card_code_change after update of code on membership.cards
  for each row when (old.code is distinct from new.code)
  execute function private.after_card_code_change();

-- The membership ends.
create function private.after_membership_end()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.expire_wallet_passes(old.user_id);
  return old;
end;
$$;

create trigger after_membership_end after delete on membership.memberships
  for each row execute function private.after_membership_end();

-- The account is no longer verified (and so no longer a member).
create function private.after_profile_unverified()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.expire_wallet_passes(new.id);
  return new;
end;
$$;

create trigger after_profile_unverified after update of verified_at on core.profiles
  for each row when (old.verified_at is not null and new.verified_at is null)
  execute function private.after_profile_unverified();

-- The account is deleted: the passes lose their owner (on delete set null)
-- and go with it.
create function private.before_wallet_pass_orphaned()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.state <> 'expired' then
    perform private.enqueue('membership.wallet_expire',
      jsonb_build_object('codes', jsonb_build_array(old.code)));
  end if;
  return new;
end;
$$;

create trigger before_wallet_pass_orphaned before update of user_id on membership.wallet_passes
  for each row when (old.user_id is not null and new.user_id is null)
  execute function private.before_wallet_pass_orphaned();

revoke all on function private.expire_wallet_codes(text[]),
  private.expire_wallet_passes(uuid), private.after_card_code_change(),
  private.after_membership_end(), private.after_profile_unverified(),
  private.before_wallet_pass_orphaned()
  from public, anon, authenticated;
