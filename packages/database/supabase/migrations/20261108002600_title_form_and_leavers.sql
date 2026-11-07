-- Two decisions of Nov 7, night (§12, §13).
--
-- 1. Arabic titles agree with the holder. An optional account setting gives
--    the Arabic form of one's title (masculine or feminine); the Council
--    page, Qirtas's masthead, the card's role line and letters follow it
--    in Arabic («نائبة الرئيس»). Unset, the glossary's form stays. A seat
--    named in the abstract (documents) never changes.
-- 2. Leaving AUIB without graduating: the account becomes a guest account,
--    with the same number and a Guest card; it keeps RSVPs and writing as
--    a guest and loses the vote, any role and the members' group (Hudhud's
--    seven-day removal starts). Graduates move to Associate.

-- ── 1. The Arabic form of a title ───────────────────────────────────────────

alter table core.profiles
  add column title_form text check (title_form in ('masculine', 'feminine'));
comment on column core.profiles.title_form is
  'Optional (decisions §13): the Arabic form of the holder''s title. Feminine gives نائبة الرئيس, مديرة العضوية and so on wherever a title names this person; unset keeps the glossary''s form.';

grant update (title_form) on core.profiles to authenticated;

alter table access.roles add column name_ar_feminine text;
comment on column access.roles.name_ar_feminine is
  'The title''s Arabic form for a woman (decisions §13), used where a title names a holder who chose it (core.profiles.title_form). Null where the title names a body (a board, a committee, a team).';

update access.roles r set name_ar_feminine = v.f
from (values
  ('alumni_lead', 'مسؤولة الخريجين'),
  ('arabic_editor', 'المحررة العربية'),
  ('artistic_director', 'المديرة الفنية'),
  ('club_relations_lead', 'مسؤولة العلاقات مع الأندية'),
  ('communications_lead', 'مسؤولة وسائل التواصل'),
  ('copy_editor', 'رئيسة التدقيق'),
  ('design_lead', 'مسؤولة التصميم'),
  ('eic', 'رئيسة التحرير'),
  ('events_director', 'مديرة الفعاليات'),
  ('events_lead', 'منسقة الفعاليات'),
  ('faculty_advisor', 'المستشارة من الهيئة التدريسية'),
  ('gallery_editor', 'محررة المعرض'),
  ('games_editor', 'محررة الألعاب'),
  ('general_secretary', 'الأمينة العامة'),
  ('guest_editor', 'محررة ضيفة'),
  ('illustrator', 'رسّامة'),
  ('letters_editor', 'محررة الآداب'),
  ('managing_editor', 'مديرة التحرير'),
  ('media_director', 'مديرة الإعلام'),
  ('membership_director', 'مديرة العضوية'),
  ('news_editor', 'محررة الأخبار'),
  ('next_stop_host', 'مقدّمة «المحطة القادمة»'),
  ('next_stop_producer', 'منتجة «المحطة القادمة»'),
  ('onboarding_lead', 'مسؤولة الترحيب'),
  ('partner_lead', 'مسؤولة الشريك'),
  ('partner_rep', 'ممثلة الشريك'),
  ('partnerships_director', 'مديرة الشراكات'),
  ('photo_video_lead', 'مسؤولة التصوير والفيديو'),
  ('photographer', 'مصوّرة'),
  ('president', 'الرئيسة'),
  ('production_lead', 'قائدة العمل المسرحي'),
  ('programme_lead', 'قائدة الفعالية'),
  ('qalam_lead', 'مسؤولة «قلم»'),
  ('reader', 'قارئة'),
  ('records_lead', 'مسؤولة السجلات والتقدير'),
  ('reporter', 'مراسلة'),
  ('section_editor', 'محررة القسم'),
  ('stage_manager', 'مديرة الخشبة'),
  ('submissions_manager', 'مسؤولة المشاركات'),
  ('tech_admin', 'المسؤولة التقنية'),
  ('tour_lead', 'مسؤولة جولة الآلة الكاتبة'),
  ('venues_lead', 'مسؤولة القاعات والتجهيزات'),
  ('vice_president', 'نائبة الرئيس'),
  ('video_editor', 'محررة المرئيات'),
  ('voices_editor', 'محرّرة آراء'),
  ('volunteer_coordinator', 'منسقة المتطوعين')
) as v (key, f)
where r.key = v.key;

-- Whether a person asked for the feminine form.
create function private.feminine_title(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.title_form = 'feminine' from core.profiles p where p.id = uid), false)
$$;

revoke all on function private.feminine_title(uuid) from public, anon;
grant execute on function private.feminine_title(uuid) to authenticated, service_role;

