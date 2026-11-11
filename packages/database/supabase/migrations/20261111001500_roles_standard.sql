-- The roles standard (decisions.md, Get involved and roles): every role is
-- a job with a bundle of permissions, defined in its seat's manual; the
-- site's list matches the manuals, and retired roles are marked retired,
-- never shown or assignable.
--   - Four kinds: seats, team roles, scoped roles, outside roles.
--   - Covering a seat is a dated delegation that ends when the seat is
--     filled, never built into an officer's own role.
--   - One person holds at most one Council seat, with no other cap.
--   - Personal data is seen only where the job needs it: the mailing list
--     by Media and the Managing Editor.
--   - The General Secretary reviews who holds what every quarter.

-- ── Kinds and the retired flag ──────────────────────────────────────────────

alter table access.roles add column kind text not null default 'team'
  check (kind in ('seat', 'team', 'scoped', 'outside'));
alter table access.roles add column retired boolean not null default false;

comment on column access.roles.kind is
  'seat (the nine), team (a standing job under a seat), scoped (one event, production, issue, election, episode or shift; ends with it) or outside (the Partner Lead and team, the Faculty Advisor, the Advisory Board).';
comment on column access.roles.retired is
  'A retired role is never shown or assignable; its past assignments stay on record.';

update access.roles set kind = 'seat' where is_council and key <> 'faculty_advisor';
update access.roles set kind = 'outside'
where key in ('faculty_advisor', 'advisory_board_member', 'partner_lead', 'partner_rep');
update access.roles set kind = 'scoped'
where key in ('elections_committee', 'guest_editor', 'programme_lead', 'stage_manager', 'reader');

-- ── Retired ─────────────────────────────────────────────────────────────────

-- Onboarding and service letters are automatic; Qirtas has no Arabic
-- editor; events have no coordinator. Roles never held go; the rest stay
-- on record, retired.
update programmes.openings set role = null
where role in ('arabic_editor', 'onboarding_lead', 'records_lead', 'events_lead');
delete from access.role_permissions
where role in ('arabic_editor', 'onboarding_lead', 'records_lead', 'events_lead');
delete from access.roles where key in ('arabic_editor', 'onboarding_lead', 'records_lead')
  and not exists (select 1 from access.role_assignments a where a.role = access.roles.key);
update access.roles set retired = true
where key in ('arabic_editor', 'onboarding_lead', 'records_lead', 'events_lead');

create or replace function private.no_retired_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from access.roles r where r.key = new.role and r.retired) then
    raise exception 'role_retired' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- ── Names as the manuals have them ──────────────────────────────────────────

update access.roles set name_en = 'Web lead', name_ar = 'مسؤول الموقع' where key = 'tech_admin';
update access.roles set name_en = 'Staff writer', name_ar = 'كاتب في هيئة التحرير' where key = 'reporter';
update access.roles set name_en = 'Staff photographer', name_ar = 'مصور في هيئة التحرير' where key = 'photographer';
update access.roles set name_en = 'Staff artist', name_ar = 'فنان في هيئة التحرير' where key = 'illustrator';
update access.roles set name_en = 'Copy Chief', name_ar = 'رئيس التدقيق' where key = 'copy_editor';

-- ── New roles ───────────────────────────────────────────────────────────────

alter table access.role_assignments drop constraint role_assignments_scope_type_check;
alter table access.role_assignments add constraint role_assignments_scope_type_check
  check (scope_type in ('global', 'programme', 'event', 'issue', 'production', 'partner', 'episode'));

