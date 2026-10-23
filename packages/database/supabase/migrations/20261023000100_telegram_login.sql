-- Linking Telegram with Telegram's own login (OpenID Connect): the member
-- signs in to Telegram from their Nexus profile, apps/api verifies the
-- id_token Telegram returns and links the account here. Signing in to the
-- Nexus stays email only (owner, 2026-10-23); this only links. The bot's
-- one-time codes (core.telegram_redeem_link) stay as the fallback.

-- Like core.telegram_redeem_link without the code: a Telegram account moves
-- to the member who links it last; a member keeps one Telegram account.
create function core.telegram_link_account(
  user_id uuid,
  telegram_id bigint,
  username text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  delete from core.telegram_accounts a
  where a.telegram_id = telegram_link_account.telegram_id
     or a.user_id = telegram_link_account.user_id;
  insert into core.telegram_accounts (user_id, telegram_id, username)
  values (telegram_link_account.user_id, telegram_link_account.telegram_id,
          left(telegram_link_account.username, 64));
end;
$$;

revoke all on function core.telegram_link_account(uuid, bigint, text) from public, anon, authenticated;
grant execute on function core.telegram_link_account(uuid, bigint, text) to service_role;
