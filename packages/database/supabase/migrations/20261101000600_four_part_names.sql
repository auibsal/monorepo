-- Names in four parts (owner, Oct 31, 2026, revising "one name per
-- language" the same day): "The name field in English and Arabic should be
-- mandatory as always, both languages, but also made of four parts as
-- their IDs: name, father's name, grandfather's name, fourth/last name.
-- The register, the membership card and other places where names show up
-- show the first and fourth part. Current members are asked to update
-- their name the next time they sign in. This also goes for partners and
-- their members."
--
-- The eight parts are kept on the profile; full_name_en and full_name_ar
-- become the name as shown (first and fourth), kept in step by the
-- database, so every reader of a name (the card, the register, bylines
-- through private.profile_names_to_bylines, certificates) follows without
-- change. Until a member gives the parts, their name stays as it was and
-- the site asks for the parts at sign-in.

alter table core.profiles
  add column first_name_en text check (char_length(first_name_en) <= 60),
  add column father_name_en text check (char_length(father_name_en) <= 60),
  add column grandfather_name_en text check (char_length(grandfather_name_en) <= 60),
  add column last_name_en text check (char_length(last_name_en) <= 60),
  add column first_name_ar text check (char_length(first_name_ar) <= 60),
  add column father_name_ar text check (char_length(father_name_ar) <= 60),
  add column grandfather_name_ar text check (char_length(grandfather_name_ar) <= 60),
  add column last_name_ar text check (char_length(last_name_ar) <= 60);

comment on column core.profiles.full_name_en is
  'The name as shown in English: the first and fourth parts, kept by private.tidy_names once the parts are given.';
comment on column core.profiles.full_name_ar is
  'The name as shown in Arabic: the first and fourth parts, kept by private.tidy_names once the parts are given.';
comment on column core.profiles.first_name_en is
  'Name, father''s, grandfather''s and fourth (last) name, in English and Arabic, as on the person''s papers; all eight required.';

-- Parts are trimmed (an empty part is no part); with all four in a
-- language, the name shown in it is the first and the fourth.
create or replace function private.tidy_names()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.first_name_en := nullif(left(btrim(new.first_name_en), 60), '');
  new.father_name_en := nullif(left(btrim(new.father_name_en), 60), '');
  new.grandfather_name_en := nullif(left(btrim(new.grandfather_name_en), 60), '');
  new.last_name_en := nullif(left(btrim(new.last_name_en), 60), '');
  new.first_name_ar := nullif(left(btrim(new.first_name_ar), 60), '');
  new.father_name_ar := nullif(left(btrim(new.father_name_ar), 60), '');
  new.grandfather_name_ar := nullif(left(btrim(new.grandfather_name_ar), 60), '');
  new.last_name_ar := nullif(left(btrim(new.last_name_ar), 60), '');

  if new.first_name_en is not null and new.father_name_en is not null
    and new.grandfather_name_en is not null and new.last_name_en is not null then
    new.full_name_en := new.first_name_en || ' ' || new.last_name_en;
  end if;
  if new.first_name_ar is not null and new.father_name_ar is not null
    and new.grandfather_name_ar is not null and new.last_name_ar is not null then
    new.full_name_ar := new.first_name_ar || ' ' || new.last_name_ar;
  end if;

  new.full_name_en := left(btrim(coalesce(new.full_name_en, '')), 120);
  new.full_name_ar := nullif(left(btrim(new.full_name_ar), 120), '');
  return new;
end;
$$;

drop trigger tidy_names on core.profiles;
create trigger tidy_names before insert or update of full_name_en, full_name_ar,
  first_name_en, father_name_en, grandfather_name_en, last_name_en,
  first_name_ar, father_name_ar, grandfather_name_ar, last_name_ar
  on core.profiles
  for each row execute function private.tidy_names();

-- The member writes the parts; the name shown follows from them.
revoke update (full_name_en, full_name_ar) on core.profiles from authenticated;
grant update (
  first_name_en, father_name_en, grandfather_name_en, last_name_en,
  first_name_ar, father_name_ar, grandfather_name_ar, last_name_ar
) on core.profiles to authenticated;

-- Sign-up sends the parts for an outside address (an AUIB address gives
-- them at /welcome); a whole name from an older client is still kept.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into core.profiles (
    id, full_name_en, full_name_ar, locale,
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
$$;

-- The parts are the person's own: a father's and grandfather's names are
-- not shown to whoever can read a profile. Their owner reads them here.
create function private.my_name_parts()
returns table (
  first_name_en text, father_name_en text, grandfather_name_en text, last_name_en text,
  first_name_ar text, father_name_ar text, grandfather_name_ar text, last_name_ar text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.first_name_en, p.father_name_en, p.grandfather_name_en, p.last_name_en,
    p.first_name_ar, p.father_name_ar, p.grandfather_name_ar, p.last_name_ar
  from core.profiles p
  where p.id = (select auth.uid());
$$;
revoke all on function private.my_name_parts() from public, anon;
grant execute on function private.my_name_parts() to authenticated;

create function core.my_name_parts()
returns table (
  first_name_en text, father_name_en text, grandfather_name_en text, last_name_en text,
  first_name_ar text, father_name_ar text, grandfather_name_ar text, last_name_ar text
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_name_parts() $$;
revoke all on function core.my_name_parts() from public, anon;
grant execute on function core.my_name_parts() to authenticated;