insert into access.roles (key, name_en, name_ar, is_council, sort) values
  ('copy_desk_editor', 'Copy editor', 'مدقق لغوي', false, 161),
  ('news_assistant_editor', 'Assistant News editor', 'محرر مساعد للأخبار', false, 170),
  ('voices_assistant_editor', 'Assistant Voices editor', 'محرر مساعد للآراء', false, 171),
  ('letters_assistant_editor', 'Assistant Letters editor', 'محرر مساعد للآداب', false, 172),
  ('gallery_assistant_editor', 'Assistant Gallery editor', 'محرر مساعد للمعرض', false, 173),
  ('video_assistant_editor', 'Assistant Video editor', 'محرر مساعد للفيديو', false, 174),
  ('games_assistant_editor', 'Assistant Games editor', 'محرر مساعد للألعاب', false, 175),
  ('qalam_mentor', 'Qalam mentor', 'مرشد «قلم»', false, 180),
  ('next_stop_crew', 'Next Stop crew', 'فريق «المحطة التالية»', false, 181),
  ('production_director', 'Director', 'المخرج', false, 190),
  ('assistant_director', 'Assistant director', 'مساعد المخرج', false, 191),
  ('assistant_stage_manager', 'Assistant stage manager', 'مساعد مدير المسرح', false, 192),
  ('production_producer', 'Producer', 'المنتج', false, 193),
  ('dramaturg', 'Dramaturg', 'المستشار الدراماتورجي', false, 194),
  ('set_designer', 'Set designer', 'مصمم الديكور', false, 195),
  ('costume_designer', 'Costume designer', 'مصمم الأزياء', false, 196),
  ('lighting_designer', 'Lighting designer', 'مصمم الإضاءة', false, 197),
  ('sound_designer', 'Sound designer', 'مصمم الصوت', false, 198),
  ('production_crew', 'Crew', 'طاقم العمل', false, 199),
  ('front_of_house_manager', 'Front-of-house manager', 'مسؤول الصالة', false, 200),
  ('actor', 'Actor', 'ممثل', false, 201),
  ('narrator', 'Narrator', 'الراوي', false, 202),
  ('understudy', 'Understudy', 'ممثل بديل', false, 203)
on conflict (key) do nothing;

update access.roles set kind = 'scoped'
where key in ('qalam_mentor', 'next_stop_crew', 'production_director', 'assistant_director',
  'assistant_stage_manager', 'production_producer', 'dramaturg', 'set_designer',
  'costume_designer', 'lighting_designer', 'sound_designer', 'production_crew',
  'front_of_house_manager', 'actor', 'narrator', 'understudy');

-- The stage manager is the production's (renamed, scoped like the rest).
update access.roles set name_en = 'Stage manager', name_ar = 'مدير المسرح' where key = 'stage_manager';

insert into access.role_permissions (role, permission) values
  ('copy_desk_editor', 'journal.copy'),
  ('copy_desk_editor', 'library.read'),
  ('news_assistant_editor', 'journal.edit.news'),
  ('voices_assistant_editor', 'journal.edit.voices'),
  ('letters_assistant_editor', 'journal.edit.letters'),
  ('gallery_assistant_editor', 'journal.edit.gallery'),
  ('video_assistant_editor', 'journal.edit.video'),
  ('games_assistant_editor', 'journal.edit.games'),
  ('production_director', 'productions.manage'),
  ('production_producer', 'productions.manage')
on conflict do nothing;

-- ── No cap but one Council seat; up to two assistant editors a section ─────

