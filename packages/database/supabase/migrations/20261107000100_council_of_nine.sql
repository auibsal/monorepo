-- The Council of nine, the membership classes, the Register and the first
-- term (owner, Nov 7, 2026; claude/decisions.md §2 and §4).
--
-- The Executive Board is the President, the Vice President and the
-- General Secretary; six directors sit with them: the Editor-in-Chief,
-- the Director of Media, the Artistic Director, the Director of Events,
-- the Director of Partnerships and the Director of Membership. Until a
-- seat is filled, the President covers Events and the Artistic Director,
-- the Vice President Partnerships and the General Secretary Membership:
-- their permissions already hold those jobs, so covering needs no second
-- assignment.

-- 1. Retired roles and permissions (the Awards, campaigns, the
-- Edition-scoped advisory board). None was held in production on Nov 7.
delete from programmes.openings where role in ('awards_coordinator', 'campaign_lead', 'advisory_board');
delete from access.role_assignments where role in ('awards_coordinator', 'campaign_lead', 'advisory_board');
delete from governance.positions where role_key in ('awards_coordinator', 'campaign_lead', 'advisory_board');
delete from access.roles where key in ('awards_coordinator', 'campaign_lead', 'advisory_board');
update governance.form_types set handle_permission = 'governance.manage'
where handle_permission in ('charity.manage', 'charity.ledger.write', 'charity.ledger.signoff', 'journal.awards');
delete from access.role_permissions
where permission in ('charity.manage', 'charity.ledger.write', 'charity.ledger.signoff', 'journal.awards');
delete from access.permissions where key in ('charity.manage', 'charity.ledger.write', 'charity.ledger.signoff', 'journal.awards');

-- No assignment is scoped to a campaign any more.
alter table access.role_assignments drop constraint role_assignments_scope_type_check;
alter table access.role_assignments add constraint role_assignments_scope_type_check
  check (scope_type in ('global', 'programme', 'event', 'issue', 'production', 'partner'));

-- 2. New permissions.
insert into access.permissions (key, description) values
  ('members.register', 'Read the Register: the Executive Board and the Director of Membership'),
  ('qalam.manage', 'Run Qalam: applications, the roster and sessions (the Editor-in-Chief and the Qalam lead)'),
  ('journal.prize', 'Run the Mutanabbi Prize: shortlists, the judge''s scores and the count (the Editor-in-Chief)'),
  ('forms.handle', 'Read the signed copies of forms filled on the site (the General Secretary)');

-- 3. The Directors of Partnerships and Membership return, with the
-- Director of Events; the Advisory Board (members of it hold no
-- permissions; advisory_board_member, since the old Edition-scoped
-- advisory_board is retired above) and the Qalam lead are added.
insert into access.roles (key, name_en, name_ar, is_council, sort) values
  ('events_director', 'Director of Events', 'مدير الفعاليات', true, 46),
  ('partnerships_director', 'Director of Partnerships', 'مدير الشراكات', true, 47),
  ('membership_director', 'Director of Membership', 'مدير العضوية', true, 48),
  ('advisory_board_member', 'Advisory Board', 'الهيئة الاستشارية', false, 65),
  ('qalam_lead', 'Qalam Lead', 'مسؤول «قلم»', false, 131);

update access.roles set requires_mfa = true, hiring_owner = 'council'
where key in ('events_director', 'partnerships_director', 'membership_director');
update access.roles set hiring_owner = 'council' where key = 'advisory_board_member';
update access.roles set hiring_owner = 'qirtas' where key = 'qalam_lead';

update access.roles set sort = 40 where key = 'eic';
update access.roles set sort = 42 where key = 'media_director';
update access.roles set sort = 44 where key = 'artistic_director';

