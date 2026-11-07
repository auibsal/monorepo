-- Accounts (decisions §11, the audit's C6).
--
-- 1. Agreeing at sign-up: the person says they are 18 or older and agree
--    to the Terms of Use and the Privacy Notice; the account records when.
-- 2. AUIB sign-in addresses are the university's identifier for the
--    person: they are not changed from the account (a personal email is
--    added beside them instead, core.request_personal_email).

-- ── 1. The agreement ─────────────────────────────────────────────────────────

alter table core.profiles add column agreed_at timestamptz;
comment on column core.profiles.agreed_at is
  'When the person confirmed at sign-up that they are 18 or older and agree to the Terms of Use and the Privacy Notice (decisions §11).';
grant select (agreed_at) on core.profiles to authenticated;

CREATE OR REPLACE FUNCTION private.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if current_user = 'supabase_auth_admin' and not private.sign_up_allowed(new.email, meta) then
    raise exception 'auib_address_required' using errcode = '42501';
  end if;

  insert into core.profiles (
    id, full_name_en, full_name_ar, locale, agreed_at,
    first_name_en, father_name_en, grandfather_name_en, last_name_en,
    first_name_ar, father_name_ar, grandfather_name_ar, last_name_ar
  )
  values (
    new.id,
    left(btrim(coalesce(nullif(meta ->> 'full_name_en', ''),
      concat_ws(' ', meta ->> 'first_name_en', meta ->> 'last_name_en'))), 120),
    nullif(left(btrim(coalesce(nullif(meta ->> 'full_name_ar', ''),
      concat_ws(' ', meta ->> 'first_name_ar', meta ->> 'last_name_ar'))), 120), ''),
    case when meta ->> 'locale' = 'ar' then 'ar' else 'en' end,
    -- Agreed at sign-up (decisions §11): the time is the database's.
    case when meta ? 'agreed_at' then now() end,
    meta ->> 'first_name_en', meta ->> 'father_name_en',
    meta ->> 'grandfather_name_en', meta ->> 'last_name_en',
    meta ->> 'first_name_ar', meta ->> 'father_name_ar',
    meta ->> 'grandfather_name_ar', meta ->> 'last_name_ar'
  )
  on conflict (id) do nothing;

  if private.is_auib_email(new.email) and new.email_confirmed_at is not null then
    perform private.verify_user(new.id);
  end if;

  return new;
end;
$function$;

-- ── 2. AUIB addresses stay ───────────────────────────────────────────────────

create function private.keep_auib_address()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_auib_email(old.email)
    and coalesce(current_setting('sal.allow_email_change', true), '') <> 'on'
    and (
      new.email is distinct from old.email
      or (coalesce(new.email_change, '') <> '' and new.email_change is distinct from old.email_change)
    )
  then
    raise exception 'auib_address_locked' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.keep_auib_address() from public, anon, authenticated;
comment on function private.keep_auib_address() is
  'An AUIB sign-in address is not changed from the account (decisions §11). The owner may, in a transaction, set local sal.allow_email_change = ''on''.';

create trigger keep_auib_address
  before update of email, email_change on auth.users
  for each row execute function private.keep_auib_address();