create or replace function private.role_conflict(
  target_user uuid,
  role_key text,
  scope_type text,
  scope_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  exception_resolution uuid
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  council boolean;
  roles text[];
  same boolean;
  excepted boolean;
begin
  select r.is_council into council from access.roles r where r.key = role_key;

  -- Roles held in a period that overlaps the new assignment's.
  select coalesce(array_agg(distinct a.role), '{}'),
    coalesce(bool_or(a.role = role_key and a.scope_type = role_conflict.scope_type
      and a.scope_id is not distinct from role_conflict.scope_id), false)
  into roles, same
  from access.role_assignments a
  where a.user_id = target_user
    and a.starts_at < coalesce(role_conflict.ends_at, 'infinity'::timestamptz)
    and coalesce(a.ends_at, 'infinity'::timestamptz) > role_conflict.starts_at;

  if same then
    return 'already_holds_role';
  end if;
  if (role_key = 'faculty_advisor' and cardinality(roles) > 0) or 'faculty_advisor' = any (roles) then
    return 'advisor_holds_no_other_role';
  end if;

  -- Up to two assistant editors under each section editor.
  if role_key like '%\_assistant\_editor' and (
    select count(distinct a.user_id) from access.role_assignments a
    where a.role = role_key
      and a.starts_at < coalesce(role_conflict.ends_at, 'infinity'::timestamptz)
      and coalesce(a.ends_at, 'infinity'::timestamptz) > role_conflict.starts_at
  ) >= 2 then
    return 'two_assistant_editors_at_most';
  end if;

  -- One Council seat, unless a resolution the Council adopted allows more.
  excepted := exception_resolution is not null and exists (
    select 1 from governance.resolutions res
    where res.id = exception_resolution and res.status = 'adopted' and res.body = 'council'
  );
  if council and exists (
    select 1 from access.roles r where r.key = any (roles) and r.is_council
  ) then
    if exception_resolution is null then
      return 'one_council_seat';
    end if;
    if not excepted then
      return 'exception_needs_adopted_resolution';
    end if;
  end if;

  return null;
end;
$$;

-- ── Covering: a dated delegation ────────────────────────────────────────────

alter table access.role_assignments add column covering boolean not null default false;

comment on column access.role_assignments.covering is
  'A dated delegation: someone covering an open seat or section until it is filled. It ends when the role is next given to someone for good.';

-- Giving a role for good ends whoever covered it.
create function private.end_covering()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not new.covering then
    update access.role_assignments a
    set ends_at = greatest(new.starts_at, a.starts_at + interval '1 second')
    where a.role = new.role
      and a.covering
      and a.id <> new.id
      and a.scope_type = new.scope_type
      and a.scope_id is not distinct from new.scope_id
      and (a.ends_at is null or a.ends_at > new.starts_at);
  end if;
  return new;
end;
$$;

create trigger end_covering
after insert on access.role_assignments
for each row execute function private.end_covering();

-- The Editor-in-Chief and the Managing Editor no longer hold Voices for
-- good: the Editor-in-Chief covers every open section, and the Managing
-- Editor checks the games until a Games editor is appointed. The covering
-- assignments go in without the new-role email.
delete from access.role_permissions where role = 'eic' and permission = 'journal.edit.voices';
delete from access.role_permissions where role = 'managing_editor' and permission = 'journal.edit.voices';
-- (Restated on one line for the mirror check: the Managing Editor decides no blind work.)
delete from access.role_permissions where role = 'managing_editor' and permission = 'journal.decide';

alter table access.role_assignments disable trigger after_role_assigned;
alter table access.role_assignments disable trigger first_term_starts;

insert into access.role_assignments (user_id, role, scope_type, covering, note)
select holder.user_id, section.role, 'global', true, 'Covering until a section editor is appointed.'
from (
  select distinct a.user_id from access.role_assignments a
  where a.role = 'eic' and a.scope_type = 'global'
    and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now())
) holder
cross join (values ('news_editor'), ('voices_editor'), ('gallery_editor'), ('video_editor')) as section (role)
where not exists (
  select 1 from access.role_assignments a
  where a.role = section.role and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now())
);

insert into access.role_assignments (user_id, role, scope_type, covering, note)
select holder.user_id, 'games_editor', 'global', true, 'Checking the games until a Games editor is appointed.'
from (
  select distinct a.user_id from access.role_assignments a
  where a.role = 'managing_editor' and a.scope_type = 'global'
    and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now())
) holder
where not exists (
  select 1 from access.role_assignments a
  where a.role = 'games_editor' and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now())
);

alter table access.role_assignments enable trigger after_role_assigned;
alter table access.role_assignments enable trigger first_term_starts;

-- ── The mailing list: Media and the Managing Editor ─────────────────────────

insert into access.permissions (key, description) values
  ('mailing.read', 'Read the mailing list (Media and the Managing Editor).')
on conflict (key) do nothing;

insert into access.role_permissions (role, permission) values
  ('media_director', 'mailing.read'),
  ('managing_editor', 'mailing.read'),
  ('president', 'mailing.read')
on conflict do nothing;

drop policy "Content managers see who is subscribed" on content.newsletter_subscribers;
create policy "Media and the Managing Editor see who is subscribed" on content.newsletter_subscribers
  for select to authenticated
  using ((select private.has_permission_anywhere('mailing.read')));

