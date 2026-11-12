-- The card follows the name too (decisions.md, Members: the card; the
-- third prompt, §1): a saved Google Wallet pass is refreshed when the name
-- it shows changes, as it already is for a role or a class.

create function private.wallet_follows_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.refresh_wallet_pass(new.id);
  return null;
end;
$$;
revoke all on function private.wallet_follows_name() from public, anon, authenticated;

create trigger wallet_follows_name
  after update of first_name_en, father_name_en, last_name_en, first_name_ar,
    father_name_ar, last_name_ar, preferred_name_en, preferred_name_ar
  on core.profiles
  for each row
  when (
    (new.first_name_en, new.father_name_en, new.last_name_en, new.first_name_ar,
      new.father_name_ar, new.last_name_ar, new.preferred_name_en, new.preferred_name_ar)
    is distinct from
    (old.first_name_en, old.father_name_en, old.last_name_en, old.first_name_ar,
      old.father_name_ar, old.last_name_ar, old.preferred_name_en, old.preferred_name_ar)
  )
  execute function private.wallet_follows_name();
