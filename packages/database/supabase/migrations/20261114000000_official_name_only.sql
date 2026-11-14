-- Names: the official name only (decisions.md, Members: names; the ninth
-- site prompt, 3).
--
-- 1. The official name's four parts are the only name anyone gives; a
--    person whose papers don't use four names gives the given and family
--    names. It is locked at once, for everyone, complete or not: nobody
--    changes it from their own account; the Director of Membership
--    corrects it (membership.correct_name, with a reason and a second
--    officer).
-- 2. Every other form is built by the site: the short name (given and
--    father's, or given and fourth, the person's one choice in Settings),
--    the first name for greetings, and for anyone under 18 the first name
--    and the father's initial. The typed preferred name is gone.
-- 3. A credited name, set by Media or the Artistic Director, for people on
--    screen or on stage, used only in credits, captions and playbills.
-- 4. Membership lists every account whose parts are incomplete.

-- ── 1. Complete: the given name with the father's and grandfather's, or
--       with the family name for papers that don't use four names. ───────
create or replace function private.legal_name_complete(p core.profiles, lang text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case lang
    when 'ar' then p.first_name_ar is not null and (
      (p.father_name_ar is not null and p.grandfather_name_ar is not null)
      or p.last_name_ar is not null)
    else p.first_name_en is not null and (
      (p.father_name_en is not null and p.grandfather_name_en is not null)
      or p.last_name_en is not null)
  end
$$;

-- ── 2. The short-name choice and the credited name ────────────────────────
alter table core.profiles
  add column short_name text not null default 'father'
    check (short_name in ('father', 'fourth')),
  add column credited_name_en text check (char_length(credited_name_en) between 1 and 80),
  add column credited_name_ar text check (char_length(credited_name_ar) between 1 and 80);

comment on column core.profiles.short_name is
  'The short name the person chose in Settings: the given name with the father''s (the default) or with the fourth name.';
comment on column core.profiles.credited_name_en is
  'A name for people on screen or on stage, set by Media or the Artistic Director, used only in credits, captions and playbills.';

-- The one typed preferred name that was the given and fourth names (the
-- President's) becomes that choice; nothing else carries over.
update core.profiles
set short_name = 'fourth'
where preferred_name_en is not null
  and first_name_en is not null and last_name_en is not null
  and preferred_name_en = first_name_en || ' ' || last_name_en;

-- Every account's name is locked now, complete or not.
update core.profiles set legal_name_locked_at = coalesce(legal_name_locked_at, now());

-- ── 3. The forms the site builds ──────────────────────────────────────────
-- The short name: the choice, falling back to the part there is; under 18,
-- the first name and the father's initial. Before an account has its parts
-- (Membership completes them), the name given at sign-up.
create or replace function private.display_name(p core.profiles, lang text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (case lang when 'ar' then p.first_name_ar else p.first_name_en end) is null
      then case lang when 'ar' then p.signup_name_ar else p.signup_name_en end
    when p.birth_year is not null then
      btrim(concat_ws(' ',
        case lang when 'ar' then p.first_name_ar else p.first_name_en end,
        nullif(left(coalesce(case lang when 'ar' then p.father_name_ar else p.father_name_en end, ''), 1)
          || '.', '.')))
    else btrim(concat_ws(' ',
      case lang when 'ar' then p.first_name_ar else p.first_name_en end,
      case
        when p.short_name = 'fourth' then coalesce(
          case lang when 'ar' then p.last_name_ar else p.last_name_en end,
          case lang when 'ar' then p.father_name_ar else p.father_name_en end)
        else coalesce(
          case lang when 'ar' then p.father_name_ar else p.father_name_en end,
          case lang when 'ar' then p.last_name_ar else p.last_name_en end)
      end))
  end
$$;

-- The full form («الاسم الرباعي»): every part there is, for signature
-- blocks, certificates, service letters and Student Life's lists.
create or replace function private.register_name(uid uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    case when private.legal_name_complete(p, 'en')
      then concat_ws(' ', p.first_name_en, p.father_name_en, p.grandfather_name_en, p.last_name_en) end,
    case when private.legal_name_complete(p, 'ar')
      then concat_ws(' ', p.first_name_ar, p.father_name_ar, p.grandfather_name_ar, p.last_name_ar) end,
    nullif(btrim(p.full_name_en), ''),
    nullif(btrim(p.full_name_ar), ''))
  from core.profiles p where p.id = uid;
$$;

-- Names tidied and checked, the shown short name kept current.
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
  new.credited_name_en := nullif(left(regexp_replace(btrim(new.credited_name_en), '\s+', ' ', 'g'), 80), '');
  new.credited_name_ar := nullif(left(regexp_replace(btrim(new.credited_name_ar), '\s+', ' ', 'g'), 80), '');

  if tg_op = 'INSERT' then
    new.signup_name_en := coalesce(nullif(left(btrim(new.signup_name_en), 120), ''),
      nullif(left(btrim(new.full_name_en), 120), ''));
    new.signup_name_ar := coalesce(nullif(left(btrim(new.signup_name_ar), 120), ''),
      nullif(left(btrim(new.full_name_ar), 120), ''));
  end if;

  if (tg_op = 'INSERT' or new.first_name_en is distinct from old.first_name_en
        or new.father_name_en is distinct from old.father_name_en
        or new.grandfather_name_en is distinct from old.grandfather_name_en
        or new.last_name_en is distinct from old.last_name_en
        or new.credited_name_en is distinct from old.credited_name_en)
    and not (private.latin_name(new.first_name_en) and private.latin_name(new.father_name_en)
      and private.latin_name(new.grandfather_name_en) and private.latin_name(new.last_name_en)
      and private.latin_name(new.credited_name_en)) then
    raise exception 'name_script_en' using errcode = '22023',
      hint = 'English names are written in Latin letters.';
  end if;
  if (tg_op = 'INSERT' or new.first_name_ar is distinct from old.first_name_ar
        or new.father_name_ar is distinct from old.father_name_ar
        or new.grandfather_name_ar is distinct from old.grandfather_name_ar
        or new.last_name_ar is distinct from old.last_name_ar
        or new.credited_name_ar is distinct from old.credited_name_ar)
    and not (private.arabic_name(new.first_name_ar) and private.arabic_name(new.father_name_ar)
      and private.arabic_name(new.grandfather_name_ar) and private.arabic_name(new.last_name_ar)
      and private.arabic_name(new.credited_name_ar)) then
    raise exception 'name_script_ar' using errcode = '22023',
      hint = 'Arabic names are written in Arabic letters.';
  end if;

  new.full_name_en := left(btrim(coalesce(private.display_name(new, 'en'), new.full_name_en, '')), 120);
  new.full_name_ar := nullif(left(btrim(coalesce(private.display_name(new, 'ar'), new.full_name_ar)), 120), '');
  return new;
end;
$$;

-- Locked at once: no part of the official name changes from an account,
-- an empty part included (it is given at sign-up, and Membership completes
-- or corrects it). The short-name choice is the person's own; the credited
-- name is Media's or the Artistic Director's (programmes.set_credited_name).
create or replace function private.legal_name_locked()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') and (
    (new.first_name_en, new.father_name_en, new.grandfather_name_en, new.last_name_en,
     new.first_name_ar, new.father_name_ar, new.grandfather_name_ar, new.last_name_ar)
    is distinct from
    (old.first_name_en, old.father_name_en, old.grandfather_name_en, old.last_name_en,
     old.first_name_ar, old.father_name_ar, old.grandfather_name_ar, old.last_name_ar)
    or (new.credited_name_en, new.credited_name_ar)
      is distinct from (old.credited_name_en, old.credited_name_ar)
  ) then
    raise exception 'legal_name_locked' using errcode = '42501',
      hint = 'The official name is corrected only by Membership.';
  end if;
  return new;
end;
$$;

grant update (short_name) on core.profiles to authenticated;

-- The typed preferred name, and Membership's reset of it, go.
drop function if exists membership.reset_preferred_name(uuid, text);
drop function if exists private.reset_preferred_name(uuid, text);
-- The triggers that watched it watch the short-name choice instead.
drop trigger tidy_names on core.profiles;
drop trigger wallet_follows_name on core.profiles;
alter table core.profiles drop column preferred_name_en, drop column preferred_name_ar;
create trigger tidy_names before insert or update of full_name_en, full_name_ar,
  first_name_en, father_name_en, grandfather_name_en, last_name_en,
  first_name_ar, father_name_ar, grandfather_name_ar, last_name_ar,
  short_name, credited_name_en, credited_name_ar, birth_year,
  signup_name_en, signup_name_ar
  on core.profiles
  for each row execute function private.tidy_names();
create trigger wallet_follows_name
  after update of first_name_en, father_name_en, last_name_en, first_name_ar,
    father_name_ar, last_name_ar, short_name, birth_year
  on core.profiles
  for each row
  when (
    (new.first_name_en, new.father_name_en, new.last_name_en, new.first_name_ar,
      new.father_name_ar, new.last_name_ar, new.short_name, new.birth_year)
    is distinct from
    (old.first_name_en, old.father_name_en, old.last_name_en, old.first_name_ar,
      old.father_name_ar, old.last_name_ar, old.short_name, old.birth_year)
  )
  execute function private.wallet_follows_name();

-- Everyone's shown name follows the one rule now.
update core.profiles set full_name_en = full_name_en;

-- ── 4. The credited name ──────────────────────────────────────────────────
create function private.set_credited_name(member uuid, name_en text, name_ar text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (private.has_permission_anywhere('content.manage')
      or private.has_permission_anywhere('productions.manage')) then
    raise exception 'Only Media or the Artistic Director sets a credited name'
      using errcode = '42501';
  end if;
  update core.profiles
  set credited_name_en = nullif(btrim(coalesce(name_en, '')), ''),
      credited_name_ar = nullif(btrim(coalesce(name_ar, '')), '')
  where id = member;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function private.set_credited_name(uuid, text, text) from public, anon;
grant execute on function private.set_credited_name(uuid, text, text) to authenticated;

create function programmes.set_credited_name(member uuid, name_en text, name_ar text)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.set_credited_name(member, name_en, name_ar) $$;
revoke all on function programmes.set_credited_name(uuid, text, text) from public, anon;
grant execute on function programmes.set_credited_name(uuid, text, text) to authenticated;

-- Who has a credited name, for Media and the Artistic Director.
create function private.credited_names()
returns table (user_id uuid, name_en text, name_ar text, credited_en text, credited_ar text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.has_permission_anywhere('content.manage')
      or private.has_permission_anywhere('productions.manage')) then
    raise exception 'Only Media or the Artistic Director sees credited names'
      using errcode = '42501';
  end if;
  return query
  select p.id, p.full_name_en, p.full_name_ar, p.credited_name_en, p.credited_name_ar
  from core.profiles p
  where p.credited_name_en is not null or p.credited_name_ar is not null
  order by lower(p.full_name_en);
end;
$$;
revoke all on function private.credited_names() from public, anon;
grant execute on function private.credited_names() to authenticated;

create function programmes.credited_names()
returns table (user_id uuid, name_en text, name_ar text, credited_en text, credited_ar text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.credited_names() $$;
revoke all on function programmes.credited_names() from public, anon;
grant execute on function programmes.credited_names() to authenticated;

-- Next Stop's host is credited on screen as "Hassan Sadeq" (decisions.md,
-- Next Stop; set here once for the seat's current holder, as Media would).
update core.profiles
set credited_name_en = 'Hassan Sadeq', credited_name_ar = 'حسن صادق'
where id in (
  select a.user_id from access.role_assignments a
  where a.role = 'next_stop_host'
    and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now())
);

-- Credits name people by their credited name where there is one.
create or replace function private.public_production_credits(production_id uuid)
returns table (department text, role_en text, role_ar text, name_en text, name_ar text, sort integer)
language sql
stable
security definer
set search_path = ''
as $$
  select c.department, c.role_en, c.role_ar,
    coalesce(c.person_name, pr.credited_name_en, pr.full_name_en),
    coalesce(c.person_name, pr.credited_name_ar, pr.full_name_ar, pr.credited_name_en, pr.full_name_en),
    c.sort
  from programmes.production_credits c
  join programmes.productions p on p.id = c.production_id
  left join core.profiles pr on pr.id = c.user_id
  where c.production_id = public_production_credits.production_id
    and p.is_public and p.stage not in ('proposal', 'canceled')
  order by c.department, c.sort, c.created_at;
$$;

-- Every role holder is listed, with no option to hide (decisions.md,
-- Members; under-18s still only with a parent's consent).
drop function if exists programmes.set_credit_visibility(uuid, boolean);
drop function if exists private.set_credit_visibility(uuid, boolean);
drop trigger if exists guard_production_credit on programmes.production_credits;
drop function if exists private.guard_production_credit();
alter table programmes.production_credits drop column show_publicly;

-- ── 5. Incomplete names, for Membership ───────────────────────────────────
create function private.incomplete_names()
returns table (user_id uuid, name_en text, name_ar text, missing_en boolean, missing_ar boolean, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('members.manage') then
    raise exception 'Only Membership sees this list' using errcode = '42501';
  end if;
  return query
  select p.id, p.full_name_en, p.full_name_ar,
    not private.legal_name_complete(p, 'en'), not private.legal_name_complete(p, 'ar'),
    p.created_at
  from core.profiles p
  where not (private.legal_name_complete(p, 'en') and private.legal_name_complete(p, 'ar'))
    and p.deletion_requested_at is null
  order by p.created_at;
end;
$$;
revoke all on function private.incomplete_names() from public, anon;
grant execute on function private.incomplete_names() to authenticated;

create function membership.incomplete_names()
returns table (user_id uuid, name_en text, name_ar text, missing_en boolean, missing_ar boolean, created_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.incomplete_names() $$;
revoke all on function membership.incomplete_names() from public, anon;
grant execute on function membership.incomplete_names() to authenticated;

-- No "keep or change" step and nothing for the member to lock: the name is
-- locked at sign-up.
drop function if exists core.confirm_shown_name();
drop function if exists private.confirm_shown_name();
drop function if exists core.lock_legal_name();
drop function if exists private.lock_legal_name();
alter table core.profiles drop column if exists name_confirmed_at;
