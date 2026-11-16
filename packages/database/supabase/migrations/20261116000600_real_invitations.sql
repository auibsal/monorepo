-- An invitation counts at sign-up only if it is real (decisions.md,
-- Members: minors; an invitation belongs to its address). Two checks on
-- auth.users trusted any text in the sign-up's `invitation` field: the
-- minimum age of 13 (20261116000300) and the under-18 rule for class
-- invitations (20261115000200). Both now honor only an invitation that
-- exists, is still usable and, when it names an address, names this one,
-- as accept_partner_invitation already requires when it is redeemed.

create or replace function private.invited_sign_up(email text, meta jsonb, classes boolean default true)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from governance.partner_invitations i
    where i.code = nullif(meta ->> 'invitation', '')
      and private.invitation_usable(i)
      and (i.email is null or i.email = lower(invited_sign_up.email))
      and (classes or i.kind not in ('associate', 'honorary'))
  );
$$;
revoke all on function private.invited_sign_up(text, jsonb, boolean) from public, anon, authenticated;

-- Under 18: an AUIB student's address, or a real invitation that isn't to
-- a class (Associate Members are 18 or older).
create or replace function private.minor_sign_up_allowed(email text, meta jsonb)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(meta ->> 'adult', 'true') <> 'false'
    or private.is_student_address(email)
    or private.invited_sign_up(email, meta, false);
$$;
revoke all on function private.minor_sign_up_allowed(text, jsonb) from public, anon, authenticated;

create or replace function private.refuse_minor_associate_sign_up()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if not private.minor_sign_up_allowed(new.email, meta) then
    raise exception 'minor_associate' using errcode = '42501',
      hint = 'Under 18, sign up with an AUIB student''s address or the invitation you were sent.';
  end if;
  if private.under_minimum_age(meta) and not private.invited_sign_up(new.email, meta) then
    raise exception 'under_minimum_age' using errcode = '42501',
      hint = 'An account is for people 13 or older.';
  end if;
  return new;
end;
$$;
revoke all on function private.refuse_minor_associate_sign_up() from public, anon, authenticated;