insert into access.role_permissions (role, permission) values
  ('events_director', 'events.manage'),
  ('events_director', 'events.checkin'),
  ('events_director', 'programs.manage'),
  ('events_director', 'library.read'),
  ('events_director', 'library.council'),
  ('partnerships_director', 'partners.manage'),
  ('partnerships_director', 'events.checkin'),
  ('partnerships_director', 'library.read'),
  ('partnerships_director', 'library.council'),
  ('membership_director', 'members.verify'),
  ('membership_director', 'members.manage'),
  ('membership_director', 'members.register'),
  ('membership_director', 'tour.run'),
  ('membership_director', 'events.checkin'),
  ('membership_director', 'library.read'),
  ('membership_director', 'library.council'),
  ('qalam_lead', 'qalam.manage'),
  ('qalam_lead', 'library.read'),
  ('president', 'members.register'),
  ('president', 'qalam.manage'),
  ('president', 'journal.prize'),
  ('president', 'forms.handle'),
  ('vice_president', 'members.register'),
  ('general_secretary', 'members.register'),
  ('general_secretary', 'forms.handle'),
  ('eic', 'qalam.manage'),
  ('eic', 'journal.prize');

comment on table access.roles is
  'Role bundles. The Council of nine (owner, Nov 7, 2026): the Executive Board (President, Vice President, General Secretary) and six directors (Editor-in-Chief, Director of Media, Artistic Director, Director of Events, Director of Partnerships, Director of Membership). The Advisory Board holds no permissions.';

-- 4. The first term: everyone newly joining a team or appointed to a role
-- serves their first term on probation; the person who appointed them
-- then confirms them. Elected seats have no first term.
alter table access.role_assignments
  add column confirmed_at timestamptz,
  add column confirmed_by uuid references auth.users (id) on delete set null;
create index role_assignments_confirmed_by_idx on access.role_assignments (confirmed_by);

comment on column access.role_assignments.confirmed_at is
  'When the first term ended in confirmation (owner, Nov 7, 2026). Null while the holder serves their first term. Elected seats (the officers and the Editor-in-Chief) are confirmed when assigned.';

-- Everyone already serving is treated as confirmed: the founding team.
update access.role_assignments set confirmed_at = created_at, confirmed_by = assigned_by;

create function private.elected_seat(role text)
returns boolean
language sql
immutable
set search_path = ''
as $$ select elected_seat.role in ('president', 'vice_president', 'general_secretary', 'eic') $$;

create function private.first_term_starts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.elected_seat(new.role) then
    new.confirmed_at := coalesce(new.confirmed_at, now());
  end if;
  return new;
end;
$$;

revoke all on function private.first_term_starts() from public, anon, authenticated;

create trigger first_term_starts
  before insert on access.role_assignments
  for each row execute function private.first_term_starts();

