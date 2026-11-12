-- Certificates in the recipient's language (the fourth prompt, 7h): a
-- certificate made for an account takes that account's language (set at
-- sign-up, changed in Settings); its page also shows the other edition.
create function private.certificate_language()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null then
    select case when p.locale = 'ar' then 'ar' else 'en' end into new.lang
    from core.profiles p where p.id = new.user_id;
    new.lang := coalesce(new.lang, 'en');
  end if;
  return new;
end;
$$;
revoke all on function private.certificate_language() from public, anon, authenticated;

create trigger certificate_language
  before insert on membership.certificates
  for each row execute function private.certificate_language();

comment on column membership.certificates.lang is
  'The certificate''s language: its recipient''s account language when it is made for an account (7h); the page also shows the other edition.';
