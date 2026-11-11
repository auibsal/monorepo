-- Accounts and privacy after the Nov 9 audit (decisions §10, §18).
--
-- 1. Sign-up records one acknowledgment, the Code of Conduct (the
--    'member' pledge); the human-authorship pledge belongs to each Write
--    for Qirtas submission, so the members' extra pledges are removed.
-- 2. The retired "insights" (core.member_details) are deleted, with the
--    report built on them.
-- 3. Names are never required to be unique; a preferred first and last
--    name shows wherever the site shows a name, and the legal name only on
--    certificates, letters, signed forms, minutes and Student Life lists.
-- 4. The Six Words wall shows the first name and last initial unless the
--    writer chooses the full name.
-- 5. Students under 18 join: the month and year of birth, kept only to
--    lift the minors' rules at 18, and a parent's consent (F-46) signed
--    through a single-use link sent once the account is confirmed.
-- 6. F-44 is retired and never reused; the roles that are neither one of
--    the nine seats nor a manual's team role are removed.

-- ── 1. One acknowledgment ───────────────────────────────────────────────────

create or replace function private.has_current_pledges(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from membership.pledges pl
    where pl.user_id = uid
      and pl.pledge_type = 'member'
      and pl.version = membership.current_pledge_version('member')
  );
$$;