-- The card's role line, in the holder's form.
create or replace function private.card_role(uid uuid)
returns table (role_en text, role_ar text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(a.title_en, r.name_en)
      || case when e.id is not null then ', ' || e.title_en else '' end,
    coalesce(
      a.title_ar,
      case when private.feminine_title(uid) then r.name_ar_feminine end,
      r.name_ar
    )
      || case when e.id is not null then '، ' || e.title_ar else '' end
  from access.role_assignments a
  join access.roles r on r.key = a.role
  left join events.events e on a.scope_type = 'event' and e.id = a.scope_id
  where a.user_id = uid
    and a.starts_at <= now()
    and (a.ends_at is null or a.ends_at > now())
  order by r.is_council desc, r.sort, a.starts_at
  limit 1;
$$;

-- Qirtas's masthead, each title in its holder's form.
create or replace function private.qirtas_masthead()
returns table (role text, full_name_en text, full_name_ar text, title_en text, title_ar text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (r.sort, p.full_name_en, a.role)
    a.role, p.full_name_en, p.full_name_ar,
    coalesce(nullif(btrim(a.title_en), ''), r.name_en),
    coalesce(
      nullif(btrim(a.title_ar), ''),
      case when p.title_form = 'feminine' then r.name_ar_feminine end,
      r.name_ar
    )
  from access.role_assignments a
  join access.roles r on r.key = a.role
  join core.profiles p on p.id = a.user_id
  where (a.role in ('eic', 'managing_editor', 'guest_editor') or r.hiring_owner = 'qirtas')
    and a.starts_at <= now()
    and (a.ends_at is null or a.ends_at > now())
  order by r.sort, p.full_name_en, a.role;
$$;

-- The Council page: each seat says whether every holder chose the
-- feminine form, so the Arabic page names the seat as they hold it.
drop function governance.council_seats();
drop function private.council_seats();

create function private.council_seats()
returns table (seat text, sort integer, holders_en text[], holders_ar text[], feminine boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.key,
    r.sort,
    coalesce(array_agg(p.full_name_en order by a.starts_at) filter (where p.id is not null), '{}'),
    coalesce(array_agg(coalesce(p.full_name_ar, p.full_name_en) order by a.starts_at) filter (where p.id is not null), '{}'),
    coalesce(bool_and(p.title_form = 'feminine') filter (where p.id is not null), false)
  from access.roles r
  left join access.role_assignments a
    on a.role = r.key
    and a.scope_type = 'global'
    and a.starts_at <= now()
    and (a.ends_at is null or a.ends_at > now())
  left join core.profiles p on p.id = a.user_id
  where r.is_council
  group by r.key, r.sort
  order by r.sort;
$$;

revoke all on function private.council_seats() from public;
grant execute on function private.council_seats() to anon, authenticated, service_role;

create function governance.council_seats()
returns table (seat text, sort integer, holders_en text[], holders_ar text[], feminine boolean)
language sql
stable
set search_path = ''
as $$ select * from private.council_seats() $$;

revoke all on function governance.council_seats() from public;
grant execute on function governance.council_seats() to anon, authenticated, service_role;

-- A service letter keeps its signer's form, as signed.
alter table membership.service_letters
  add column signer_feminine boolean not null default false;

create function private.service_letter_signer_form()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.signer_feminine := private.feminine_title(new.issued_by);
  return new;
end;
$$;

revoke all on function private.service_letter_signer_form() from public, anon, authenticated;

create trigger signer_form before insert on membership.service_letters
  for each row execute function private.service_letter_signer_form();

-- ── 2. Leaving AUIB ─────────────────────────────────────────────────────────

-- The Director of Membership records that a student Member left AUIB.
-- Graduated: Associate Member (same account, number and card; no vote, no
-- office, so any role ends). Left without graduating: a guest account,
-- with the same number and a Guest card; roles end, the vote goes with the
-- class, and Hudhud's seven-day removal from the members' group starts.
create function private.record_departure(member uuid, graduated boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  m membership.memberships;
begin
  if not private.has_permission('members.manage') then
    raise exception 'The Director of Membership records who left' using errcode = '42501';
  end if;
  select * into m from membership.memberships where user_id = member for update;
  if not found or m.tier <> 'member' then
    raise exception 'not_a_student_member' using errcode = 'P0002';
  end if;

  -- Office goes with the student class, either way.
  update access.role_assignments
  set ends_at = now()
  where user_id = member and starts_at < now() and (ends_at is null or ends_at > now());
  delete from access.role_assignments
  where user_id = member and starts_at >= now();

  if graduated then
    update membership.memberships set tier = 'associate' where user_id = member;
    return 'associate';
  end if;

  -- The card row stays (same number); the membership goes, the guest
  -- welcome starts, and the Wallet pass follows to the Guest card.
  delete from membership.memberships where user_id = member;
  insert into membership.guests (user_id, invited_by) values (member, (select auth.uid()))
  on conflict (user_id) do update set ended_at = null;
  insert into membership.cards (user_id) values (member) on conflict (user_id) do nothing;
  perform private.enqueue('wallet.refresh', jsonb_build_object('user_id', member));

  -- The members' group: Hudhud warns and removes a week later.
  update core.telegram_members tm
  set warned_at = coalesce(tm.warned_at, now()), removed_at = null
  from core.telegram_accounts ta, core.telegram_groups g
  where ta.user_id = member and tm.telegram_id = ta.telegram_id
    and g.chat_id = tm.chat_id and g.audience <> 'staff';
  return 'guest';
end;
$$;

revoke all on function private.record_departure(uuid, boolean) from public, anon;
grant execute on function private.record_departure(uuid, boolean) to authenticated;

create function membership.record_departure(member uuid, graduated boolean)
returns text
language sql
security invoker
set search_path = ''
as $$ select private.record_departure(member, graduated) $$;

revoke all on function membership.record_departure(uuid, boolean) from public, anon;
grant execute on function membership.record_departure(uuid, boolean) to authenticated;

-- The owner reads their own form with their other private settings; the
-- column is not readable from the table (it is personal).
drop function core.my_private_profile();
drop function private.my_private_profile();

create function private.my_private_profile()
returns table (personal_email text, notify_email boolean, title_form text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.personal_email, p.notify_email, p.title_form from core.profiles p where p.id = auth.uid();
$$;

revoke all on function private.my_private_profile() from public, anon;
grant execute on function private.my_private_profile() to authenticated, service_role;

create function core.my_private_profile()
returns table (personal_email text, notify_email boolean, title_form text)
language sql
stable
set search_path = ''
as $$ select * from private.my_private_profile() $$;

revoke all on function core.my_private_profile() from public, anon;
grant execute on function core.my_private_profile() to authenticated, service_role;
