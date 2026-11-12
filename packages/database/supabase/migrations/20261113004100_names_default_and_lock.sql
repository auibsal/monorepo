-- Names (decisions.md, Members: names; the owner, Nov 12, 2026).
--
-- 1. The preferred name is the first and second names (the given and the
--    father's) for everyone, guests and new accounts included, as soon as
--    the legal name has them; the name given at sign-up shows only until
--    then. People still choose their own in Settings.
-- 2. The official (legal) names are locked: once a language's legal name
--    is complete (given, father's and grandfather's names), no part of it
--    changes from the person's own account, an empty family name included;
--    only the Diwan's Membership corrects it (membership.correct_name, with
--    a reason, logged). Until then the person fills only the empty parts,
--    once, at sign-up or at the sign-in that asks for them.

create or replace function private.display_name(p core.profiles, lang text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case lang
    when 'ar' then coalesce(
      p.preferred_name_ar,
      case when private.legal_name_complete(p, 'ar')
        then p.first_name_ar || ' ' || p.father_name_ar end,
      p.signup_name_ar)
    else coalesce(
      p.preferred_name_en,
      case when private.legal_name_complete(p, 'en')
        then p.first_name_en || ' ' || p.father_name_en end,
      p.signup_name_en)
  end
$$;

comment on function private.display_name(core.profiles, text) is
  'The one name shown for a person in a language (decisions.md, Members): the preferred name, else the first and second (given and father''s) names, else the name given at sign-up.';

create or replace function private.legal_name_locked()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') and (
    -- A set part never changes from the account.
       (old.first_name_en is not null and new.first_name_en is distinct from old.first_name_en)
    or (old.father_name_en is not null and new.father_name_en is distinct from old.father_name_en)
    or (old.grandfather_name_en is not null and new.grandfather_name_en is distinct from old.grandfather_name_en)
    or (old.last_name_en is not null and new.last_name_en is distinct from old.last_name_en)
    or (old.first_name_ar is not null and new.first_name_ar is distinct from old.first_name_ar)
    or (old.father_name_ar is not null and new.father_name_ar is distinct from old.father_name_ar)
    or (old.grandfather_name_ar is not null and new.grandfather_name_ar is distinct from old.grandfather_name_ar)
    or (old.last_name_ar is not null and new.last_name_ar is distinct from old.last_name_ar)
    -- Nor, once a language's name is complete, does any part of it.
    or (private.legal_name_complete(old, 'en') and (new.first_name_en, new.father_name_en,
        new.grandfather_name_en, new.last_name_en) is distinct from (old.first_name_en,
        old.father_name_en, old.grandfather_name_en, old.last_name_en))
    or (private.legal_name_complete(old, 'ar') and (new.first_name_ar, new.father_name_ar,
        new.grandfather_name_ar, new.last_name_ar) is distinct from (old.first_name_ar,
        old.father_name_ar, old.grandfather_name_ar, old.last_name_ar))
  ) then
    raise exception 'legal_name_locked' using errcode = '42501',
      hint = 'The official name is corrected only in the Diwan''s Membership.';
  end if;
  return new;
end;
$$;

-- Everyone's name shown now follows the one rule (the names trigger keeps
-- full_name_en and full_name_ar, which every surface reads).
update core.profiles set name_confirmed_at = name_confirmed_at;
