-- One name per language (owner, Oct 31, 2026): a member gives their name in
-- English and their name in Arabic, each whole, and nothing else. The four
-- parts (first and last name in each language) go; the full names already
-- made from them stay.

drop trigger profile_full_names on core.profiles;
drop function private.profile_full_names();

-- Names given as parts but never joined (one part missing) are joined now.
update core.profiles
set full_name_en = left(btrim(coalesce(given_name_en, '') || ' ' || coalesce(family_name_en, '')), 120)
where coalesce(full_name_en, '') = '' and (given_name_en is not null or family_name_en is not null);
update core.profiles
set full_name_ar = left(btrim(coalesce(given_name_ar, '') || ' ' || coalesce(family_name_ar, '')), 120)
where full_name_ar is null and (given_name_ar is not null or family_name_ar is not null);

-- Sign-up sends the two names; an older client may still send parts.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into core.profiles (id, full_name_en, full_name_ar, locale)
  values (
    new.id,
    left(btrim(coalesce(
      nullif(meta ->> 'full_name_en', ''),
      concat_ws(' ', meta ->> 'given_name_en', meta ->> 'family_name_en')
    )), 120),
    nullif(left(btrim(coalesce(
      nullif(meta ->> 'full_name_ar', ''),
      concat_ws(' ', meta ->> 'given_name_ar', meta ->> 'family_name_ar')
    )), 120), ''),
    case when meta ->> 'locale' = 'ar' then 'ar' else 'en' end
  )
  on conflict (id) do nothing;

  if private.is_auib_email(new.email) then
    if new.email_confirmed_at is not null then
      perform private.verify_user(new.id);
    end if;
  elsif new.email is not null then
    insert into membership.verification_requests (user_id, email, statement)
    values (
      new.id,
      lower(new.email),
      left(meta ->> 'verification_statement', 1000)
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

alter table core.profiles
  drop column given_name_en,
  drop column family_name_en,
  drop column given_name_ar,
  drop column family_name_ar;

-- Names are trimmed; an empty Arabic name is no name.
create function private.tidy_names()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.full_name_en := left(btrim(coalesce(new.full_name_en, '')), 120);
  new.full_name_ar := nullif(left(btrim(new.full_name_ar), 120), '');
  return new;
end;
$$;

create trigger tidy_names before insert or update of full_name_en, full_name_ar
  on core.profiles
  for each row execute function private.tidy_names();
