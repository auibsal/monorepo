-- Signing in never says whether an address has an account (audit A6; OWASP
-- ASVS 2.2.2, NIST SP 800-63B). The check behind /api/sign-in/known goes.
drop function core.account_exists(text);
drop function private.account_exists(text);

-- Sign-up refuses an address with the AUIB domain typed into the local part
-- ("name.123auib.edu.iq@auib.edu.iq", seven accounts on Nov 7) or with more
-- than one "@" (audit A5). The site's field already keeps only the local
-- part; this is the guard behind it, for every way an account is made.
create function private.refuse_malformed_address()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.email is not null and (
    new.email ~* 'auib\.edu\.iq@'
    or new.email ~ '@.*@'
  ) then
    raise exception using errcode = '22023', message = 'malformed_address',
      hint = 'Type only what comes before @auib.edu.iq.';
  end if;
  return new;
end;
$$;

revoke all on function private.refuse_malformed_address() from public, anon, authenticated;

create trigger refuse_malformed_address
  before insert or update of email on auth.users
  for each row execute function private.refuse_malformed_address();