-- ── The quarterly access review ─────────────────────────────────────────────

create table access.access_reviews (
  id bigint generated always as identity primary key,
  reviewed_by uuid references auth.users (id) on delete set null default auth.uid(),
  reviewed_at timestamptz not null default now(),
  holders integer not null check (holders >= 0),
  note text check (char_length(note) <= 2000)
);

create index access_reviews_reviewed_by_idx on access.access_reviews (reviewed_by);

comment on table access.access_reviews is
  'The General Secretary''s quarterly review of who holds what (decisions.md, Get involved and roles): when, by whom, how many current assignments, and a note.';

alter table access.access_reviews enable row level security;

create policy "No third-party apps" on access.access_reviews
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('access')))
  with check ((select private.client_allows('access')));

create policy "Role assigners read the reviews" on access.access_reviews
  for select to authenticated
  using ((select access.has_permission('roles.assign')) or (select access.has_permission('governance.manage')));

revoke all on access.access_reviews from anon, authenticated;
grant select on access.access_reviews to authenticated;
grant all on access.access_reviews to service_role;

create function private.record_access_review(note text default null)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved bigint;
begin
  if not (access.has_permission('governance.manage') or access.has_permission('roles.assign')) then
    raise exception 'The General Secretary records the access review' using errcode = '42501';
  end if;
  insert into access.access_reviews (holders, note)
  select count(*), nullif(btrim(coalesce(record_access_review.note, '')), '')
  from access.role_assignments a
  where a.starts_at <= now() and (a.ends_at is null or a.ends_at > now())
  returning id into saved;
  return saved;
end;
$$;

create function access.record_access_review(note text default null)
returns bigint
language sql
security invoker
set search_path = ''
as $$ select private.record_access_review(note) $$;

comment on function access.record_access_review(text) is
  'Records the quarterly access review: who reviewed, when, and how many assignments were current.';

revoke all on function private.record_access_review(text) from public, anon;
revoke all on function access.record_access_review(text) from public, anon;
grant execute on function private.record_access_review(text) to authenticated, service_role;
grant execute on function access.record_access_review(text) to authenticated;

-- ── Feminine titles (decisions.md, Names and titles) ───────────────────────

update access.roles set name_ar_feminine = v.f
from (values
  ('tech_admin', 'مسؤولة الموقع'),
  ('reporter', 'كاتبة في هيئة التحرير'),
  ('photographer', 'مصورة في هيئة التحرير'),
  ('illustrator', 'فنانة في هيئة التحرير'),
  ('copy_desk_editor', 'مدققة لغوية'),
  ('news_assistant_editor', 'محررة مساعدة للأخبار'),
  ('letters_assistant_editor', 'محررة مساعدة للآداب'),
  ('voices_assistant_editor', 'محررة مساعدة للآراء'),
  ('gallery_assistant_editor', 'محررة مساعدة للمعرض'),
  ('video_assistant_editor', 'محررة مساعدة للفيديو'),
  ('games_assistant_editor', 'محررة مساعدة للألعاب'),
  ('qalam_mentor', 'مرشدة «قلم»'),
  ('production_director', 'المخرجة'),
  ('assistant_director', 'مساعدة المخرج'),
  ('assistant_stage_manager', 'مساعدة مدير المسرح'),
  ('production_producer', 'المنتجة'),
  ('dramaturg', 'المستشارة الدراماتورجية'),
  ('set_designer', 'مصممة الديكور'),
  ('costume_designer', 'مصممة الأزياء'),
  ('lighting_designer', 'مصممة الإضاءة'),
  ('sound_designer', 'مصممة الصوت'),
  ('front_of_house_manager', 'مسؤولة الصالة'),
  ('actor', 'ممثلة'),
  ('narrator', 'الراوية'),
  ('understudy', 'ممثلة بديلة'),
  -- A crew is named as a group, whoever is in it.
  ('production_crew', 'طاقم العمل'),
  ('next_stop_crew', 'فريق «المحطة التالية»')
) as v (key, f)
where access.roles.key = v.key;
