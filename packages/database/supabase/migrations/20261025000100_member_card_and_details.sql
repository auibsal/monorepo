-- The membership card, names in both languages, and what members tell us
-- about themselves.
--
-- 1. Cards. Each member's card carries a number and an unguessable code.
--    The QR on the card is a link, auibsal.org/verify/member/<code>, so any
--    phone camera opens a page that says whether the card stands (name,
--    tier, member since, number). Officers checking people in at an event
--    scan the same code (events.check_in_card). A member may reissue their
--    code, which voids the old one.
-- 2. Names. First and last name, in English and in Arabic. The full names
--    the rest of the platform reads are built from them.
-- 3. Member details (core.member_details): optional facts for the Society's
--    planning and reports. Read only by the member and by members.manage.
--    The research consent says whether the member's answers may be counted
--    in anonymous reports; core.member_insights() counts only those.

-- ── 1. Cards ────────────────────────────────────────────────────────────────

create table membership.cards (
  user_id uuid primary key references auth.users (id) on delete cascade,
  number integer generated always as identity unique,
  code text not null unique default encode(extensions.gen_random_bytes(10), 'hex'),
  issued_at timestamptz not null default now()
);

comment on table membership.cards is
  'One card per member: a number and the code the card''s QR links to. Reached only through functions.';

alter table membership.cards enable row level security;
-- No direct reads or writes: membership.my_card(), membership.verify_card()
-- and events.check_in_card() are the only ways in.
revoke all on membership.cards from anon, authenticated;
grant all on membership.cards to service_role;

create policy "Third-party apps reach only their areas"
  on membership.cards as restrictive for all to authenticated
  using ((select private.client_allows('membership')))
  with check ((select private.client_allows('membership')));

-- Today's members get their numbers in the order they joined.
insert into membership.cards (user_id)
select m.user_id from membership.memberships m
order by m.member_since, m.created_at, m.user_id;