create or replace function private.my_status()
returns table (
  is_member boolean,
  verified boolean,
  tier membership.tier,
  member_since date,
  activities integer,
  voting_member boolean,
  pending_pledges membership.pledge_type[],
  in_directory boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    membership.is_member(),
    exists (select 1 from core.profiles p where p.id = auth.uid() and p.verified_at is not null),
    (select m.tier from membership.memberships m where m.user_id = auth.uid()),
    (select m.member_since from membership.memberships m where m.user_id = auth.uid()),
    private.activity_count(auth.uid()),
    private.is_voting_member(auth.uid()),
    array(
      select 'member'::membership.pledge_type
      where not exists (
        select 1 from membership.pledges pl
        where pl.user_id = auth.uid()
          and pl.pledge_type = 'member'
          and pl.version = membership.current_pledge_version('member')
      )
    ),
    coalesce((select m.in_directory from membership.memberships m where m.user_id = auth.uid()), false);
$$;

delete from membership.pledges where pledge_type = 'human_authorship';

update core.settings
set description = 'The Code of Conduct acknowledgment members make at sign-up (decisions §10).'
where key = 'pledges.member.version';

update core.settings
set description = 'Retired: authorship is confirmed with each Write for Qirtas submission (SAL-EDT-01).'
where key = 'pledges.human_authorship.version';

-- ── 2. No insights ──────────────────────────────────────────────────────────

drop function if exists core.member_insights();
drop function if exists private.member_insights();
drop table if exists core.member_details;

-- ── 3. Names ────────────────────────────────────────────────────────────────

drop trigger if exists one_person_one_name on core.profiles;
drop function if exists private.one_person_one_name();

alter table core.profiles
  add column preferred_first_en text check (char_length(preferred_first_en) <= 60),
  add column preferred_last_en text check (char_length(preferred_last_en) <= 60),
  add column preferred_first_ar text check (char_length(preferred_first_ar) <= 60),
  add column preferred_last_ar text check (char_length(preferred_last_ar) <= 60);

-- The displayed name is rebuilt when a preferred name changes too.
drop trigger tidy_names on core.profiles;
create trigger tidy_names before insert or update of full_name_en, full_name_ar,
  first_name_en, father_name_en, grandfather_name_en, last_name_en,
  first_name_ar, father_name_ar, grandfather_name_ar, last_name_ar,
  preferred_first_en, preferred_last_en, preferred_first_ar, preferred_last_ar
  on core.profiles
  for each row execute function private.tidy_names();

grant select (preferred_first_en, preferred_last_en, preferred_first_ar, preferred_last_ar),
  update (preferred_first_en, preferred_last_en, preferred_first_ar, preferred_last_ar)
  on core.profiles to authenticated;

comment on column core.profiles.preferred_first_en is
  'The name the person goes by (decisions §10, Names); empty means the legal first name. full_name_* is built from it.';

-- The displayed name (full_name_*) is the preferred first and last name,
-- each falling back to the legal one.
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
  new.preferred_first_en := nullif(left(btrim(new.preferred_first_en), 60), '');
  new.preferred_last_en := nullif(left(btrim(new.preferred_last_en), 60), '');
  new.preferred_first_ar := nullif(left(btrim(new.preferred_first_ar), 60), '');
  new.preferred_last_ar := nullif(left(btrim(new.preferred_last_ar), 60), '');

  if new.first_name_en is not null and new.father_name_en is not null
    and new.grandfather_name_en is not null and new.last_name_en is not null then
    new.full_name_en := coalesce(new.preferred_first_en, new.first_name_en)
      || ' ' || coalesce(new.preferred_last_en, new.last_name_en);
  end if;
  if new.first_name_ar is not null and new.father_name_ar is not null
    and new.grandfather_name_ar is not null and new.last_name_ar is not null then
    new.full_name_ar := coalesce(new.preferred_first_ar, new.first_name_ar)
      || ' ' || coalesce(new.preferred_last_ar, new.last_name_ar);
  end if;

  new.full_name_en := left(btrim(coalesce(new.full_name_en, '')), 120);
  new.full_name_ar := nullif(left(btrim(new.full_name_ar), 120), '');
  return new;
end;
$$;

-- ── 4. The Six Words wall ───────────────────────────────────────────────────

alter table programmes.six_words
  add column show_full_name boolean not null default false;

grant update (show_full_name) on programmes.six_words to authenticated;

comment on column programmes.six_words.show_full_name is
  'The writer''s choice to show their full preferred name on the wall; otherwise the first name and last initial (decisions §10).';

create or replace function private.wall_name(first text, last text, full_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  -- The name in parts, or else the first and last words of the full name.
  select nullif(btrim(
    coalesce(nullif(btrim(first), ''), split_part(btrim(full_name), ' ', 1), '')
    || coalesce(' ' || left(coalesce(nullif(btrim(last), ''),
      nullif(substring(btrim(full_name) from '\s(\S+)$'), '')), 1) || '.', '')), '');
$$;

-- ── 5. Students under 18 ────────────────────────────────────────────────────

alter table core.profiles
  add column birth_month smallint check (birth_month between 1 and 12),
  add column birth_year smallint check (birth_year between 1990 and 2100),
  add column parent_consent_at timestamptz;

comment on column core.profiles.birth_month is
  'Only for a student under 18 (decisions §10, Minors): lifts the minors'' rules at 18, then deleted with birth_year.';
comment on column core.profiles.parent_consent_at is
  'When a parent or guardian signed F-46 for a member under 18.';

-- Under 18 now: the birthday is taken as the first of the birth month.
create or replace function private.is_minor(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select make_date(p.birth_year, p.birth_month, 1) + interval '18 years' > now()
    from core.profiles p
    where p.id = uid and p.birth_year is not null and p.birth_month is not null
  ), false);
$$;

-- Under 18 and no parent's consent yet: the limited account.
create or replace function private.is_limited_minor(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_minor(uid)
    and not exists (select 1 from core.profiles p where p.id = uid and p.parent_consent_at is not null);
$$;

revoke all on function private.is_minor(uuid) from public, anon;
revoke all on function private.is_limited_minor(uuid) from public, anon;
grant execute on function private.is_minor(uuid) to authenticated, service_role;
grant execute on function private.is_limited_minor(uuid) to authenticated, service_role;

-- What the member's own pages need to know.
create function private.my_minor_status()
returns table (minor boolean, consent_pending boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_minor(auth.uid()), private.is_limited_minor(auth.uid());
$$;

revoke all on function private.my_minor_status() from public, anon;
grant execute on function private.my_minor_status() to authenticated;

create function core.my_minor_status()
returns table (minor boolean, consent_pending boolean)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_minor_status() $$;

revoke all on function core.my_minor_status() from public, anon;
grant execute on function core.my_minor_status() to authenticated;

-- The parent's consent: F-46, signed only through a single-use link.
insert into governance.form_types (key, code, submit_rule, handle_permission, anonymous_ok, ongoing,
  subject_reads, sort, title_en, title_ar, version, filled, needs_account, by_link)
values ('f46', 'F-46', 'anyone', 'members.manage', false, false, false, 460,
  'Parent''s consent for a member under 18', 'موافقة ولي الأمر لعضو دون الثامنة عشرة', 1, 'site', false, true)
on conflict (key) do nothing;

alter table governance.form_links
  add column subject_user uuid references auth.users (id) on delete cascade;

create index form_links_subject_user_idx on governance.form_links (subject_user);

comment on column governance.form_links.subject_user is
  'The member a link is about (F-46: the student under 18 whose parent signs).';

-- Sends the parent the link, once per confirmed account (and again only
-- when Membership asks, from the member's page).
create function private.request_parent_consent(uid uuid, parent_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text := encode(extensions.gen_random_bytes(24), 'hex');
  new_id uuid;
begin
  if parent_email is null or parent_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return null;
  end if;
  insert into governance.form_links (form_key, sent_to, note, token_hash, created_by, subject_user)
  values ('f46', lower(btrim(parent_email)), null,
    encode(extensions.digest(token, 'sha256'), 'hex'), null, uid)
  returning id into new_id;
  perform private.enqueue('forms.link', jsonb_build_object(
    'link_id', new_id, 'token', token, 'form_key', 'f46'));
  return new_id;
end;
$$;

revoke all on function private.request_parent_consent(uuid, text) from public, anon, authenticated;

-- On confirmation, an under-18 sign-up's birth month and year move to the
-- profile and the parent's link goes out. The parent's address is used
-- for the link only and is not kept on the profile.
create function private.after_minor_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  m smallint;
  y smallint;
begin
  if old.email_confirmed_at is not null or new.email_confirmed_at is null
    or coalesce(meta ->> 'adult', 'true') <> 'false' then
    return new;
  end if;
  m := nullif(meta ->> 'birth_month', '')::smallint;
  y := nullif(meta ->> 'birth_year', '')::smallint;
  if m between 1 and 12 and y between 1990 and 2100 then
    update core.profiles set birth_month = m, birth_year = y where id = new.id;
    perform private.request_parent_consent(new.id, meta ->> 'parent_email');
  end if;
  -- Nothing of it stays in the account's sign-up details.
  update auth.users u
  set raw_user_meta_data = u.raw_user_meta_data - 'birth_month' - 'birth_year' - 'parent_email'
  where u.id = new.id;
  return new;
end;
$$;

create trigger after_minor_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function private.after_minor_confirmed();

-- The signed F-46 lifts the limits.
create function private.after_parent_consent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.form_key = 'f46' and new.used_at is not null and old.used_at is null
    and new.subject_user is not null then
    update core.profiles set parent_consent_at = new.used_at where id = new.subject_user;
  end if;
  return new;
end;
$$;

create trigger after_parent_consent
  after update of used_at on governance.form_links
  for each row execute function private.after_parent_consent();

-- At 18 the birth month and year are deleted (the retention job runs daily).
create function private.purge_adult_birthdays()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  update core.profiles p set birth_month = null, birth_year = null
  where p.birth_year is not null and p.birth_month is not null
    and make_date(p.birth_year, p.birth_month, 1) + interval '18 years' <= now();
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function private.purge_adult_birthdays() from public, anon, authenticated;

-- Council seats wait for 18 (team roles don't).
create function private.no_council_seat_under_18()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from access.roles r where r.key = new.role and r.is_council)
    and private.is_minor(new.user_id) then
    raise exception 'council_seat_under_18' using errcode = 'P0001',
      hint = 'A member under 18 may hold team roles but not a Council seat (decisions §10).';
  end if;
  return new;
end;
$$;

select cron.schedule('sal-adult-birthdays', '35 4 * * *', $$ select private.purge_adult_birthdays() $$);

create trigger no_council_seat_under_18
  before insert on access.role_assignments
  for each row execute function private.no_council_seat_under_18();

-- The wall, now that the minors' rule exists.
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
      else private.wall_name(coalesce(p.preferred_first_en, p.first_name_en),
        coalesce(p.preferred_last_en, p.last_name_en), p.full_name_en) end,
    case when not w.show_name then null
      when w.show_full_name then p.full_name_ar
      else private.wall_name(coalesce(p.preferred_first_ar, p.first_name_ar),
        coalesce(p.preferred_last_ar, p.last_name_ar), p.full_name_ar) end,
    w.created_at
  from programmes.six_words w
  join core.profiles p on p.id = w.user_id
  where w.visibility = 'tour' and w.publishable and w.text is not null
    -- A writer under 18 stays off the wall until a parent consents.
    and not private.is_limited_minor(w.user_id)
  order by w.created_at desc
  limit least(greatest(max_results, 1), 500);
$$;

-- ── 6. Retired form and roles ───────────────────────────────────────────────

update governance.form_types
set submit_rule = 'retired', filled = 'removed', title_en = 'Removed', title_ar = 'محذوف'
where key = 'f44';

-- Neither one of the nine seats nor a manual's team role (decisions §5).
-- The Managing Editor handles intake and holds writers' names while work
-- is read blind (decisions §5, Qirtas), as the Submissions Manager did.
insert into access.role_permissions (role, permission)
values ('managing_editor', 'journal.identity.view')
on conflict do nothing;
update programmes.openings set role = null
where role in ('venues_lead', 'production_lead', 'submissions_manager', 'section_editor', 'event_staff');
delete from access.role_permissions
where role in ('venues_lead', 'production_lead', 'submissions_manager', 'section_editor', 'event_staff');
delete from access.roles where key in ('venues_lead', 'production_lead', 'submissions_manager', 'section_editor', 'event_staff')
  and not exists (select 1 from access.role_assignments a where a.role = access.roles.key);
-- Event Coordinator keeps one past holder's record, so it stays on file but
-- can no longer be posted or assigned.
update access.roles set hiring_owner = null where key = 'events_lead';
create function private.no_retired_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role = 'events_lead' then
    raise exception 'role_retired' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger no_retired_role
  before insert on access.role_assignments
  for each row execute function private.no_retired_role();

-- Team roles are lowercase in running text (Chicago 8.21); the glossary's
-- names in Arabic.
update access.roles set name_en = 'Tour lead' where key = 'tour_lead';
update access.roles set name_ar = 'المجلس الاستشاري' where key = 'advisory_board_member';
