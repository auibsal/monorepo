-- Get involved as an application system (decisions.md, Get involved and roles, the American
-- standard for student organizations).
--
-- Openings carry their own questions, whether files are asked for, and who
-- is eligible; a director seat opens only after the Executive Board's
-- approval (its resolution). Applying is a form with a draft: answers,
-- availability, the language, an optional request for accommodation and,
-- for a director seat, the consent to Student Life's GPA check, signed
-- electronically. A receipt goes at once. Withdrawing is a status, kept.
-- The hiring seat and a second reviewer read each application (either may
-- recuse); interviews are scheduled and recorded on F-02; an offer is
-- answered from the applicant's account within 7 days. A team role is
-- assigned on acceptance and starts with the first term; a director seat
-- is assigned only after the Executive Board's resolution and Student
-- Life's "eligible", with no first term. Applicants not chosen hear within
-- 14 days of the closing date; staff alerts carry counts, never names;
-- applications are deleted 12 months after the decision. Skills and
-- volunteer shifts are no longer part of Get involved.

-- ── Openings ────────────────────────────────────────────────────────────────

alter table programmes.openings drop constraint if exists openings_skills_check;
drop function if exists private.open_places();
drop function if exists programmes.open_places();
alter table programmes.openings drop column skills;

alter table programmes.openings
  add column questions jsonb not null default '[]'::jsonb
    check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) <= 8),
  add column asks_files boolean not null default false,
  add column eligibility_en text check (char_length(eligibility_en) <= 600),
  add column eligibility_ar text check (char_length(eligibility_ar) <= 600),
  add column second_reviewer uuid references auth.users (id) on delete set null,
  add column eb_resolution text check (char_length(eb_resolution) <= 40),
  add column eb_approved_at timestamptz;

create index openings_second_reviewer_idx on programmes.openings (second_reviewer);

comment on column programmes.openings.questions is
  'The questions an application answers: [{key, en, ar, required}] (decisions.md, Get involved and roles).';
comment on column programmes.openings.eb_resolution is
  'For a director seat: the Executive Board resolution approving the opening (decisions §4); it opens only once recorded.';

