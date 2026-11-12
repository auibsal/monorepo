-- The legal name is locked for every account, including every one that
-- exists now (decisions.md, Members: names; fourth prompt, 3a). A member may
-- fill a part that is still empty (an account whose name is incomplete),
-- never change one that is set; after that it is corrected only in the
-- Diwan by the Director of Membership, with a reason and a second officer
-- (membership.correct_name, governance.pending_actions).
--
-- The "keep or change" step is gone: the default name shows for everyone
-- who has not chosen a preferred one, so every account counts as having
-- seen it.

-- Security invoker: current_user is the caller's role, so a member (as
-- authenticated) is held to it and membership.correct_name (security
-- definer) is not.
create function private.legal_name_locked()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') and (
       (old.first_name_en is not null and new.first_name_en is distinct from old.first_name_en)
    or (old.father_name_en is not null and new.father_name_en is distinct from old.father_name_en)
    or (old.grandfather_name_en is not null and new.grandfather_name_en is distinct from old.grandfather_name_en)
    or (old.last_name_en is not null and new.last_name_en is distinct from old.last_name_en)
    or (old.first_name_ar is not null and new.first_name_ar is distinct from old.first_name_ar)
    or (old.father_name_ar is not null and new.father_name_ar is distinct from old.father_name_ar)
    or (old.grandfather_name_ar is not null and new.grandfather_name_ar is distinct from old.grandfather_name_ar)
    or (old.last_name_ar is not null and new.last_name_ar is distinct from old.last_name_ar)
  ) then
    raise exception 'legal_name_locked' using errcode = '42501',
      hint = 'The Director of Membership corrects a legal name, with a second officer.';
  end if;
  return new;
end;
$$;

revoke all on function private.legal_name_locked() from public, anon, authenticated;

-- The older blanket check (any change once locked_at was set) gives way to
-- this one, so an empty part can still be filled.
create or replace function private.tidy_names()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  legal_changed boolean;
begin
  new.first_name_en := nullif(left(btrim(new.first_name_en), 60), '');
  new.father_name_en := nullif(left(btrim(new.father_name_en), 60), '');
  new.grandfather_name_en := nullif(left(btrim(new.grandfather_name_en), 60), '');
  new.last_name_en := nullif(left(btrim(new.last_name_en), 60), '');
  new.first_name_ar := nullif(left(btrim(new.first_name_ar), 60), '');
  new.father_name_ar := nullif(left(btrim(new.father_name_ar), 60), '');
  new.grandfather_name_ar := nullif(left(btrim(new.grandfather_name_ar), 60), '');
  new.last_name_ar := nullif(left(btrim(new.last_name_ar), 60), '');
  new.preferred_name_en := nullif(left(regexp_replace(btrim(new.preferred_name_en), '\s+', ' ', 'g'), 120), '');
  new.preferred_name_ar := nullif(left(regexp_replace(btrim(new.preferred_name_ar), '\s+', ' ', 'g'), 120), '');

  -- Choosing one's own preferred name is seeing how it appears.
  if new.name_confirmed_at is null
    and (new.preferred_name_en is not null or new.preferred_name_ar is not null)
    and (tg_op = 'INSERT' or new.preferred_name_en is distinct from old.preferred_name_en
      or new.preferred_name_ar is distinct from old.preferred_name_ar) then
    new.name_confirmed_at := now();
  end if;

  if tg_op = 'INSERT' then
    new.signup_name_en := coalesce(nullif(left(btrim(new.signup_name_en), 120), ''),
      nullif(left(btrim(new.full_name_en), 120), ''));
    new.signup_name_ar := coalesce(nullif(left(btrim(new.signup_name_ar), 120), ''),
      nullif(left(btrim(new.full_name_ar), 120), ''));
    legal_changed := false;
  else
    legal_changed := (new.first_name_en, new.father_name_en, new.grandfather_name_en,
        new.last_name_en, new.first_name_ar, new.father_name_ar,
        new.grandfather_name_ar, new.last_name_ar)
      is distinct from (old.first_name_en, old.father_name_en, old.grandfather_name_en,
        old.last_name_en, old.first_name_ar, old.father_name_ar,
        old.grandfather_name_ar, old.last_name_ar);
    -- The lock itself is private.legal_name_locked (Nov 13, 2026): a
    -- member fills an empty part, never changes a set one.
  end if;

  -- Each language in its own script, checked when a value is new.
  if (tg_op = 'INSERT' or new.first_name_en is distinct from old.first_name_en
        or new.father_name_en is distinct from old.father_name_en
        or new.grandfather_name_en is distinct from old.grandfather_name_en
        or new.last_name_en is distinct from old.last_name_en
        or new.preferred_name_en is distinct from old.preferred_name_en)
    and not (private.latin_name(new.first_name_en) and private.latin_name(new.father_name_en)
      and private.latin_name(new.grandfather_name_en) and private.latin_name(new.last_name_en)
      and private.latin_name(new.preferred_name_en)) then
    raise exception 'name_script_en' using errcode = '22023',
      hint = 'English names are written in Latin letters.';
  end if;
  if (tg_op = 'INSERT' or new.first_name_ar is distinct from old.first_name_ar
        or new.father_name_ar is distinct from old.father_name_ar
        or new.grandfather_name_ar is distinct from old.grandfather_name_ar
        or new.last_name_ar is distinct from old.last_name_ar
        or new.preferred_name_ar is distinct from old.preferred_name_ar)
    and not (private.arabic_name(new.first_name_ar) and private.arabic_name(new.father_name_ar)
      and private.arabic_name(new.grandfather_name_ar) and private.arabic_name(new.last_name_ar)
      and private.arabic_name(new.preferred_name_ar)) then
    raise exception 'name_script_ar' using errcode = '22023',
      hint = 'Arabic names are written in Arabic letters.';
  end if;

  new.full_name_en := left(btrim(coalesce(private.display_name(new, 'en'), new.full_name_en, '')), 120);
  new.full_name_ar := nullif(left(btrim(coalesce(private.display_name(new, 'ar'), new.full_name_ar)), 120), '');
  return new;
end;
$function$;

create trigger legal_name_locked
  before update on core.profiles
  for each row execute function private.legal_name_locked();

update core.profiles set legal_name_locked_at = coalesce(legal_name_locked_at, now());
update core.profiles set name_confirmed_at = coalesce(name_confirmed_at, now());

comment on column core.profiles.legal_name_locked_at is
  'When the legal name was locked: every account since Nov 13, 2026 (decisions.md, Members). Only membership.correct_name changes a set part.';

alter table core.profiles alter column legal_name_locked_at set default now();
alter table core.profiles alter column name_confirmed_at set default now();
