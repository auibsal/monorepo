-- Every Society role, from the documents (owner, Oct 31, 2026: "go through
-- all the current roles and match them to all possible society roles").
-- Roles and Staffing names the Council, the program leads and the team
-- roles below the directors; claude/decisions.md §3 renames them (the
-- Salon, Media, Membership, the Company). Each role now says who hires for
-- it, and a Callboard opening for a role names the role instead of a typed
-- title: whoever is onboarded holds it.

-- ── Who hires for each role ─────────────────────────────────────────────────
-- The same owners as an opening: program (the program's managers or the
-- Director of Programs; the Company's row for the Company), qirtas (the
-- Editor), media, partnerships, membership (each director) or council.
-- Null: not hired through the Callboard (elected, invited or legacy).
alter table access.roles
  add column hiring_owner text
    check (hiring_owner in ('program', 'qirtas', 'media', 'partnerships', 'membership', 'council'));

comment on column access.roles.hiring_owner is
  'Who hires for this role through the Callboard (the opening''s owner); null for elected, invited and legacy roles.';

-- ── The roles the documents name that the platform did not have ───────────
insert into access.roles (key, name_en, name_ar, is_council, sort) values
  ('media_director', 'Director of Media', 'مدير الإعلام', true, 14),
  ('membership_director', 'Director of Membership', 'مدير العضوية', true, 15),
  ('venues_lead', 'Venues and Logistics Lead', 'مسؤول القاعات والتجهيزات', false, 150),
  ('volunteer_coordinator', 'Volunteer Coordinator', 'منسق المتطوعين', false, 151),
  ('design_lead', 'Design Lead', 'مسؤول التصميم', false, 152),
  ('photo_video_lead', 'Photo and Video Lead', 'مسؤول التصوير والفيديو', false, 153),
  ('club_relations_lead', 'Club Relations Lead', 'مسؤول العلاقات مع الأندية', false, 154),
  ('onboarding_lead', 'Onboarding Lead', 'مسؤول الترحيب', false, 155),
  ('records_lead', 'Records and Recognition Lead', 'مسؤول السجلات والتقدير', false, 156),
  ('alumni_lead', 'Alumni Lead', 'مسؤول الخريجين', false, 157),
  ('stage_manager', 'Stage Manager', 'مدير الخشبة', false, 158);

-- Directors sign in with two steps, like every Council seat.
update access.roles set requires_mfa = true where key in ('media_director', 'membership_director');

insert into access.role_permissions (role, permission) values
  ('media_director', 'content.manage'),
  ('media_director', 'events.checkin'),
  ('media_director', 'library.read'),
  ('media_director', 'library.council'),
  ('membership_director', 'members.manage'),
  ('membership_director', 'members.verify'),
  ('membership_director', 'certificates.prepare'),
  ('membership_director', 'events.checkin'),
  ('membership_director', 'library.read'),
  ('membership_director', 'library.council'),
  ('venues_lead', 'events.checkin'),
  ('venues_lead', 'library.read'),
  ('volunteer_coordinator', 'events.checkin'),
  ('volunteer_coordinator', 'library.read'),
  ('design_lead', 'content.manage'),
  ('design_lead', 'library.read'),
  ('photo_video_lead', 'content.manage'),
  ('photo_video_lead', 'events.checkin'),
  ('photo_video_lead', 'library.read'),
  ('club_relations_lead', 'library.read'),
  ('onboarding_lead', 'events.checkin'),
  ('onboarding_lead', 'library.read'),
  ('records_lead', 'certificates.prepare'),
  ('records_lead', 'library.read'),
  ('alumni_lead', 'library.read'),
  ('stage_manager', 'productions.manage'),
  ('stage_manager', 'events.checkin'),
  ('stage_manager', 'library.read');

-- The document's names for two roles the platform called otherwise.
update access.roles set name_en = 'Event Coordinator', name_ar = 'منسق الفعاليات'
where key = 'events_lead';
update access.roles set name_en = 'Social Media Lead', name_ar = 'مسؤول وسائل التواصل'
where key = 'communications_lead';

update access.roles set hiring_owner = 'council'
where key in ('programs_director', 'artistic_director', 'partnerships_director',
  'media_director', 'membership_director', 'eic', 'elections_committee');
update access.roles set hiring_owner = 'qirtas'
where key in ('managing_editor', 'submissions_manager', 'news_editor', 'voices_editor',
  'letters_editor', 'gallery_editor', 'video_editor', 'games_editor', 'section_editor',
  'arabic_editor', 'copy_editor', 'reader', 'reporter', 'photographer', 'illustrator',
  'advisory_board');
update access.roles set hiring_owner = 'program'
where key in ('programme_lead', 'events_lead', 'event_staff', 'venues_lead',
  'volunteer_coordinator', 'production_lead', 'stage_manager');
update access.roles set hiring_owner = 'media'
where key in ('communications_lead', 'design_lead', 'photo_video_lead', 'tech_admin');
update access.roles set hiring_owner = 'partnerships'
where key in ('club_relations_lead', 'campaign_lead');
update access.roles set hiring_owner = 'membership'
where key in ('onboarding_lead', 'records_lead', 'alumni_lead');

-- ── A role opening names its role ───────────────────────────────────────────
alter table programmes.openings
  add column role text references access.roles (key) on delete restrict;
create index openings_role_idx on programmes.openings (role);

-- Openings already posted name their role where the title is a role's name
-- (the masthead seats); the rest keep their title.
update programmes.openings o
set role = r.key
from access.roles r
where o.kind = 'role' and o.role is null and r.hiring_owner is not null
  and o.title_en = r.name_en;

-- New role openings choose from the roles above; older ones keep their title.
alter table programmes.openings
  add constraint openings_role_named check (kind <> 'role' or role is not null) not valid;

comment on column programmes.openings.role is
  'The role a role opening fills (access.roles); its hiring owner decides who picks, and whoever is onboarded holds it.';

-- The role decides the owner, and gives the title when none is written
-- (a program role may carry its own: "Salon Host" for a Program Lead).
create function private.opening_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r access.roles;
begin
  if new.role is null then
    return new;
  end if;
  select * into r from access.roles where key = new.role;
  if r.hiring_owner is null then
    raise exception 'role_not_hired' using errcode = '22023';
  end if;
  new.owner := r.hiring_owner;
  if nullif(btrim(new.title_en), '') is null then
    new.title_en := r.name_en;
  end if;
  if nullif(btrim(new.title_ar), '') is null then
    new.title_ar := r.name_ar;
  end if;
  return new;
end;
$$;
revoke all on function private.opening_role() from public, anon, authenticated;

create trigger opening_role before insert or update of role, title_en, title_ar
  on programmes.openings
  for each row execute function private.opening_role();

-- ── Onboarded: the person holds the role ────────────────────────────────────
-- Membership onboards whoever the owner picked; the role follows, for the
-- program the opening is for when it is a Program Lead, otherwise across
-- the Society, under the opening's title when it differs from the role's.
-- The usual rules on roles still apply (two at most, one Council seat).
create function private.onboarded_takes_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  o programmes.openings;
  r access.roles;
  scoped boolean;
begin
  if new.status <> 'onboarded' or old.status = 'onboarded' then
    return new;
  end if;
  select * into o from programmes.openings where id = new.opening_id;
  if o.role is null then
    return new;
  end if;
  select * into r from access.roles where key = o.role;
  scoped := o.role = 'programme_lead' and o.programme_id is not null;
  if exists (
    select 1 from access.role_assignments a
    where a.user_id = new.user_id and a.role = o.role
      and a.scope_id is not distinct from (case when scoped then o.programme_id end)
      and (a.ends_at is null or a.ends_at > now())
  ) then
    return new;
  end if;
  insert into access.role_assignments (user_id, role, scope_type, scope_id, title_en, title_ar, assigned_by)
  values (
    new.user_id, o.role,
    case when scoped then 'programme' else 'global' end,
    case when scoped then o.programme_id end,
    case when o.title_en <> r.name_en then left(o.title_en, 120) end,
    case when o.title_ar <> r.name_ar then left(o.title_ar, 120) end,
    (select auth.uid())
  );
  return new;
end;
$$;
revoke all on function private.onboarded_takes_role() from public, anon, authenticated;

create trigger onboarded_takes_role after update of status on programmes.opening_replies
  for each row execute function private.onboarded_takes_role();
