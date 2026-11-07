-- One forms register, digital by default (owner, Nov 7, 2026;
-- claude/decisions.md §6). Every Society form is in SAL-EXB-01 as F-xx.
-- People outside the staff fill forms on one standard page,
-- auibsal.org/forms/<number>, signing by typing their name; the site keeps
-- the signed copy (signer, time, form version). Forms that are part of a
-- page (joining, RSVPs, Write for Qirtas, Get involved, elections, staff
-- hours) stay there; staff forms are Notion templates. Removed numbers
-- (F-22, the Tour's consent slip) are never reused.
--
-- Guests (decisions §2) attend open events and may create a guest account
-- to RSVP. An off-campus event's participants sign the trip consent form
-- (F-45) on the site before their place is booked.

-- 1. The register. Nothing was ever submitted in production (Nov 7).
delete from governance.form_submissions;
delete from governance.form_types;

alter table governance.form_types
  add column title_en text not null default '',
  add column title_ar text not null default '',
  add column version integer not null default 1 check (version >= 1),
  add column filled text not null default 'notion'
    check (filled in ('site', 'page', 'notion', 'paper', 'removed')),
  add column needs_account boolean not null default true,
  add column second_signer text
    check (second_signer in ('member', 'qalam.manage', 'partners.sign')),
  add column subject_kind text
    check (subject_kind in ('event', 'piece', 'production', 'partner'));

alter table governance.form_types drop constraint form_types_submit_rule_check;
alter table governance.form_types add constraint form_types_submit_rule_check
  check (submit_rule in ('anyone', 'member', 'role_holder', 'handler', 'retired'));

comment on table governance.form_types is
  'The forms register, SAL-EXB-01 · F-01 and up (owner, Nov 7, 2026). filled: site (its own page at /forms/<number>), page (part of another page), notion (a staff template), paper (the cash count), removed (number never reused).';

insert into governance.form_types
  (key, code, title_en, title_ar, filled, submit_rule, handle_permission, anonymous_ok, ongoing, subject_reads, needs_account, second_signer, subject_kind, acknowledge_days, answer_days, sort)
values
  ('f01', 'F-01', 'Role application', 'طلب دور', 'page', 'member', 'members.manage', false, false, false, true, null, null, null, null, 10),
  ('f02', 'F-02', 'Interview score sheet', 'ورقة تقييم المقابلة', 'notion', 'retired', 'members.manage', false, false, false, true, null, null, null, null, 20),
  ('f03', 'F-03', 'Appointment letter', 'رسالة التعيين', 'notion', 'retired', 'members.manage', false, false, false, true, null, null, null, null, 30),
  ('f04', 'F-04', 'Onboarding checklist', 'قائمة الانضمام', 'notion', 'retired', 'members.manage', false, false, false, true, null, null, null, null, 40),
  ('f05', 'F-05', 'Service letter', 'رسالة الخدمة', 'notion', 'retired', 'members.manage', false, false, false, true, null, null, null, null, 50),
  ('f06', 'F-06', 'Conflict-of-interest declaration', 'إقرار تضارب المصالح', 'site', 'role_holder', 'governance.manage', false, false, false, true, null, null, null, null, 60),
  ('f07', 'F-07', 'Handover page', 'صفحة التسليم', 'notion', 'retired', 'governance.manage', false, false, false, true, null, null, null, null, 70),
  ('f08', 'F-08', 'Offboarding checklist', 'قائمة المغادرة', 'notion', 'retired', 'members.manage', false, false, false, true, null, null, null, null, 80),
  ('f09', 'F-09', 'Council meeting agenda and minutes', 'جدول أعمال اجتماع المجلس ومحضره', 'notion', 'retired', 'governance.minutes.write', false, false, false, true, null, null, null, null, 90),
  ('f10', 'F-10', 'Motion for a members’ meeting', 'مقترح لاجتماع الأعضاء', 'site', 'member', 'governance.manage', false, false, false, true, 'member', null, 7, 30, 100),
  ('f11', 'F-11', 'Event pitch', 'مقترح فعالية', 'site', 'anyone', 'programs.manage', false, false, false, false, null, null, 7, 21, 110),
  ('f12', 'F-12', 'Event plan and risk check', 'خطة الفعالية وتقييم المخاطر', 'notion', 'retired', 'events.manage', false, false, false, true, null, null, null, null, 120),
  ('f13', 'F-13', 'Event debrief', 'مراجعة الفعالية', 'notion', 'retired', 'events.manage', false, false, false, true, null, null, null, null, 130),
  ('f14', 'F-14', 'Semester report', 'تقرير الفصل', 'notion', 'retired', 'governance.manage', false, false, false, true, null, null, null, null, 140),
  ('f15', 'F-15', 'Media release', 'إذن النشر الإعلامي', 'site', 'anyone', 'content.manage', false, false, false, false, null, 'event', null, null, 150),
  ('f16', 'F-16', 'Incident report', 'تقرير حادثة', 'notion', 'retired', 'governance.manage', false, false, false, true, null, null, null, null, 160),
  ('f17', 'F-17', 'Partnership memorandum', 'مذكرة الشراكة', 'site', 'handler', 'partners.manage', false, false, false, true, 'partners.sign', 'partner', null, null, 170),
  ('f18', 'F-18', 'Needs list', 'قائمة الاحتياجات', 'notion', 'retired', 'governance.manage', false, false, false, true, null, null, null, null, 180),
  ('f19', 'F-19', 'Request to Student Life', 'طلب إلى شؤون الطلبة', 'notion', 'retired', 'governance.manage', false, false, false, true, null, null, null, null, 190),
  ('f20', 'F-20', 'Charity collection count and handover', 'عدّ تبرعات الحملة الخيرية وتسليمها', 'paper', 'retired', 'governance.manage', false, false, false, true, null, null, null, null, 200),
  ('f21', 'F-21', 'Concern', 'إبلاغ عن مخاوف', 'site', 'anyone', 'concerns.handle', true, true, true, false, null, null, 3, 30, 210),
  ('f22', 'F-22', 'Removed', 'محذوف', 'removed', 'retired', 'governance.manage', false, false, false, true, null, null, null, null, 220),
  ('f23', 'F-23', 'Tour tally', 'حصيلة الجولة', 'notion', 'retired', 'tour.run', false, false, false, true, null, null, null, null, 230),
  ('f24', 'F-24', 'Audition form', 'استمارة تجربة الأداء', 'page', 'member', 'productions.manage', false, false, false, true, null, 'production', null, null, 240),
  ('f25', 'F-25', 'Audition score sheet', 'ورقة تقييم تجربة الأداء', 'notion', 'retired', 'productions.manage', false, false, false, true, null, null, null, null, 250),
  ('f26', 'F-26', 'Company agreement', 'اتفاقية الفرقة', 'site', 'member', 'productions.manage', false, false, false, true, null, 'production', null, null, 260),
  ('f27', 'F-27', 'Stage manager’s risk checklist', 'قائمة مخاطر مدير المسرح', 'notion', 'retired', 'productions.manage', false, false, false, true, null, null, null, null, 270),
  ('f28', 'F-28', 'Rights request letter', 'رسالة طلب الحقوق', 'notion', 'retired', 'productions.manage', false, false, false, true, null, null, null, null, 280),
  ('f29', 'F-29', 'Faculty Advisor invitation', 'دعوة المستشار من الهيئة التدريسية', 'notion', 'retired', 'governance.manage', false, false, false, true, null, null, null, null, 290),
  ('f30', 'F-30', 'Thank-you to a partner or sponsor', 'رسالة شكر لشريك أو راعٍ', 'notion', 'retired', 'partners.manage', false, false, false, true, null, null, null, null, 300),
  ('f31', 'F-31', 'Open call', 'دعوة مفتوحة', 'notion', 'retired', 'members.manage', false, false, false, true, null, null, null, null, 310),
  ('f32', 'F-32', 'Application outcome', 'نتيجة الطلب', 'notion', 'retired', 'members.manage', false, false, false, true, null, null, null, null, 320),
  ('f33', 'F-33', 'Welcome to new members', 'ترحيب بالأعضاء الجدد', 'notion', 'retired', 'members.manage', false, false, false, true, null, null, null, null, 330),
  ('f34', 'F-34', 'Honorary Membership invitation', 'دعوة إلى العضوية الفخرية', 'notion', 'retired', 'governance.manage', false, false, false, true, null, null, null, null, 340),
  ('f35', 'F-35', 'Notice of a members’ meeting', 'إشعار اجتماع الأعضاء', 'notion', 'retired', 'governance.manage', false, false, false, true, null, null, null, null, 350),
  ('f36', 'F-36', 'Notice of election', 'إشعار الانتخابات', 'notion', 'retired', 'elections.manage', false, false, false, true, null, null, null, null, 360),
  ('f37', 'F-37', 'Qalam mentor agreement', 'اتفاقية مرشد «قلم»', 'site', 'member', 'qalam.manage', false, false, false, true, 'qalam.manage', null, null, null, 370),
  ('f38', 'F-38', 'Qalam parental consent', 'موافقة ولي الأمر على «قلم»', 'site', 'anyone', 'qalam.manage', false, false, false, false, null, null, null, null, 380),
  ('f39', 'F-39', 'Qalam publishing consent', 'موافقة النشر في «قلم»', 'site', 'anyone', 'qalam.manage', false, false, false, false, null, null, null, null, 390),
  ('f40', 'F-40', 'Confidentiality pledge', 'تعهد السرية', 'page', 'handler', 'journal.manage', false, false, false, true, null, null, null, null, 400),
  ('f41', 'F-41', 'Reader score sheet', 'ورقة تقييم القارئ', 'page', 'handler', 'journal.manage', false, false, false, true, null, null, null, null, 410),
  ('f42', 'F-42', 'Author letters', 'رسائل الكتّاب', 'page', 'handler', 'journal.manage', false, false, false, true, null, null, null, null, 420),
  ('f43', 'F-43', 'Publication Agreement', 'اتفاقية النشر', 'page', 'member', 'journal.manage', false, false, false, true, null, 'piece', null, null, 430),
  ('f44', 'F-44', 'Contributor and image consent form', 'استمارة موافقة المساهم والصور', 'site', 'anyone', 'journal.manage', false, false, false, false, null, 'piece', null, null, 440),
  ('f45', 'F-45', 'Trip consent', 'الموافقة على الرحلة', 'site', 'member', 'governance.manage', false, false, false, true, null, 'event', null, null, 450);

-- 2. Signed copies: the typed name, the time and the form's version; a
-- second signature where the form has one (a motion's seconder, the
-- Qalam lead's countersignature, the partner's side of a memorandum).
alter table governance.form_submissions
  add column form_version integer not null default 1,
  add column signer_name text check (char_length(signer_name) <= 200),
  add column signed_at timestamptz,
  add column signer_contact text check (char_length(signer_contact) <= 200),
  add column subject_id uuid,
  add column second_signer_name text check (char_length(second_signer_name) <= 200),
  add column second_signer_id uuid references auth.users (id) on delete set null,
  add column second_signed_at timestamptz;
-- Anything sent before typed signatures counts as signed when it was sent.
update governance.form_submissions
set signed_at = coalesce(submitted_at, created_at)
where status <> 'draft';
alter table governance.form_submissions
  add constraint form_submissions_signed check (status = 'draft' or signed_at is not null),
  add constraint form_submissions_signer check (signed_at is null or char_length(btrim(signer_name)) >= 2);
create index form_submissions_second_signer_id_idx on governance.form_submissions (second_signer_id);
create index form_submissions_subject_id_idx on governance.form_submissions (form_key, subject_id);

comment on column governance.form_submissions.signer_name is
  'The signer''s typed name: an electronic signature (E-SIGN, UETA). With signed_at and form_version, the signed copy the site keeps.';
comment on column governance.form_submissions.signer_contact is
  'How to reach a signer without an account (a parent through the school''s teacher, a guest): never shown publicly.';

drop function if exists private.save_form(text, jsonb, uuid, boolean, boolean, uuid, text) cascade;
drop function if exists governance.save_form(text, jsonb, uuid, boolean, boolean, uuid, text);
drop function if exists private.discard_form_draft(uuid) cascade;
drop function if exists governance.discard_form_draft(uuid);

create or replace function private.may_submit_form(form_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from governance.form_types t
    where t.key = may_submit_form.form_key
      and t.filled in ('site', 'page')
      and case t.submit_rule
        when 'anyone' then true
        when 'member' then membership.is_member()
        when 'role_holder' then exists (
          select 1 from access.role_assignments a
          where a.user_id = auth.uid() and a.starts_at <= now()
            and (a.ends_at is null or a.ends_at > now())
        )
        when 'handler' then access.has_permission_anywhere(t.handle_permission)
        else false
      end
  );
$$;

-- Signing a form: the typed name is the signature. Signed copies are kept
-- as signed; a signer without an account gives a way to reach them.
create function private.sign_form(
  form_key text,
  data jsonb,
  signer_name text,
  subject_id uuid default null,
  signer_contact text default null,
  anonymous boolean default false,
  routing text default 'none'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  t governance.form_types;
  new_id uuid;
begin
  select * into t from governance.form_types where key = sign_form.form_key;
  if not found or t.filled <> 'site' then
    raise exception 'unknown_form' using errcode = 'P0002';
  end if;
  if auth.uid() is null and t.needs_account then
    raise exception 'sign_in_required' using errcode = '42501';
  end if;
  if auth.uid() is not null and not private.may_submit_form(t.key) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if auth.uid() is null and not core.take_rate('forms:' || t.key, 60, 3600) then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
  if data is null or jsonb_typeof(data) <> 'object' or length(data::text) > 40000 then
    raise exception 'invalid_data' using errcode = '22023';
  end if;
  -- A concern sent without a name carries no signature either.
  if not anonymous and char_length(btrim(coalesce(sign_form.signer_name, ''))) < 2 then
    raise exception 'signature_required' using errcode = '23514';
  end if;
  if anonymous and not t.anonymous_ok then
    raise exception 'anonymous_not_allowed' using errcode = '22023';
  end if;
  if coalesce(routing, 'none') <> 'none' and t.key <> 'f21' then
    raise exception 'routing_only_for_concerns' using errcode = '22023';
  end if;
  if t.subject_kind = 'event' and t.key = 'f45' and not exists (
    select 1 from events.events e
    where e.id = sign_form.subject_id and e.off_campus and e.status = 'published'
      and private.can_see_event_id(e.id)
  ) then
    raise exception 'not_a_trip' using errcode = '22023';
  end if;

  insert into governance.form_submissions (
    form_key, submitted_by, routing, data, status, submitted_at, form_version,
    signer_name, signed_at, signer_contact, subject_id
  ) values (
    t.key,
    case when anonymous then null else auth.uid() end,
    coalesce(routing, 'none'),
    data,
    'submitted',
    now(),
    t.version,
    case when anonymous then null else btrim(sign_form.signer_name) end,
    now(),
    nullif(btrim(coalesce(sign_form.signer_contact, '')), ''),
    sign_form.subject_id
  )
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function private.sign_form(text, jsonb, text, uuid, text, boolean, text) from public;
grant execute on function private.sign_form(text, jsonb, text, uuid, text, boolean, text) to anon, authenticated;

create function governance.sign_form(
  form_key text,
  data jsonb,
  signer_name text,
  subject_id uuid default null,
  signer_contact text default null,
  anonymous boolean default false,
  routing text default 'none'
)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.sign_form(form_key, data, signer_name, subject_id, signer_contact, anonymous, routing) $$;

revoke all on function governance.sign_form(text, jsonb, text, uuid, text, boolean, text) from public;
grant execute on function governance.sign_form(text, jsonb, text, uuid, text, boolean, text) to anon, authenticated;

-- The second signature: a motion's seconder (another member), the Qalam
-- lead's countersignature, the President's side of a memorandum.
create function private.second_sign_form(submission_id uuid, signer_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s governance.form_submissions;
  t governance.form_types;
begin
  select * into s from governance.form_submissions where id = second_sign_form.submission_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  select * into t from governance.form_types where key = s.form_key;
  if t.second_signer is null or s.second_signed_at is not null then
    raise exception 'not_allowed' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(second_sign_form.signer_name, ''))) < 2 then
    raise exception 'signature_required' using errcode = '23514';
  end if;
  if not (case t.second_signer
    when 'member' then membership.is_member() and s.submitted_by is distinct from auth.uid()
    else access.has_permission_anywhere(t.second_signer)
  end) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update governance.form_submissions
  set second_signer_name = btrim(second_sign_form.signer_name),
      second_signer_id = auth.uid(),
      second_signed_at = now()
  where id = s.id;
end;
$$;

revoke all on function private.second_sign_form(uuid, text) from public, anon;
grant execute on function private.second_sign_form(uuid, text) to authenticated;

create function governance.second_sign_form(submission_id uuid, signer_name text)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.second_sign_form(submission_id, signer_name) $$;

revoke all on function governance.second_sign_form(uuid, text) from public, anon;
grant execute on function governance.second_sign_form(uuid, text) to authenticated;

-- 3. Guest accounts: anyone may create one to RSVP to events (decisions
-- §2). A guest is not a member: no vote, no office, no Register.
create or replace function private.sign_up_allowed(email text, meta jsonb)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select email is null
    or private.is_auib_email(email)
    or coalesce(meta ->> 'partner_applicant', '') = 'true'
    or coalesce(meta ->> 'guest', '') = 'true'
    or exists (
      select 1 from governance.partner_invitations i
      where i.code = nullif(meta ->> 'invitation', '')
        and private.invitation_usable(i)
        and (i.email is null or i.email = lower(sign_up_allowed.email))
    );
$$;

create or replace function private.handle_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null and private.is_auib_email(new.email) then
    perform private.verify_user(new.id);
    update membership.verification_requests
    set status = 'approved', decided_at = now(), decision_note = 'AUIB address confirmed'
    where user_id = new.id and status = 'pending';
  elsif new.email_confirmed_at is not null
    and coalesce(new.raw_user_meta_data ->> 'guest', '') = 'true'
    and private.membership_kind(new.id) is null
  then
    insert into membership.guests (user_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end;
$$;

-- 4. Booking a place: members and guests; an off-campus event needs the
-- participant's signed trip consent (F-45) first.
create or replace function private.rsvp(event_id uuid, answers jsonb default '{}'::jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  e events.events;
begin
  if not (membership.is_member() or private.is_guest((select auth.uid()))) then
    raise exception 'Only members and guests can book' using errcode = '42501';
  end if;

  -- Lock the event so concurrent RSVPs can't overfill it.
  select * into e from events.events where id = rsvp.event_id for update;

  if not found or e.status <> 'published' or not private.can_see_event_id(e.id) then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;
  if e.entry = 'open' then
    raise exception 'This event does not take RSVPs' using errcode = '22023';
  end if;
  if coalesce(e.ends_at, e.starts_at) < now() then
    raise exception 'This event has ended' using errcode = '22023';
  end if;
  if e.off_campus and not exists (
    select 1 from governance.form_submissions s
    where s.form_key = 'f45' and s.subject_id = e.id
      and s.submitted_by = auth.uid() and s.signed_at is not null
  ) then
    raise exception 'trip_consent_required' using errcode = '23514';
  end if;

  if exists (
    select 1 from events.rsvps r
    where r.event_id = e.id and r.user_id = auth.uid() and r.status = 'confirmed'
  ) or exists (
    select 1 from events.waitlist w
    where w.event_id = e.id and w.user_id = auth.uid() and w.status = 'waiting'
  ) then
    return 'already';
  end if;

  if e.capacity is null or events.confirmed_count(e.id) < e.capacity then
    insert into events.rsvps (event_id, user_id, answers)
    values (e.id, auth.uid(), coalesce(rsvp.answers, '{}'));
    perform private.enqueue('events.rsvp_confirmed',
      jsonb_build_object('event_id', e.id, 'user_id', auth.uid()));
    return 'confirmed';
  end if;

  insert into events.waitlist (event_id, user_id, answers)
  values (e.id, auth.uid(), coalesce(rsvp.answers, '{}'));
  return 'waitlisted';
end;
$$;