create function private.confirm_assignment(assignment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a access.role_assignments;
begin
  select * into a from access.role_assignments where id = confirm_assignment.assignment_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if not (
    access.has_permission('roles.assign')
    or (a.assigned_by is not null and a.assigned_by = (select auth.uid()))
  ) then
    raise exception 'roles.assign or the appointer is required' using errcode = '42501';
  end if;
  update access.role_assignments
  set confirmed_at = now(), confirmed_by = (select auth.uid())
  where id = a.id and confirmed_at is null;
end;
$$;

revoke all on function private.confirm_assignment(uuid) from public, anon;
grant execute on function private.confirm_assignment(uuid) to authenticated;

create function access.confirm_assignment(assignment_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.confirm_assignment(assignment_id) $$;

revoke all on function access.confirm_assignment(uuid) from public, anon;
grant execute on function access.confirm_assignment(uuid) to authenticated;

-- 5. Membership classes (decisions §2): Members (AUIB students who have
-- joined), Associate Members (faculty, staff and alumni; no vote, can't
-- hold office) and Honorary Members (voted by the Council; no vote).
drop function if exists membership.directory();
drop function if exists private.directory();
drop function if exists membership.my_status();
drop function if exists private.my_status();
drop function if exists membership.set_tier(uuid, membership.tier);
drop function if exists private.set_tier(uuid, membership.tier);
drop function if exists membership.verify_card(text, text);
drop function if exists private.verify_card(text, text);

alter type membership.tier rename to tier_old;
create type membership.tier as enum ('member', 'associate', 'honorary');
alter table membership.memberships alter column tier drop default;
alter table membership.memberships
  alter column tier type membership.tier using (
    case tier::text
      when 'alumni' then 'associate'
      when 'honorary' then 'honorary'
      else 'member'
    end
  )::membership.tier;
alter table membership.memberships alter column tier set default 'member';
drop type membership.tier_old;

comment on type membership.tier is
  'Membership class (owner, Nov 7, 2026): member (an AUIB student), associate (faculty, staff, alumni; no vote, no office) or honorary (voted by the Council; no vote).';

-- 6. Voting members: Members who attended at least two events or general
-- meetings in the academic year (from September 1). The founding voters
-- rule is gone.
drop function if exists private.is_founding_voter(uuid) cascade;
delete from core.settings where key in ('membership.founding_voters', 'membership.founding_voters_until');

create or replace function private.activity_count(uid uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(distinct coalesce(r.event_id::text, r.id::text))::integer
  from membership.activity_records r
  where r.user_id = uid
    and (r.occurred_at at time zone 'Asia/Baghdad')::date >= private.academic_year_start();
$$;

create or replace function private.is_voting_member(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_member(uid)
    and exists (
      select 1 from membership.memberships m
      where m.user_id = uid and m.tier = 'member'
    )
    and private.activity_count(uid) >= 2;
$$;

alter table membership.memberships
  add column in_directory boolean not null default false;

comment on column membership.memberships.in_directory is
  'The member chose to appear in the members-only directory (owner, Nov 7, 2026). Off by default.';

grant update (in_directory) on membership.memberships to authenticated;

create function private.my_status()
returns table (
  is_member boolean, verified boolean, tier membership.tier, member_since date,
  activities integer, voting_member boolean, pending_pledges membership.pledge_type[],
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
      select t from unnest(enum_range(null::membership.pledge_type)) t
      where not exists (
        select 1 from membership.pledges pl
        where pl.user_id = auth.uid()
          and pl.pledge_type = t
          and pl.version = membership.current_pledge_version(t)
      )
    ),
    coalesce((select m.in_directory from membership.memberships m where m.user_id = auth.uid()), false);
$$;

-- 7. The Register is private: the Executive Board and the Director of
-- Membership (members.register). Members may choose to appear in a
-- members-only directory.

create function private.register()
returns table (
  user_id uuid, email text, full_name_en text, full_name_ar text, tier membership.tier,
  member_since date, verified_at timestamptz, activities integer, voting_member boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not access.has_permission('members.register') then
    raise exception 'members.register is required' using errcode = '42501';
  end if;

  return query
  select
    p.id, u.email::text, p.full_name_en, p.full_name_ar, m.tier, m.member_since,
    p.verified_at, private.activity_count(p.id), private.is_voting_member(p.id), p.created_at
  from core.profiles p
  join auth.users u on u.id = p.id
  left join membership.memberships m on m.user_id = p.id
  order by lower(p.full_name_en), p.created_at;
end;
$$;

revoke all on function private.register() from public, anon;
grant execute on function private.register() to authenticated;

create function membership.register()
returns table (
  user_id uuid, email text, full_name_en text, full_name_ar text, tier membership.tier,
  member_since date, verified_at timestamptz, activities integer, voting_member boolean,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.register() $$;

revoke all on function membership.register() from public, anon;
grant execute on function membership.register() to authenticated;

-- The members-only directory: names and class of members who opted in,
-- never an email or an ID.
create function private.members_directory()
returns table (user_id uuid, full_name_en text, full_name_ar text, tier membership.tier, member_since date, byline_slug text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_member((select auth.uid())) then
    raise exception 'members only' using errcode = '42501';
  end if;
  return query
  select p.id, p.full_name_en, p.full_name_ar, m.tier, m.member_since,
    (select c.slug from journal.contributors c where c.user_id = p.id and not c.is_pen_name limit 1)
  from membership.memberships m
  join core.profiles p on p.id = m.user_id
  where m.in_directory and private.is_member(p.id)
  order by lower(p.full_name_en);
end;
$$;

revoke all on function private.members_directory() from public, anon;
grant execute on function private.members_directory() to authenticated;

create function membership.members_directory()
returns table (user_id uuid, full_name_en text, full_name_ar text, tier membership.tier, member_since date, byline_slug text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.members_directory() $$;

revoke all on function membership.members_directory() from public, anon;
grant execute on function membership.members_directory() to authenticated;

create function membership.my_status()
returns table (
  is_member boolean, verified boolean, tier membership.tier, member_since date,
  activities integer, voting_member boolean, pending_pledges membership.pledge_type[],
  in_directory boolean
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_status() $$;

revoke all on function private.my_status() from public, anon;
grant execute on function private.my_status() to authenticated;
revoke all on function membership.my_status() from public, anon;
grant execute on function membership.my_status() to authenticated;

-- Setting a class: Honorary Members are voted by the Council (an adopted
-- resolution); the Director of Membership or an officer records it.
create function private.set_tier(target_user uuid, new_tier membership.tier)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not access.has_permission('members.manage') then
    raise exception 'members.manage is required' using errcode = '42501';
  end if;
  update membership.memberships set tier = new_tier where user_id = target_user;
  if not found then
    raise exception 'User % is not a member', target_user using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function private.set_tier(uuid, membership.tier) from public, anon;
grant execute on function private.set_tier(uuid, membership.tier) to authenticated;

create function membership.set_tier(target_user uuid, new_tier membership.tier)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.set_tier(target_user, new_tier) $$;

revoke all on function membership.set_tier(uuid, membership.tier) from public, anon;
grant execute on function membership.set_tier(uuid, membership.tier) to authenticated;

create function private.verify_card(code text, digits text default null)
returns table (
  number integer, full_name_en text, full_name_ar text, tier membership.tier,
  member_since date, active boolean, voting boolean, live boolean, kind text, staff boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.number, p.full_name_en, p.full_name_ar, m.tier, m.member_since,
    private.membership_kind(c.user_id) is not null,
    private.is_voting_member(c.user_id),
    coalesce(private.totp_live(c.secret, verify_card.digits), false),
    private.membership_kind(c.user_id),
    private.is_member(c.user_id) and private.is_staff(c.user_id)
  from membership.cards c
  join core.profiles p on p.id = c.user_id
  left join membership.memberships m on m.user_id = c.user_id
  where c.code = lower(trim(verify_card.code));
$$;

revoke all on function private.verify_card(text, text) from public;
grant execute on function private.verify_card(text, text) to anon, authenticated, service_role;

create function membership.verify_card(code text, digits text default null)
returns table (
  number integer, full_name_en text, full_name_ar text, tier membership.tier,
  member_since date, active boolean, voting boolean, live boolean, kind text, staff boolean
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.verify_card(code, digits) $$;

revoke all on function membership.verify_card(text, text) from public;
grant execute on function membership.verify_card(text, text) to anon, authenticated, service_role;

-- Certificates no longer name a resolution for fellowships.
create or replace function private.guard_certificate()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' or new.president_signed_by is not null or new.advisor_signed_by is not null
      or new.serial is not null then
      raise exception 'certificate_starts_draft' using errcode = '22023';
    end if;
  elsif current_user = 'authenticated' then
    if old.status <> 'draft'
      or new.status is distinct from old.status
      or new.serial is distinct from old.serial
      or new.president_signed_by is distinct from old.president_signed_by
      or new.advisor_signed_by is distinct from old.advisor_signed_by
      or new.verification_code is distinct from old.verification_code then
      raise exception 'certificate_locked' using errcode = '42501';
    end if;
    -- Editing a draft after a signature clears nothing silently: refuse.
    if old.president_signed_by is not null or old.advisor_signed_by is not null then
      raise exception 'certificate_signed' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$function$;

-- ── No student ID field ─────────────────────────────────────────────────────
-- Owner, Nov 7, 2026: never ask for a student ID as a separate field. The
-- AUIB email (which contains it) is the identifier, never shown publicly.
alter table core.member_details drop column student_id;
