-- Associate Members are 18 or older (the owner, Nov 14, 2026; decisions.md,
-- Members). Under 18, someone joins only as a student with an AUIB
-- student's address, or by an invitation that isn't to a class (a Qalam
-- student's, a guest's).
--
-- 1. The class: no membership is an Associate's while its holder is under
--    18, however it is set (a staff address added, leaving AUIB, a merge,
--    the Director's class change). The step is refused and says why.
-- 2. Sign-up: someone under 18 can't make an account with a faculty or
--    staff AUIB address, with another address and no invitation, or by an
--    invitation to Associate or Honorary membership.

-- ── 1. The class ────────────────────────────────────────────────────────
create function private.no_minor_associate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.tier = 'associate' and private.is_minor(new.user_id) then
    raise exception 'minor_associate' using errcode = '22023',
      hint = 'Associate Members are 18 or older.';
  end if;
  return new;
end;
$$;
revoke all on function private.no_minor_associate() from public, anon, authenticated;

create trigger no_minor_associate
  before insert or update of tier on membership.memberships
  for each row execute function private.no_minor_associate();

-- ── 2. Sign-up ──────────────────────────────────────────────────────────
create function private.minor_sign_up_allowed(email text, meta jsonb)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(meta ->> 'adult', 'true') <> 'false'
    or private.is_student_address(email)
    or exists (
      select 1 from governance.partner_invitations i
      where i.code = nullif(meta ->> 'invitation', '')
        and i.kind not in ('associate', 'honorary')
    );
$$;
revoke all on function private.minor_sign_up_allowed(text, jsonb) from public, anon, authenticated;

create function private.refuse_minor_associate_sign_up()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.minor_sign_up_allowed(new.email, coalesce(new.raw_user_meta_data, '{}'::jsonb)) then
    raise exception 'minor_associate' using errcode = '42501',
      hint = 'Under 18, sign up with an AUIB student''s address or the invitation you were sent.';
  end if;
  return new;
end;
$$;
revoke all on function private.refuse_minor_associate_sign_up() from public, anon, authenticated;

create trigger refuse_minor_associate_sign_up
  before insert on auth.users
  for each row execute function private.refuse_minor_associate_sign_up();