-- A director seat is an appointed Council seat (§4): not the elected
-- President, Vice President or General Secretary, nor the Editor-in-Chief.
create function private.is_director_role(role_key text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select role_key in ('artistic_director', 'events_director', 'partnerships_director',
    'membership_director', 'media_director');
$$;

grant execute on function private.is_director_role(text) to authenticated, service_role;

create function private.director_opening_approved()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_open and private.is_director_role(new.role) and new.eb_approved_at is null then
    raise exception 'eb_approval_first' using errcode = 'P0001',
      hint = 'A director seat opens after the Executive Board approves it (decisions §4).';
  end if;
  return new;
end;
$$;

create trigger director_opening_approved
  before insert or update on programmes.openings
  for each row execute function private.director_opening_approved();

-- The public list (decisions §1): open roles only, rendered on the server.
create function private.open_places()
returns table (
  id uuid, kind text, owner text, role text, title_en text, title_ar text,
  body_en text, body_ar text, eligibility_en text, eligibility_ar text,
  closes_at timestamptz, places integer, event_slug text, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select * from (
    select o.id, o.kind, o.owner, o.role, o.title_en, o.title_ar, o.body_en, o.body_ar,
      o.eligibility_en, o.eligibility_ar, o.closes_at, o.places, e.slug, o.created_at
    from programmes.openings o
    left join events.events e on e.id = o.event_id
    where o.is_open and (o.closes_at is null or o.closes_at > now())
      and (o.event_id is null or (e.status = 'published' and not e.members_only))
    union all
    select a.id, 'audition', 'program', null, pr.title_en, pr.title_ar,
      a.prepare_en, a.prepare_ar, null, null, a.starts_at, a.capacity, null, a.created_at
    from programmes.auditions a
    join programmes.productions pr on pr.id = a.production_id
    where pr.is_public and pr.stage = 'auditions' and a.starts_at > now()
  ) places
  order by places.closes_at nulls last, places.created_at desc;
$$;

revoke all on function private.open_places() from public;
grant execute on function private.open_places() to anon, authenticated, service_role;

create function programmes.open_places()
returns table (
  id uuid, kind text, owner text, role text, title_en text, title_ar text,
  body_en text, body_ar text, eligibility_en text, eligibility_ar text,
  closes_at timestamptz, places integer, event_slug text, created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.open_places() $$;

revoke all on function programmes.open_places() from public;
grant execute on function programmes.open_places() to anon, authenticated, service_role;

-- One opening, as the public reads it (questions included).
create function private.open_place(opening_id uuid)
returns table (
  id uuid, kind text, owner text, role text, title_en text, title_ar text,
  body_en text, body_ar text, eligibility_en text, eligibility_ar text,
  questions jsonb, asks_files boolean, director boolean,
  closes_at timestamptz, places integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, o.kind, o.owner, o.role, o.title_en, o.title_ar, o.body_en, o.body_ar,
    o.eligibility_en, o.eligibility_ar, o.questions, o.asks_files,
    private.is_director_role(o.role), o.closes_at, o.places
  from programmes.openings o
  where o.id = open_place.opening_id
    and o.is_open and (o.closes_at is null or o.closes_at > now());
$$;

revoke all on function private.open_place(uuid) from public;
grant execute on function private.open_place(uuid) to anon, authenticated, service_role;

create function programmes.open_place(opening_id uuid)
returns table (
  id uuid, kind text, owner text, role text, title_en text, title_ar text,
  body_en text, body_ar text, eligibility_en text, eligibility_ar text,
  questions jsonb, asks_files boolean, director boolean,
  closes_at timestamptz, places integer
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.open_place(opening_id) $$;

revoke all on function programmes.open_place(uuid) from public;
grant execute on function programmes.open_place(uuid) to anon, authenticated, service_role;

-- ── Applications ────────────────────────────────────────────────────────────

alter table programmes.opening_replies drop constraint opening_replies_status_check;
alter table programmes.opening_replies add constraint opening_replies_status_check
  check (status = any (array['draft', 'new', 'talking', 'picked', 'not_picked', 'offered',
    'accepted', 'onboarded', 'declined', 'withdrawn']));

alter table programmes.opening_replies
  add column answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  add column availability text check (char_length(availability) <= 600),
  add column lang text check (lang in ('en', 'ar')),
  add column files text[] not null default '{}' check (cardinality(files) <= 5),
  add column accommodation text check (char_length(accommodation) <= 600),
  add column gpa_consent_name text check (char_length(gpa_consent_name) <= 200),
  add column gpa_consent_at timestamptz,
  add column submitted_at timestamptz,
  add column decided_at timestamptz,
  add column offer_expires_at timestamptz,
  add column offer_answered_at timestamptz,
  add column student_life_eligible_at timestamptz,
  add column appointed_by_resolution text check (char_length(appointed_by_resolution) <= 40);

comment on column programmes.opening_replies.status is
  'draft → new (submitted) → talking (interview) → picked (shortlisted) → offered → accepted (a director awaiting the Executive Board and Student Life) → onboarded; or not_picked, declined, withdrawn (kept, decisions.md, Get involved and roles).';

update programmes.opening_replies set submitted_at = created_at where status <> 'draft' and submitted_at is null;

-- Applying, withdrawing and answering an offer go through functions only.
drop policy if exists "Members reply to open openings" on programmes.opening_replies;
drop policy if exists "Members take back their reply" on programmes.opening_replies;
revoke insert, delete on programmes.opening_replies from authenticated;

-- The applicant sees their own application; the handlers see submitted
-- ones only (a draft stays the applicant's).
drop policy "Select by authenticated" on programmes.opening_replies;
create policy "Select by authenticated" on programmes.opening_replies
  for select to authenticated
  using (user_id = (select auth.uid())
    or (status <> 'draft' and (select private.handles_opening_id(opening_replies.opening_id))));

-- The typed name signs the GPA-check consent: it must be the account's
-- legal name (decisions §10, Electronic signatures).
create function private.matches_legal_name(uid uuid, typed text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from core.profiles p
    where p.id = uid and lower(regexp_replace(btrim(typed), '\s+', ' ', 'g')) in (
      lower(concat_ws(' ', p.first_name_en, p.last_name_en)),
      lower(concat_ws(' ', p.first_name_en, p.father_name_en, p.grandfather_name_en, p.last_name_en)),
      lower(concat_ws(' ', p.first_name_ar, p.last_name_ar)),
      lower(concat_ws(' ', p.first_name_ar, p.father_name_ar, p.grandfather_name_ar, p.last_name_ar)))
  );
$$;

-- Saves the application; `submit` sends it. A draft can be saved any
-- number of times while the opening is open.
create function private.save_application(
  opening_id uuid,
  answers jsonb,
  availability text,
  lang text,
  files text[],
  accommodation text,
  gpa_consent_name text,
  submit boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  o programmes.openings;
  uid uuid := auth.uid();
  existing programmes.opening_replies;
  q jsonb;
begin
  if uid is null or not private.membership_is_member() then
    raise exception 'members_apply' using errcode = '42501';
  end if;
  select * into o from programmes.openings x
  where x.id = save_application.opening_id and x.is_open and (x.closes_at is null or x.closes_at > now());
  if not found then
    raise exception 'opening_closed' using errcode = 'P0001';
  end if;
  select * into existing from programmes.opening_replies r
  where r.opening_id = o.id and r.user_id = uid;
  if found and existing.status not in ('draft', 'withdrawn') then
    raise exception 'already_applied' using errcode = 'P0001';
  end if;
  if submit then
    for q in select * from jsonb_array_elements(o.questions) loop
      if coalesce((q ->> 'required')::boolean, false)
        and coalesce(btrim(answers ->> (q ->> 'key')), '') = '' then
        raise exception 'answer_required' using errcode = '22023';
      end if;
    end loop;
    if private.is_director_role(o.role) then
      if gpa_consent_name is null or not private.matches_legal_name(uid, gpa_consent_name) then
        raise exception 'gpa_consent_name' using errcode = '22023',
          hint = 'Type your legal name, as on the account, to consent to the GPA check.';
      end if;
      -- Council seats wait for 18 (§10, Minors).
      if private.is_minor(uid) then
        raise exception 'council_seat_under_18' using errcode = 'P0001';
      end if;
    end if;
  end if;
  perform set_config('sal.applicant', 'on', true);
  insert into programmes.opening_replies as r (opening_id, user_id, status, answers, availability, lang,
    files, accommodation, gpa_consent_name, gpa_consent_at, submitted_at)
  values (o.id, uid, case when submit then 'new' else 'draft' end,
    coalesce(answers, '{}'::jsonb), nullif(btrim(availability), ''), lang,
    coalesce(files, '{}'), nullif(btrim(accommodation), ''),
    case when private.is_director_role(o.role) then nullif(btrim(gpa_consent_name), '') end,
    case when submit and private.is_director_role(o.role) then now() end,
    case when submit then now() end)
  on conflict on constraint opening_replies_pkey do update set
    status = excluded.status,
    answers = excluded.answers,
    availability = excluded.availability,
    lang = excluded.lang,
    files = excluded.files,
    accommodation = excluded.accommodation,
    gpa_consent_name = excluded.gpa_consent_name,
    gpa_consent_at = excluded.gpa_consent_at,
    submitted_at = excluded.submitted_at,
    decided_at = null;
  perform set_config('sal.applicant', 'off', true);
  if submit then
    perform private.enqueue('get_involved.received',
      jsonb_build_object('opening_id', o.id, 'user_id', uid));
  end if;
  return case when submit then 'new' else 'draft' end;
end;
$$;

revoke all on function private.save_application(uuid, jsonb, text, text, text[], text, text, boolean) from public, anon;
grant execute on function private.save_application(uuid, jsonb, text, text, text[], text, text, boolean) to authenticated;

create function programmes.save_application(
  opening_id uuid,
  answers jsonb,
  availability text,
  lang text,
  files text[],
  accommodation text,
  gpa_consent_name text,
  submit boolean
)
returns text
language sql
security invoker
set search_path = ''
as $$ select private.save_application(opening_id, answers, availability, lang, files, accommodation, gpa_consent_name, submit) $$;

revoke all on function programmes.save_application(uuid, jsonb, text, text, text[], text, text, boolean) from public, anon;
grant execute on function programmes.save_application(uuid, jsonb, text, text, text[], text, text, boolean) to authenticated;

-- Withdrawing keeps the application, as withdrawn.
create function private.withdraw_application(opening_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  done boolean;
begin
  perform set_config('sal.applicant', 'on', true);
  update programmes.opening_replies r
  set status = 'withdrawn', decided_at = now()
  where r.opening_id = withdraw_application.opening_id and r.user_id = auth.uid()
    and r.status in ('draft', 'new', 'talking', 'picked', 'offered');
  done := found;
  perform set_config('sal.applicant', 'off', true);
  return done;
end;
$$;

revoke all on function private.withdraw_application(uuid) from public, anon;
grant execute on function private.withdraw_application(uuid) to authenticated;

create function programmes.withdraw_application(opening_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.withdraw_application(opening_id) $$;

revoke all on function programmes.withdraw_application(uuid) from public, anon;
grant execute on function programmes.withdraw_application(uuid) to authenticated;

-- An offer is answered within 7 days from the applicant's account. A
-- team role is assigned at once (the first term starts); a director seat
-- waits for the Executive Board and Student Life.
create function private.answer_offer(opening_id uuid, accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  r programmes.opening_replies;
  o programmes.openings;
  next_status text;
begin
  select * into r from programmes.opening_replies x
  where x.opening_id = answer_offer.opening_id and x.user_id = auth.uid() for update;
  if not found or r.status <> 'offered' then
    raise exception 'no_offer' using errcode = 'P0001';
  end if;
  if r.offer_expires_at is not null and r.offer_expires_at < now() then
    raise exception 'offer_expired' using errcode = 'P0001';
  end if;
  select * into o from programmes.openings where id = r.opening_id;
  next_status := case
    when not accept then 'declined'
    when private.is_director_role(o.role) then 'accepted'
    else 'onboarded' end;
  -- The guard lets the applicant move only their own offer, here.
  perform set_config('sal.applicant', 'on', true);
  update programmes.opening_replies x
  set status = next_status, offer_answered_at = now(),
    decided_at = case when next_status in ('declined', 'onboarded') then now() else x.decided_at end
  where x.opening_id = r.opening_id and x.user_id = r.user_id;
  perform set_config('sal.applicant', 'off', true);
  return next_status;
end;
$$;

revoke all on function private.answer_offer(uuid, boolean) from public, anon;
grant execute on function private.answer_offer(uuid, boolean) to authenticated;

create function programmes.answer_offer(opening_id uuid, accept boolean)
returns text
language sql
security invoker
set search_path = ''
as $$ select private.answer_offer(opening_id, accept) $$;

revoke all on function programmes.answer_offer(uuid, boolean) from public, anon;
grant execute on function programmes.answer_offer(uuid, boolean) to authenticated;

-- The guard: the hiring seat picks; Membership schedules and offers; the
-- applicant moves only their own offer (through answer_offer). Offers last
-- 7 days; a decision is dated for the 12-month deletion.
create or replace function private.opening_reply_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  o programmes.openings;
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if new.opening_id <> old.opening_id or new.user_id <> old.user_id then
    raise exception 'reply_fixed' using errcode = '42501';
  end if;
  if new.user_id = (select auth.uid()) then
    -- Saving, withdrawing and answering an offer, through their functions.
    if current_setting('sal.applicant', true) = 'on' then
      return new;
    end if;
    raise exception 'not_your_own' using errcode = '42501';
  end if;
  if old.status = 'draft' then
    raise exception 'still_a_draft' using errcode = '42501';
  end if;
  select * into o from programmes.openings where id = new.opening_id;
  if new.status in ('picked', 'not_picked') and new.status is distinct from old.status then
    if not private.picks_opening(o.owner, o.programme_id) then
      raise exception 'the_owner_picks' using errcode = '42501';
    end if;
    new.picked_by := (select auth.uid());
    new.picked_at := now();
  elsif new.status is distinct from old.status or new.talk_at is distinct from old.talk_at then
    if not private.handles_opening(o.owner, o.programme_id) then
      raise exception 'membership_runs_hiring' using errcode = '42501';
    end if;
    if new.status = 'offered' and old.status not in ('picked', 'offered') then
      raise exception 'pick_first' using errcode = '22023';
    end if;
    -- Only acceptance (the applicant) or the appointment (below) onboards.
    if new.status in ('onboarded', 'accepted') and new.status is distinct from old.status
      and current_setting('sal.appointing', true) is distinct from 'on' then
      raise exception 'the_applicant_accepts' using errcode = '42501';
    end if;
  end if;
  if new.status = 'offered' and old.status is distinct from 'offered' then
    new.offer_expires_at := now() + interval '7 days';
  end if;
  if new.status in ('not_picked', 'declined', 'withdrawn', 'onboarded')
    and new.status is distinct from old.status then
    new.decided_at := now();
  end if;
  if new.status not in ('picked', 'not_picked') then
    new.picked_by := old.picked_by;
    new.picked_at := old.picked_at;
  end if;
  return new;
end;
$$;

-- A team role is assigned on acceptance and starts its first term
-- (confirmed later by whoever appointed); a director seat is assigned in
-- appoint_director, confirmed at once (no probation, decisions §4).
create or replace function private.onboarded_takes_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  o programmes.openings;
  r access.roles;
  director boolean;
begin
  if new.status <> 'onboarded' or old.status = 'onboarded' then
    return new;
  end if;
  select * into o from programmes.openings where id = new.opening_id;
  if o.role is null then
    return new;
  end if;
  select * into r from access.roles where key = o.role;
  director := private.is_director_role(o.role);
  if exists (
    select 1 from access.role_assignments a
    where a.user_id = new.user_id and a.role = o.role
      and (a.ends_at is null or a.ends_at > now())
  ) then
    return new;
  end if;
  insert into access.role_assignments (user_id, role, scope_type, title_en, title_ar, assigned_by,
    confirmed_at, student_life_answer, student_life_answered_at, note)
  values (
    new.user_id, o.role, 'global',
    case when o.title_en <> r.name_en and not director then left(o.title_en, 120) end,
    case when o.title_ar <> r.name_ar and not director then left(o.title_ar, 120) end,
    (select auth.uid()),
    case when director then now() end,
    case when director then 'eligible' end,
    case when director then new.student_life_eligible_at end,
    case when director then 'Executive Board resolution ' || new.appointed_by_resolution end
  );
  return new;
end;
$$;

-- Student Life's answer on the GPA check, recorded by Membership.
create function private.record_student_life_answer(opening_id uuid, user_id uuid, eligible boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('members.manage') then
    raise exception 'membership_runs_hiring' using errcode = '42501';
  end if;
  update programmes.opening_replies r
  set student_life_eligible_at = case when eligible then now() end
  where r.opening_id = record_student_life_answer.opening_id
    and r.user_id = record_student_life_answer.user_id;
  return found;
end;
$$;

revoke all on function private.record_student_life_answer(uuid, uuid, boolean) from public, anon;
grant execute on function private.record_student_life_answer(uuid, uuid, boolean) to authenticated;

create function programmes.record_student_life_answer(opening_id uuid, user_id uuid, eligible boolean)
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.record_student_life_answer(opening_id, user_id, eligible) $$;

revoke all on function programmes.record_student_life_answer(uuid, uuid, boolean) from public, anon;
grant execute on function programmes.record_student_life_answer(uuid, uuid, boolean) to authenticated;

-- The appointment of a director who accepted: only after the Executive
-- Board's resolution and Student Life's "eligible" (decisions §4).
create function private.appoint_director(opening_id uuid, user_id uuid, resolution text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  r programmes.opening_replies;
begin
  if not (access.has_permission('roles.assign') and access.has_permission('governance.manage')) then
    raise exception 'the_president_appoints' using errcode = '42501';
  end if;
  select * into r from programmes.opening_replies x
  where x.opening_id = appoint_director.opening_id and x.user_id = appoint_director.user_id for update;
  if not found or r.status <> 'accepted' then
    raise exception 'not_accepted' using errcode = 'P0001';
  end if;
  if r.student_life_eligible_at is null then
    raise exception 'student_life_first' using errcode = 'P0001';
  end if;
  if coalesce(btrim(resolution), '') = '' then
    raise exception 'resolution_first' using errcode = '22023';
  end if;
  perform set_config('sal.appointing', 'on', true);
  update programmes.opening_replies x
  set status = 'onboarded', appointed_by_resolution = btrim(resolution)
  where x.opening_id = r.opening_id and x.user_id = r.user_id;
  perform set_config('sal.appointing', 'off', true);
  return true;
end;
$$;

revoke all on function private.appoint_director(uuid, uuid, text) from public, anon;
grant execute on function private.appoint_director(uuid, uuid, text) to authenticated;

create function programmes.appoint_director(opening_id uuid, user_id uuid, resolution text)
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.appoint_director(opening_id, user_id, resolution) $$;

revoke all on function programmes.appoint_director(uuid, uuid, text) from public, anon;
grant execute on function programmes.appoint_director(uuid, uuid, text) to authenticated;

-- What the applicant hears: interviews, offers, not chosen, and the
-- appointment by the role's own email.
create or replace function private.after_reply_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.status is distinct from old.status
        and new.status in ('talking', 'offered', 'not_picked', 'accepted'))
     or (new.status = 'talking' and new.talk_at is not null
        and new.talk_at is distinct from old.talk_at) then
    perform private.enqueue('get_involved.reply_update',
      jsonb_build_object('opening_id', new.opening_id, 'user_id', new.user_id,
        'status', new.status));
  end if;
  return new;
end;
$$;

-- ── Review, interviews (F-02), auditions (F-25) ─────────────────────────────

-- Each reviewer's reading: the hiring seat and the opening's second
-- reviewer; either recuses instead of scoring (a conflict of interest).
create table programmes.application_reviews (
  opening_id uuid not null,
  applicant uuid not null,
  reviewer uuid not null references auth.users (id) on delete cascade,
  recused boolean not null default false,
  score smallint check (score between 1 and 5),
  notes text check (char_length(notes) <= 2000),
  updated_at timestamptz not null default now(),
  primary key (opening_id, applicant, reviewer),
  foreign key (opening_id, applicant) references programmes.opening_replies (opening_id, user_id) on delete cascade,
  check (not recused or (score is null and notes is null))
);

create index application_reviews_reviewer_idx on programmes.application_reviews (reviewer);

-- F-02: the interview score sheet, a Diwan record.
create table programmes.interview_records (
  id uuid primary key default gen_random_uuid(),
  opening_id uuid not null,
  applicant uuid not null,
  interviewer uuid not null references auth.users (id) on delete cascade,
  held_at timestamptz not null default now(),
  scores jsonb not null default '{}'::jsonb check (jsonb_typeof(scores) = 'object'),
  notes text check (char_length(notes) <= 4000),
  recommendation text check (recommendation in ('appoint', 'second_choice', 'not_now')),
  created_at timestamptz not null default now(),
  foreign key (opening_id, applicant) references programmes.opening_replies (opening_id, user_id) on delete cascade
);

create index interview_records_reply_idx on programmes.interview_records (opening_id, applicant);
create index interview_records_interviewer_idx on programmes.interview_records (interviewer);

-- F-25: the audition score sheet, a Diwan record per signup.
create table programmes.audition_scores (
  audition_id uuid not null,
  user_id uuid not null,
  scorer uuid not null references auth.users (id) on delete cascade,
  scores jsonb not null default '{}'::jsonb check (jsonb_typeof(scores) = 'object'),
  notes text check (char_length(notes) <= 2000),
  updated_at timestamptz not null default now(),
  primary key (audition_id, user_id, scorer),
  foreign key (audition_id, user_id) references programmes.audition_signups (audition_id, user_id) on delete cascade
);

create index audition_scores_scorer_idx on programmes.audition_scores (scorer);

-- Who reviews an opening: its handlers and its second reviewer.
create function private.reviews_opening(opening_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.handles_opening_id(reviews_opening.opening_id)
    or exists (select 1 from programmes.openings o
      where o.id = reviews_opening.opening_id and o.second_reviewer = (select auth.uid()));
$$;

revoke all on function private.reviews_opening(uuid) from public, anon;
grant execute on function private.reviews_opening(uuid) to authenticated;

alter table programmes.application_reviews enable row level security;
alter table programmes.interview_records enable row level security;
alter table programmes.audition_scores enable row level security;

create policy "No third-party apps" on programmes.application_reviews
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('programmes')))
  with check ((select private.client_allows('programmes')));
create policy "No third-party apps" on programmes.interview_records
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('programmes')))
  with check ((select private.client_allows('programmes')));
create policy "No third-party apps" on programmes.audition_scores
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('programmes')))
  with check ((select private.client_allows('programmes')));

create policy "Reviewers read the opening's reviews" on programmes.application_reviews
  for select to authenticated
  using ((select private.reviews_opening(application_reviews.opening_id)));
create policy "Reviewers write their own review" on programmes.application_reviews
  for insert to authenticated
  with check (reviewer = (select auth.uid()) and (select private.reviews_opening(application_reviews.opening_id))
    and applicant <> (select auth.uid()));
create policy "Reviewers change their own review" on programmes.application_reviews
  for update to authenticated
  using (reviewer = (select auth.uid()))
  with check (reviewer = (select auth.uid()));

create policy "Reviewers read the interview records" on programmes.interview_records
  for select to authenticated
  using ((select private.reviews_opening(interview_records.opening_id)));
create policy "Interviewers record interviews" on programmes.interview_records
  for insert to authenticated
  with check (interviewer = (select auth.uid()) and (select private.reviews_opening(interview_records.opening_id))
    and applicant <> (select auth.uid()));
create policy "Interviewers correct their record" on programmes.interview_records
  for update to authenticated
  using (interviewer = (select auth.uid()))
  with check (interviewer = (select auth.uid()));

create policy "The Company reads audition scores" on programmes.audition_scores
  for select to authenticated
  using ((select private.has_permission('productions.manage')));
create policy "The Company scores auditions" on programmes.audition_scores
  for insert to authenticated
  with check (scorer = (select auth.uid()) and (select private.has_permission('productions.manage'))
    and user_id <> (select auth.uid()));
create policy "Scorers correct their scores" on programmes.audition_scores
  for update to authenticated
  using (scorer = (select auth.uid()))
  with check (scorer = (select auth.uid()));

grant select, insert, update on programmes.application_reviews to authenticated;
grant select, insert, update on programmes.interview_records to authenticated;
grant select, insert, update on programmes.audition_scores to authenticated;
grant all on programmes.application_reviews, programmes.interview_records, programmes.audition_scores to service_role;

create trigger set_updated_at before update on programmes.application_reviews
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on programmes.audition_scores
  for each row execute function private.set_updated_at();

update governance.form_types set filled = 'page', submit_rule = 'handler' where key in ('f02', 'f25');

-- ── The daily close-out ─────────────────────────────────────────────────────

-- Offers not answered in 7 days lapse; applicants still waiting 14 days
-- after an opening closed are told they weren't chosen.
create function private.close_out_applications()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer := 0;
  m integer;
begin
  update programmes.opening_replies r
  set status = 'declined', decided_at = now()
  where r.status = 'offered' and r.offer_expires_at < now();
  get diagnostics m = row_count;
  n := n + m;
  update programmes.opening_replies r
  set status = 'not_picked', decided_at = now()
  from programmes.openings o
  where o.id = r.opening_id and r.status in ('new', 'talking', 'picked')
    and o.closes_at is not null and o.closes_at + interval '14 days' < now();
  get diagnostics m = row_count;
  return n + m;
end;
$$;

revoke all on function private.close_out_applications() from public, anon, authenticated;

select cron.schedule('sal-applications', '45 4 * * *', $$ select private.close_out_applications() $$);

-- Applications go 12 months after the decision (drafts 12 months after
-- the last change).
create or replace function private.purge_opening_replies()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from programmes.opening_replies r
  where (r.decided_at is not null and r.decided_at < now() - interval '12 months')
    or (r.status = 'draft' and r.updated_at < now() - interval '12 months');
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ── The postings that open now (decisions.md, Get involved and roles) ────────────────────

update programmes.openings set is_open = false where role = 'games_editor';
update programmes.openings set is_open = true where role in ('news_editor', 'voices_editor', 'video_editor');

update programmes.openings
set questions = '[
  {"key": "why", "en": "Why this role, and what would you bring to it?", "ar": "لماذا هذا الدور، وماذا ستضيف إليه؟", "required": true},
  {"key": "experience", "en": "Your experience, with links to work if you have them", "ar": "خبرتك، مع روابط لأعمالك إن وُجدت", "required": true}
]'::jsonb
where kind = 'role' and questions = '[]'::jsonb;

insert into programmes.openings (kind, owner, role, title_en, title_ar, body_en, body_ar, places, is_open, questions, asks_files)
select v.kind, 'qirtas', v.role, v.title_en, v.title_ar, v.body_en, v.body_ar, v.places, true,
  '[
    {"key": "why", "en": "Why this role, and what would you bring to it?", "ar": "لماذا هذا الدور، وماذا ستضيف إليه؟", "required": true},
    {"key": "experience", "en": "Your experience, with links to work if you have them", "ar": "خبرتك، مع روابط لأعمالك إن وُجدت", "required": true}
  ]'::jsonb, true
from (values
  ('role', 'gallery_editor', 'Gallery Editor', 'محرر المعرض',
    'Gallery is Qirtas''s section for art, photography, illustration, comics and calligraphy. The Gallery editor reads what members send, works with the artists on their pieces and prepares them for the site and the Edition.',
    'المعرض قسم قرطاس للفن والتصوير والرسم التوضيحي والقصص المصوّرة والخط. يقرأ محرر المعرض ما يرسله الأعضاء، ويعمل مع الفنانين على أعمالهم، ويعدّها للموقع وللإصدار.', 1),
  ('role', 'copy_editor', 'Copy Chief', 'رئيس التدقيق',
    'The Copy Chief checks every piece before it is published: spelling, grammar, facts and Qirtas''s style (the Chicago Manual of Style in English; the Editorial Standards in Arabic).',
    'يدقّق رئيس التدقيق كل عمل قبل نشره: الإملاء والنحو والحقائق وأسلوب قرطاس (دليل شيكاغو للأسلوب بالإنجليزية، ومعايير التحرير بالعربية).', 1),
  ('role', 'reader', 'Reader', 'قارئ',
    'Readers read the work members send to Qirtas, blind, and score it for the editors. A few hours a month, from your own account.',
    'يقرأ القرّاء الأعمال التي يرسلها الأعضاء إلى قرطاس دون معرفة كتّابها، ويقيّمونها للمحررين. بضع ساعات في الشهر، من حسابك.', 6)
) as v(kind, role, title_en, title_ar, body_en, body_ar, places)
where not exists (select 1 from programmes.openings o where o.role = v.role and o.is_open);

-- The four appointed director seats: one opening each, closing Thursday,
-- December 10 (decisions §7). They open once the Executive Board approves
-- them (§4), so they wait here, closed.
insert into programmes.openings (kind, owner, role, title_en, title_ar, body_en, body_ar, places, is_open,
  closes_at, questions, eligibility_en, eligibility_ar)
select 'role', 'council', v.role, v.title_en, v.title_ar, v.body_en, v.body_ar, 1, false,
  '2026-12-10 23:59:00+03'::timestamptz,
  '[
    {"key": "why", "en": "Why this seat, and what would you bring to it?", "ar": "لماذا هذا المقعد، وماذا ستضيف إليه؟", "required": true},
    {"key": "plan", "en": "What would you do in your first months?", "ar": "ماذا ستفعل في أشهرك الأولى؟", "required": true},
    {"key": "experience", "en": "Your experience leading or organizing", "ar": "خبرتك في القيادة أو التنظيم", "required": true}
  ]'::jsonb,
  'A Student Member in good standing, enrolled, with a GPA of at least 2.0 (Student Life checks it, with your consent).',
  'عضو طالب في وضع جيد، مسجّل في الجامعة، ومعدله التراكمي 2.0 على الأقل (تتحقق منه شؤون الطلبة بموافقتك).'
from (values
  ('artistic_director', 'Artistic Director', 'المدير الفني',
    'The Artistic Director leads the Company, the Society''s theater company: its productions, auditions and rehearsals, with the Arts Manual.',
    'يقود المدير الفني الفرقة، فرقة الجمعية المسرحية: عروضها وتجارب الأداء والتدريبات، وفق دليل الفنون.'),
  ('events_director', 'Director of Events', 'مدير الفعاليات',
    'The Director of Events leads the events team: every event''s place, lead and needs, from the Events Manual.',
    'يقود مدير الفعاليات فريق الفعاليات: مكان كل فعالية وقائدها واحتياجاتها، وفق دليل الفعاليات.'),
  ('partnerships_director', 'Director of Partnerships', 'مدير الشراكات',
    'The Director of Partnerships keeps the partner register and the memoranda, and works with partners on events, from the Partnerships Manual.',
    'يحفظ مدير الشراكات سجل الشركاء والمذكرات، ويعمل مع الشركاء على الفعاليات، وفق دليل الشراكات.'),
  ('membership_director', 'Director of Membership', 'مدير العضوية',
    'The Director of Membership keeps the Register, runs Get involved and the Typewriter Tour, and welcomes new members, from the Membership Manual.',
    'يحفظ مدير العضوية سجل الأعضاء، ويدير «شارك معنا» و«جولة الآلة الكاتبة»، ويستقبل الأعضاء الجدد، وفق دليل العضوية.')
) as v(role, title_en, title_ar, body_en, body_ar)
where not exists (select 1 from programmes.openings o where o.role = v.role);
