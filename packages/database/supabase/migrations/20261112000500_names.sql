-- Names as the owner set them (decisions.md, Members: names).
--
-- The legal name is entered in parts, English parts in Latin script and
-- Arabic parts in Arabic script. It is complete with the given name, the
-- father's and the grandfather's (the family name only where there is
-- one). The member checks it and locks it; afterwards only an officer who
-- manages members corrects it, with a reason, logged.
--
-- The preferred name is one whole field per language. Empty means the
-- default: the given and father's names from the legal name in that
-- language or, until that is complete (a guest gives none), the name given
-- at sign-up. One function, private.display_name(), decides the name shown;
-- full_name_en and full_name_ar keep its result, and every surface (the
-- card, profiles, bylines, the Council page, Our people, the masthead,
-- credits, playbills, event lists, greetings and Resend's first name)
-- reads those two columns. Nobody's preferred name is set here.

-- ── 1. The columns ──────────────────────────────────────────────────────────

alter table core.profiles
  add column preferred_name_en text check (char_length(preferred_name_en) <= 120),
  add column preferred_name_ar text check (char_length(preferred_name_ar) <= 120),
  add column signup_name_en text check (char_length(signup_name_en) <= 120),
  add column signup_name_ar text check (char_length(signup_name_ar) <= 120),
  add column legal_name_locked_at timestamptz;

comment on column core.profiles.preferred_name_en is
  'The whole name the person wants shown in English (decisions.md, Members); empty means the default (private.display_name).';
comment on column core.profiles.preferred_name_ar is
  'The whole name the person wants shown in Arabic; empty means the default.';
comment on column core.profiles.signup_name_en is
  'The name given at sign-up: the default until the legal name is complete, and always for a guest.';
comment on column core.profiles.legal_name_locked_at is
  'When the member checked and locked their legal name; afterwards only members.manage corrects it (membership.correct_name).';

-- The name given at sign-up is the name shown today wherever no legal name
-- is complete; for the rest it is only kept in case.
update core.profiles
set signup_name_en = nullif(btrim(full_name_en), ''),
    signup_name_ar = nullif(btrim(full_name_ar), '');

-- Any preferred first or last name, carried over whole (none are set on
-- Nov 11, 2026; this keeps whatever is there by then).
update core.profiles
set preferred_name_en = case
      when coalesce(preferred_first_en, preferred_last_en) is not null
      then nullif(btrim(concat_ws(' ', coalesce(preferred_first_en, first_name_en),
        coalesce(preferred_last_en, last_name_en))), '')
    end,
    preferred_name_ar = case
      when coalesce(preferred_first_ar, preferred_last_ar) is not null
      then nullif(btrim(concat_ws(' ', coalesce(preferred_first_ar, first_name_ar),
        coalesce(preferred_last_ar, last_name_ar))), '')
    end
where coalesce(preferred_first_en, preferred_last_en, preferred_first_ar, preferred_last_ar) is not null;

-- ── 2. Scripts ──────────────────────────────────────────────────────────────

-- English names in Latin letters (with accents, apostrophes, hyphens and
-- dots); Arabic names in Arabic letters (with harakat and tatweel), no digits.
create function private.latin_name(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value is null or value ~ '^[A-Za-zÀ-ÖØ-öø-ɏḀ-ỿ''’. -]+$'
$$;

create function private.arabic_name(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value is null or value ~ '^[ء-ٰٟ-ۓۺ-ۿ ]+$'
$$;

-- ── 3. The one display-name function ────────────────────────────────────────

create function private.legal_name_complete(p core.profiles, lang text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case lang
    when 'ar' then p.first_name_ar is not null and p.father_name_ar is not null
      and p.grandfather_name_ar is not null
    else p.first_name_en is not null and p.father_name_en is not null
      and p.grandfather_name_en is not null
  end
$$;

create function private.display_name(p core.profiles, lang text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  -- A guest (or a partner's person) is shown by the name given at sign-up.
  with q as (select private.is_guest(p.id) as guest)
  select case lang
    when 'ar' then coalesce(
      p.preferred_name_ar,
      case when not q.guest and private.legal_name_complete(p, 'ar')
        then p.first_name_ar || ' ' || p.father_name_ar end,
      p.signup_name_ar)
    else coalesce(
      p.preferred_name_en,
      case when not q.guest and private.legal_name_complete(p, 'en')
        then p.first_name_en || ' ' || p.father_name_en end,
      p.signup_name_en)
  end
  from q
$$;

-- The name trigger runs as the person saving (so the lock knows who it is):
-- they may call the name helpers, and display_name reads guest status.
grant execute on function private.latin_name(text), private.arabic_name(text),
  private.legal_name_complete(core.profiles, text), private.display_name(core.profiles, text)
  to authenticated, service_role;

comment on function private.display_name(core.profiles, text) is
  'The one name shown for a person in a language (decisions.md, Members): the preferred name, else the given and father''s names, else the name given at sign-up.';

-- ── 4. The trigger: tidy, check, lock, then the name shown ──────────────────

drop trigger tidy_names on core.profiles;

create or replace function private.tidy_names()
returns trigger
language plpgsql
set search_path = ''
as $$
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
    -- A locked legal name changes only through membership.correct_name
    -- (a SECURITY DEFINER function, so not as the member's own role).
    if legal_changed and old.legal_name_locked_at is not null
      and current_user in ('authenticated', 'anon') then
      raise exception 'legal_name_locked' using errcode = '42501',
        hint = 'The Director of Membership corrects a locked legal name.';
    end if;
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
$$;

alter table core.profiles
  drop column preferred_first_en,
  drop column preferred_last_en,
  drop column preferred_first_ar,
  drop column preferred_last_ar;

create trigger tidy_names before insert or update of full_name_en, full_name_ar,
  first_name_en, father_name_en, grandfather_name_en, last_name_en,
  first_name_ar, father_name_ar, grandfather_name_ar, last_name_ar,
  preferred_name_en, preferred_name_ar, signup_name_en, signup_name_ar
  on core.profiles
  for each row execute function private.tidy_names();

grant select (preferred_name_en, preferred_name_ar, legal_name_locked_at),
  update (preferred_name_en, preferred_name_ar)
  on core.profiles to authenticated;

-- The name shown follows the new rule now (no preferred name is set, so
-- this is the default for everyone; the existing scripts are not checked).
alter table core.profiles disable trigger tidy_names;
update core.profiles p
set full_name_en = left(btrim(coalesce(private.display_name(p, 'en'), p.full_name_en, '')), 120),
    full_name_ar = nullif(left(btrim(coalesce(private.display_name(p, 'ar'), p.full_name_ar)), 120), '');
alter table core.profiles enable trigger tidy_names;

-- ── 5. The member locks their legal name ────────────────────────────────────

create function private.lock_legal_name()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  me core.profiles;
begin
  select * into me from core.profiles where id = (select auth.uid()) for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if me.legal_name_locked_at is not null then
    return me.legal_name_locked_at;
  end if;
  if not (private.legal_name_complete(me, 'en') and private.legal_name_complete(me, 'ar')) then
    raise exception 'legal_name_incomplete' using errcode = '22023',
      hint = 'The given, father''s and grandfather''s names, in English and in Arabic.';
  end if;
  update core.profiles set legal_name_locked_at = now()
  where id = me.id
  returning legal_name_locked_at into me.legal_name_locked_at;
  return me.legal_name_locked_at;
end;
$$;

revoke all on function private.lock_legal_name() from public, anon;
grant execute on function private.lock_legal_name() to authenticated;

create function core.lock_legal_name()
returns timestamptz
language sql
security invoker
set search_path = ''
as $$ select private.lock_legal_name() $$;

revoke all on function core.lock_legal_name() from public, anon;
grant execute on function core.lock_legal_name() to authenticated;

comment on function core.lock_legal_name() is
  'The member confirms their complete legal name; it can no longer be changed from their account.';

-- ── 6. Corrections and resets by members.manage, with a reason ──────────────

drop function membership.correct_name(uuid, text, text, text, text, text, text, text, text);
drop function private.correct_member_name(uuid, text, text, text, text, text, text, text, text);

create function private.log_name_change(member uuid, kind text, reason text, fields text[])
returns void
language sql
security definer
set search_path = ''
as $$
  insert into core.activity_log
    (table_schema, table_name, operation, row_id, actor_id, old_row, new_row, changed)
  values ('core', 'profiles', 'UPDATE', member::text, auth.uid(),
    jsonb_build_object('user_id', member),
    jsonb_build_object('user_id', member, 'kind', kind, 'reason', reason),
    fields);
$$;

revoke all on function private.log_name_change(uuid, text, text, text[]) from public, anon, authenticated;

create function private.correct_member_name(
  member uuid,
  first_en text, father_en text, grandfather_en text, last_en text,
  first_ar text, father_ar text, grandfather_ar text, last_ar text,
  reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  required text[] := array[first_en, father_en, grandfather_en, first_ar, father_ar, grandfather_ar];
  part text;
  before core.profiles;
  after core.profiles;
begin
  if not private.has_permission('members.manage') then
    raise exception 'Only an officer who manages members corrects a name'
      using errcode = '42501';
  end if;
  if reason is null or char_length(btrim(reason)) < 3 then
    raise exception 'reason_required' using errcode = '22023';
  end if;
  foreach part in array required loop
    if part is null or btrim(part) = '' then
      raise exception 'name_parts_required' using errcode = '22023',
        hint = 'The given, father''s and grandfather''s names, in English and in Arabic.';
    end if;
  end loop;

  select * into before from core.profiles where id = member for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  update core.profiles
  set first_name_en = first_en,
      father_name_en = father_en,
      grandfather_name_en = grandfather_en,
      last_name_en = last_en,
      first_name_ar = first_ar,
      father_name_ar = father_ar,
      grandfather_name_ar = grandfather_ar,
      last_name_ar = last_ar
  where id = member
  returning * into after;

  perform private.log_name_change(member, 'legal_name', btrim(left(reason, 300)), (
    select coalesce(array_agg(k order by k), '{}')
    from jsonb_each(to_jsonb(after)) as a(k, v)
    where k like '%\_name\_%' escape '\'
      and k not like 'full\_name%' escape '\'
      and k not like 'preferred\_name%' escape '\'
      and k not like 'signup\_name%' escape '\'
      and (to_jsonb(before) -> k) is distinct from v
  ));
end;
$$;

revoke all on function private.correct_member_name(uuid, text, text, text, text, text, text, text, text, text)
  from public, anon;
grant execute on function private.correct_member_name(uuid, text, text, text, text, text, text, text, text, text)
  to authenticated;

create function membership.correct_name(
  member uuid,
  first_en text, father_en text, grandfather_en text, last_en text,
  first_ar text, father_ar text, grandfather_ar text, last_ar text,
  reason text
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.correct_member_name(member, first_en, father_en, grandfather_en, last_en,
    first_ar, father_ar, grandfather_ar, last_ar, reason)
$$;

revoke all on function membership.correct_name(uuid, text, text, text, text, text, text, text, text, text)
  from public, anon;
grant execute on function membership.correct_name(uuid, text, text, text, text, text, text, text, text, text)
  to authenticated;

comment on function membership.correct_name(uuid, text, text, text, text, text, text, text, text, text) is
  'An officer who manages members corrects a member''s legal name to their papers, with a reason; logged without the names.';

create function private.reset_preferred_name(member uuid, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('members.manage') then
    raise exception 'Only an officer who manages members resets a name'
      using errcode = '42501';
  end if;
  if reason is null or char_length(btrim(reason)) < 3 then
    raise exception 'reason_required' using errcode = '22023';
  end if;
  update core.profiles
  set preferred_name_en = null, preferred_name_ar = null
  where id = member;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  perform private.log_name_change(member, 'preferred_name', btrim(left(reason, 300)),
    array['preferred_name_ar', 'preferred_name_en']);
end;
$$;

revoke all on function private.reset_preferred_name(uuid, text) from public, anon;
grant execute on function private.reset_preferred_name(uuid, text) to authenticated;

create function membership.reset_preferred_name(member uuid, reason text)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.reset_preferred_name(member, reason) $$;

revoke all on function membership.reset_preferred_name(uuid, text) from public, anon;
grant execute on function membership.reset_preferred_name(uuid, text) to authenticated;

comment on function membership.reset_preferred_name(uuid, text) is
  'An officer who manages members resets a preferred name that misleads or offends, with a reason; logged.';

-- The member reads whether their legal name is locked with their parts.
drop function core.my_name_parts();
drop function private.my_name_parts();

create function private.my_name_parts()
returns table (
  first_name_en text, father_name_en text, grandfather_name_en text, last_name_en text,
  first_name_ar text, father_name_ar text, grandfather_name_ar text, last_name_ar text,
  legal_name_locked_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.first_name_en, p.father_name_en, p.grandfather_name_en, p.last_name_en,
    p.first_name_ar, p.father_name_ar, p.grandfather_name_ar, p.last_name_ar,
    p.legal_name_locked_at
  from core.profiles p
  where p.id = (select auth.uid());
$$;
revoke all on function private.my_name_parts() from public, anon;
grant execute on function private.my_name_parts() to authenticated;

create function core.my_name_parts()
returns table (
  first_name_en text, father_name_en text, grandfather_name_en text, last_name_en text,
  first_name_ar text, father_name_ar text, grandfather_name_ar text, last_name_ar text,
  legal_name_locked_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_name_parts() $$;
revoke all on function core.my_name_parts() from public, anon;
grant execute on function core.my_name_parts() to authenticated;

-- The Six Words wall: the first name and last initial of the name shown
-- (decisions.md, Six Words), or that whole name when the writer chooses.
create or replace function private.six_words_wall(max_results integer default 200)
returns table (id uuid, text text, language text, author_en text, author_ar text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select w.id, w.text, w.language,
    case when not w.show_name then null
      when w.show_full_name then p.full_name_en
      else private.wall_name(null, null, p.full_name_en) end,
    case when not w.show_name then null
      when w.show_full_name then p.full_name_ar
      else private.wall_name(null, null, p.full_name_ar) end,
    w.created_at
  from programmes.six_words w
  join core.profiles p on p.id = w.user_id
  where w.visibility = 'tour' and w.publishable and w.text is not null
    -- A writer under 18 stays off the wall until a parent consents.
    and not private.is_limited_minor(w.user_id)
  order by w.created_at desc
  limit least(greatest(max_results, 1), 500);
$$;