-- New members get their card (and so their number) when they join.
create function private.issue_card()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into membership.cards (user_id) values (new.user_id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function private.issue_card() from public, anon, authenticated;

create trigger issue_card after insert on membership.memberships
  for each row execute function private.issue_card();

-- The member's own card (issued here too, for anyone the trigger missed).
create function private.my_card()
returns table (number integer, code text, issued_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_member((select auth.uid())) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  insert into membership.cards (user_id) values ((select auth.uid()))
  on conflict (user_id) do nothing;
  return query
    select c.number, c.code, c.issued_at
    from membership.cards c where c.user_id = (select auth.uid());
end;
$$;

create function membership.my_card()
returns table (number integer, code text, issued_at timestamptz)
language sql volatile
security invoker
set search_path = ''
as $$ select * from private.my_card() $$;

-- A lost or shared card: a new code, the old link stops working.
create function private.reissue_card()
returns table (number integer, code text, issued_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_member((select auth.uid())) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  insert into membership.cards (user_id) values ((select auth.uid()))
  on conflict (user_id) do update
    set code = encode(extensions.gen_random_bytes(10), 'hex'), issued_at = now();
  return query
    select c.number, c.code, c.issued_at
    from membership.cards c where c.user_id = (select auth.uid());
end;
$$;

create function membership.reissue_card()
returns table (number integer, code text, issued_at timestamptz)
language sql volatile
security invoker
set search_path = ''
as $$ select * from private.reissue_card() $$;

-- What anyone holding the card's link sees: the name on the card and
-- whether the membership stands today. Nothing else about the member.
create function private.verify_card(code text)
returns table (
  number integer, full_name_en text, full_name_ar text,
  tier membership.tier, member_since date, active boolean, voting boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.number, p.full_name_en, p.full_name_ar, m.tier, m.member_since,
    private.is_member(c.user_id), private.is_voting_member(c.user_id)
  from membership.cards c
  join core.profiles p on p.id = c.user_id
  left join membership.memberships m on m.user_id = c.user_id
  where c.code = lower(trim(verify_card.code));
$$;

create function membership.verify_card(code text)
returns table (
  number integer, full_name_en text, full_name_ar text,
  tier membership.tier, member_since date, active boolean, voting boolean
)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.verify_card($1) $$;

-- Check-in by card: the same rules as events.check_in (the caller must be
-- able to check people in at this event; private.check_in says so).
create function private.check_in_card(event_id uuid, card_code text)
returns table (user_id uuid, full_name_en text, full_name_ar text, already boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  holder uuid;
begin
  if not private.can_check_in(check_in_card.event_id) then
    raise exception 'events.checkin is required for this event' using errcode = '42501';
  end if;
  select c.user_id into holder from membership.cards c
  where c.code = lower(trim(check_in_card.card_code));
  if holder is null then
    raise exception 'Card not found' using errcode = 'P0002';
  end if;
  return query select * from private.check_in(check_in_card.event_id, null, holder);
end;
$$;

create function events.check_in_card(event_id uuid, card_code text)
returns table (user_id uuid, full_name_en text, full_name_ar text, already boolean)
language sql volatile
security invoker
set search_path = ''
as $$ select * from private.check_in_card($1, $2) $$;

revoke all on function private.my_card(), private.reissue_card(),
  private.verify_card(text), private.check_in_card(uuid, text) from public, anon;
grant execute on function private.my_card(), private.reissue_card(),
  private.check_in_card(uuid, text) to authenticated, service_role;
grant execute on function private.verify_card(text) to anon, authenticated, service_role;

revoke all on function membership.my_card(), membership.reissue_card(),
  membership.verify_card(text), events.check_in_card(uuid, text) from public;
grant execute on function membership.my_card(), membership.reissue_card(),
  events.check_in_card(uuid, text) to authenticated, service_role;
grant execute on function membership.verify_card(text) to anon, authenticated, service_role;

-- ── 2. Names in both languages ──────────────────────────────────────────────

alter table core.profiles
  add column given_name_en text check (char_length(given_name_en) <= 60),
  add column family_name_en text check (char_length(family_name_en) <= 60),
  add column given_name_ar text check (char_length(given_name_ar) <= 60),
  add column family_name_ar text check (char_length(family_name_ar) <= 60);

comment on column core.profiles.given_name_en is
  'First name in English. With family_name_en it makes full_name_en.';
comment on column core.profiles.given_name_ar is
  'First name in Arabic. With family_name_ar it makes full_name_ar.';

-- The full names follow the parts whenever both parts of a language are
-- given; older rows keep the full names they have.
create function private.profile_full_names()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.given_name_en := nullif(trim(new.given_name_en), '');
  new.family_name_en := nullif(trim(new.family_name_en), '');
  new.given_name_ar := nullif(trim(new.given_name_ar), '');
  new.family_name_ar := nullif(trim(new.family_name_ar), '');
  if new.given_name_en is not null and new.family_name_en is not null then
    new.full_name_en := left(new.given_name_en || ' ' || new.family_name_en, 120);
  end if;
  if new.given_name_ar is not null and new.family_name_ar is not null then
    new.full_name_ar := left(new.given_name_ar || ' ' || new.family_name_ar, 120);
  end if;
  return new;
end;
$$;

create trigger profile_full_names before insert or update on core.profiles
  for each row execute function private.profile_full_names();

grant select (given_name_en, family_name_en, given_name_ar, family_name_ar)
  on core.profiles to authenticated;
grant update (given_name_en, family_name_en, given_name_ar, family_name_ar)
  on core.profiles to authenticated;

-- Sign-up sends the four parts; the full names still arrive from older
-- clients and from invitations.
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
    id, full_name_en, full_name_ar, given_name_en, family_name_en,
    given_name_ar, family_name_ar, locale
  )
  values (
    new.id,
    left(coalesce(meta ->> 'full_name_en', ''), 120),
    nullif(left(coalesce(meta ->> 'full_name_ar', ''), 120), ''),
    left(meta ->> 'given_name_en', 60),
    left(meta ->> 'family_name_en', 60),
    left(meta ->> 'given_name_ar', 60),
    left(meta ->> 'family_name_ar', 60),
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

-- ── 3. Member details ───────────────────────────────────────────────────────

create table core.member_details (
  user_id uuid primary key references auth.users (id) on delete cascade
    default auth.uid(),
  -- Who they are at AUIB.
  affiliation text check (affiliation in ('student', 'alumni', 'faculty', 'staff', 'community')),
  student_id text check (char_length(student_id) <= 20),
  college text check (char_length(college) <= 120),
  major text check (char_length(major) <= 120),
  study_level text check (study_level in ('foundation', 'undergraduate', 'graduate', 'other')),
  graduation_year integer check (graduation_year between 1990 and 2100),
  -- About them.
  birth_year integer check (birth_year between 1930 and 2015),
  gender text check (gender in ('woman', 'man', 'prefer_not')),
  phone text check (phone ~ '^\+?[0-9 ()-]{7,24}$'),
  city text check (char_length(city) <= 80),
  languages text[] not null default '{}'
    check (languages <@ array['ar', 'en', 'ku', 'tr', 'syc', 'fr', 'de', 'other']),
  -- What they would like to do with the Society.
  interests text[] not null default '{}'
    check (interests <@ array['poetry', 'fiction', 'nonfiction', 'theater', 'film',
      'music', 'visual_art', 'photography', 'debate', 'journalism', 'translation',
      'calligraphy', 'reading']),
  skills text[] not null default '{}'
    check (skills <@ array['writing', 'editing', 'translation', 'design', 'photography',
      'video', 'social_media', 'acting', 'directing', 'stage_crew', 'music',
      'organizing', 'web']),
  volunteer boolean not null default false,
  heard_from text check (heard_from in ('friend', 'instagram', 'telegram', 'event',
    'poster', 'class', 'website', 'other')),
  -- Whether these answers may be counted in anonymous reports.
  research_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table core.member_details is
  'Optional facts a member gives about themselves. Read only by the member and by members.manage.';

create trigger set_updated_at before update on core.member_details
  for each row execute function private.set_updated_at();

alter table core.member_details enable row level security;

create policy "Members and member managers read details"
  on core.member_details as permissive for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.has_permission('members.manage'))
  );
create policy "Members add their own details"
  on core.member_details as permissive for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Members update their own details"
  on core.member_details as permissive for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Third-party apps reach only their areas"
  on core.member_details as restrictive for all to authenticated
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));

grant select, insert, update on core.member_details to authenticated;
grant all on core.member_details to service_role;

-- Counts for the Diwan: only members who agreed to be counted, never a
-- row about anyone. Groups smaller than five show as fewer than five.
create function private.member_insights()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not private.has_permission('members.manage') then
    raise exception 'members.manage is required' using errcode = '42501';
  end if;
  with counted as (
    select d.* from core.member_details d
    join membership.memberships m on m.user_id = d.user_id
    where d.research_consent
  ),
  facets as (
    select 'affiliation' as facet, affiliation as value from counted where affiliation is not null
    union all select 'study_level', study_level from counted where study_level is not null
    union all select 'gender', gender from counted where gender is not null
    union all select 'heard_from', heard_from from counted where heard_from is not null
    union all select 'graduation_year', graduation_year::text from counted where graduation_year is not null
    union all select 'interests', unnest(interests) from counted
    union all select 'skills', unnest(skills) from counted
    union all select 'languages', unnest(languages) from counted
  ),
  totals as (
    select facet, value, count(*)::integer as n from facets group by facet, value
  )
  select jsonb_build_object(
    'members', (select count(*) from membership.memberships),
    'answered', (select count(*) from core.member_details d
      join membership.memberships m on m.user_id = d.user_id),
    'counted', (select count(*) from counted),
    'volunteers', (select count(*) from counted where volunteer),
    'facets', coalesce((
      select jsonb_object_agg(facet, items) from (
        select facet, jsonb_agg(
          jsonb_build_object('value', value, 'count', case when n < 5 then null else n end)
          order by n desc, value
        ) as items
        from totals group by facet
      ) f
    ), '{}'::jsonb)
  ) into result;
  return result;
end;
$$;

create function core.member_insights()
returns jsonb
language sql stable
security invoker
set search_path = ''
as $$ select private.member_insights() $$;

revoke all on function private.member_insights() from public, anon;
grant execute on function private.member_insights() to authenticated, service_role;
revoke all on function core.member_insights() from public;
grant execute on function core.member_insights() to authenticated, service_role;
