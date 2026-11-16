-- A minimum age of 13 to make an account oneself (decisions.md, Members:
-- minors; the owner's decision of Nov 16 to follow US practice). The
-- Children's Online Privacy Protection Act reaches children under 13; a
-- sign-up under 13 is refused, so the site never collects a child's data
-- without a parent. An invitation (Qalam, a parent's consent link, a
-- partner's guests) comes with its own consent and is not refused here.
-- Only the month and year are asked, so the 13th birthday is taken as the
-- end of the birth month.

create or replace function private.under_minimum_age(meta jsonb)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  m smallint;
  y smallint;
begin
  if coalesce(meta ->> 'adult', 'true') <> 'false' then
    return false;
  end if;
  begin
    m := nullif(meta ->> 'birth_month', '')::smallint;
    y := nullif(meta ->> 'birth_year', '')::smallint;
  exception when others then
    return false;
  end;
  if m is null or y is null or m not between 1 and 12 or y not between 1900 and 2200 then
    return false;
  end if;
  return make_date(y, m, 1) + interval '13 years 1 month' > now();
end;
$$;
revoke all on function private.under_minimum_age(jsonb) from public, anon, authenticated;

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
  if nullif(meta ->> 'invitation', '') is null and private.under_minimum_age(meta) then
    raise exception 'under_minimum_age' using errcode = '42501',
      hint = 'An account is for people 13 or older.';
  end if;
  return new;
end;
$$;
revoke all on function private.refuse_minor_associate_sign_up() from public, anon, authenticated;
