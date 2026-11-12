-- Qalam's students have accounts (decisions.md, Qirtas: Qalam's shape,
-- Accounts; Members: no name fields; the fifth prompt, 3 and 4).
--
-- * Qalam's application, the parent's consent (F-38), makes each
--   student's guest account with the "Qalam student" role: the name typed
--   on it becomes the account's own name, the one place it is typed. The
--   roster is the list of those accounts; nobody types a student's name
--   into it.
-- * The publishing release (F-39) is sent for a student on the roster, so
--   it carries no typed name or school.
-- * The role ends with the program (finished, withdrawn or declined); the
--   guest account stays.
-- * The card of a Qalam student shows the first name and last initial,
--   the school and the year, like the certificate's check page.
--
-- The roster was empty in production when this ran (no student, consent
-- or certificate yet; the first run is summer 2028).

-- ── The roster is a list of accounts ───────────────────────────────────────

delete from programmes.qalam_students;

alter table programmes.qalam_students
  drop column first_name,
  drop column last_name,
  add column user_id uuid not null references auth.users (id) on delete cascade;

-- One row per student and summer.
create unique index qalam_students_user_year_key on programmes.qalam_students (user_id, year);

comment on table programmes.qalam_students is
  'Qalam''s roster: one row per student account and summer, made by the parent''s consent (F-38). Names come from the account. Staff only (qalam.manage), never in Notion. Deleted three years after the program''s year, with their consent forms.';

-- Staff keep the roster's own fields; rows come only from the consent.
revoke insert on programmes.qalam_students from authenticated;
revoke update on programmes.qalam_students from authenticated;
grant update (school, grade, status, photos_allowed, publishing_allowed, sessions_attended, note)
  on programmes.qalam_students to authenticated;
drop policy "Qalam's staff add students" on programmes.qalam_students;

-- Whether someone holds the Qalam student role now.
create function private.is_qalam_student(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from access.role_assignments a
    where a.user_id = uid and a.role = 'qalam_student'
      and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now())
  );
$$;
revoke all on function private.is_qalam_student(uuid) from public, anon;
grant execute on function private.is_qalam_student(uuid) to authenticated, service_role;

-- The roster with each student's name from their account (qalam.manage).
create function private.qalam_roster(year integer default null)
returns table (
  id uuid, user_id uuid, full_name_en text, full_name_ar text,
  school text, grade text, year integer, status text,
  sessions_attended integer, photos_allowed boolean, publishing_allowed boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select q.id, q.user_id, p.full_name_en, p.full_name_ar,
    q.school, q.grade, q.year, q.status,
    q.sessions_attended, q.photos_allowed, q.publishing_allowed
  from programmes.qalam_students q
  join core.profiles p on p.id = q.user_id
  where private.has_permission('qalam.manage')
    and (qalam_roster.year is null or q.year = qalam_roster.year)
  order by q.year desc, p.full_name_en;
$$;
revoke all on function private.qalam_roster(integer) from public, anon;
grant execute on function private.qalam_roster(integer) to authenticated;

create function programmes.qalam_roster(year integer default null)
returns table (
  id uuid, user_id uuid, full_name_en text, full_name_ar text,
  school text, grade text, year integer, status text,
  sessions_attended integer, photos_allowed boolean, publishing_allowed boolean
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.qalam_roster($1) $$;
revoke all on function programmes.qalam_roster(integer) from public, anon;
grant execute on function programmes.qalam_roster(integer) to authenticated, service_role;

-- ── The consent makes the account ──────────────────────────────────────────

-- Called by the API route once F-38 is signed and the student's account is
-- found or made by the address on it: the student becomes a guest with the
-- Qalam student role, on this summer's roster with the consent's answers.
create function private.qalam_enroll(submission_id uuid, student uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  f governance.form_submissions;
  run integer := extract(year from now() at time zone 'Asia/Baghdad')::integer;
  row_id uuid;
begin
  select * into f from governance.form_submissions s
  where s.id = qalam_enroll.submission_id and s.form_key = 'f38' and s.status <> 'draft';
  if not found or student is null then
    raise exception 'not_a_qalam_consent' using errcode = '22023';
  end if;

  if private.membership_kind(student) is null then
    insert into membership.guests (user_id) values (student)
    on conflict (user_id) do update set ended_at = null;
  end if;

  insert into programmes.qalam_students (
    user_id, year, school, grade, consent_form_id, photos_allowed, publishing_allowed
  )
  values (
    student, greatest(run, 2028),
    left(btrim(coalesce(f.data ->> 'school', '')), 200),
    nullif(left(btrim(coalesce(f.data ->> 'grade', '')), 40), ''),
    f.id,
    f.data ->> 'photos' = 'photos',
    jsonb_typeof(f.data -> 'publishing') = 'array' and jsonb_array_length(f.data -> 'publishing') > 0
  )
  on conflict (user_id, year) do update
    set consent_form_id = excluded.consent_form_id,
        school = excluded.school,
        grade = excluded.grade,
        photos_allowed = excluded.photos_allowed,
        publishing_allowed = excluded.publishing_allowed
  returning id into row_id;

  if not private.is_qalam_student(student) then
    insert into access.role_assignments (user_id, role, starts_at, note)
    values (student, 'qalam_student', now(), 'By the parent''s consent (F-38)');
  end if;

  update governance.form_submissions set subject_user_id = student
  where id = f.id and subject_user_id is null;
  return row_id;
end;
$$;
revoke all on function private.qalam_enroll(uuid, uuid) from public, anon, authenticated;
grant execute on function private.qalam_enroll(uuid, uuid) to service_role;

create function programmes.qalam_enroll(submission_id uuid, student uuid)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.qalam_enroll($1, $2) $$;
revoke all on function programmes.qalam_enroll(uuid, uuid) from public, anon, authenticated;
grant execute on function programmes.qalam_enroll(uuid, uuid) to service_role;

-- The role ends with the program; the guest account stays.
create function private.qalam_role_follows_roster()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('finished', 'withdrawn', 'declined') and old.status is distinct from new.status then
    update access.role_assignments
    set ends_at = now()
    where user_id = new.user_id and role = 'qalam_student'
      and starts_at < now() and (ends_at is null or ends_at > now());
    -- One given this very moment simply goes.
    delete from access.role_assignments
    where user_id = new.user_id and role = 'qalam_student' and starts_at >= now();
  end if;
  return new;
end;
$$;
revoke all on function private.qalam_role_follows_roster() from public, anon, authenticated;

create trigger qalam_role_follows_roster
  after update of status on programmes.qalam_students
  for each row execute function private.qalam_role_follows_roster();

-- ── The release is sent for a student on the roster ───────────────────────

create function private.qalam_release_link(student_row uuid, sent_to text, note text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text := encode(extensions.gen_random_bytes(24), 'hex');
  student uuid;
  new_id uuid;
begin
  if not private.has_permission('qalam.manage') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select q.user_id into student from programmes.qalam_students q where q.id = student_row;
  if student is null then
    raise exception 'Student not found' using errcode = 'P0002';
  end if;
  if sent_to is null or sent_to !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'An email address is needed' using errcode = '22023';
  end if;
  insert into governance.form_links (form_key, sent_to, note, token_hash, subject_user)
  values ('f39', lower(btrim(sent_to)), nullif(btrim(coalesce(note, '')), ''),
    encode(extensions.digest(token, 'sha256'), 'hex'), student)
  returning id into new_id;
  perform private.enqueue('forms.link', jsonb_build_object(
    'link_id', new_id, 'token', token, 'form_key', 'f39'));
  return new_id;
end;
$$;
revoke all on function private.qalam_release_link(uuid, text, text) from public, anon;
grant execute on function private.qalam_release_link(uuid, text, text) to authenticated;

create function programmes.qalam_release_link(student_row uuid, sent_to text, note text default null)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.qalam_release_link($1, $2, $3) $$;
revoke all on function programmes.qalam_release_link(uuid, text, text) from public, anon;
grant execute on function programmes.qalam_release_link(uuid, text, text) to authenticated, service_role;

-- A form signed by link is about the person the link was for.
create function private.link_names_subject()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.submission_id is not null and old.submission_id is null and new.subject_user is not null then
    update governance.form_submissions set subject_user_id = new.subject_user
    where id = new.submission_id and subject_user_id is null;
  end if;
  return new;
end;
$$;
revoke all on function private.link_names_subject() from public, anon, authenticated;

create trigger link_names_subject
  after update of submission_id on governance.form_links
  for each row execute function private.link_names_subject();

-- ── The card and the certificate ──────────────────────────────────────────

-- The first name and last initial: an under-18's card, a Qalam student's
-- card, and a Qalam certificate's check page (decisions.md, the card;
-- Certificates).
create function private.initial_name(uid uuid, lang text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  -- The name's parts where the account has them, else its full name's
  -- first and last words.
  select nullif(btrim(concat_ws(' ', n.first,
    case when lang = 'ar' then left(n.last, 1) else upper(left(n.last, 1)) end || '.')), '.')
  from core.profiles p
  cross join lateral (
    select
      coalesce(nullif(btrim(case lang when 'ar' then p.first_name_ar else p.first_name_en end), ''),
        split_part(btrim(case lang when 'ar' then p.full_name_ar else p.full_name_en end), ' ', 1)) as first,
      coalesce(
        nullif(btrim(case lang when 'ar' then coalesce(p.last_name_ar, p.father_name_ar)
          else coalesce(p.last_name_en, p.father_name_en) end), ''),
        nullif(substring(btrim(case lang when 'ar' then p.full_name_ar else p.full_name_en end) from '\s(\S+)$'), '')) as last
  ) n
  where p.id = uid;
$$;
revoke all on function private.initial_name(uuid, text) from public, anon;
grant execute on function private.initial_name(uuid, text) to authenticated, service_role;

create or replace function private.card_name(uid uuid, lang text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.is_minor(p.id) or private.is_qalam_student(p.id) then private.initial_name(p.id, lang)
    else case lang when 'ar' then coalesce(p.full_name_ar, p.full_name_en) else p.full_name_en end
  end
  from core.profiles p where p.id = uid;
$$;

-- The school and year of a Qalam student's latest summer, while the role
-- lasts: shown on the card and its check page.
create function private.card_qalam(uid uuid)
returns table (school text, year integer)
language sql
stable
security definer
set search_path = ''
as $$
  select q.school, q.year
  from programmes.qalam_students q
  where q.user_id = uid and private.is_qalam_student(uid)
  order by q.year desc
  limit 1;
$$;
revoke all on function private.card_qalam(uuid) from public, anon;
grant execute on function private.card_qalam(uuid) to authenticated, service_role;

create function private.my_card_qalam()
returns table (school text, year integer)
language sql
stable
security definer
set search_path = ''
as $$ select * from private.card_qalam(auth.uid()) $$;
revoke all on function private.my_card_qalam() from public, anon;
grant execute on function private.my_card_qalam() to authenticated;

create function membership.my_card_qalam()
returns table (school text, year integer)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_card_qalam() $$;
revoke all on function membership.my_card_qalam() from public, anon;
grant execute on function membership.my_card_qalam() to authenticated;

-- The check page: the same, only while the card's live code is right.
create function private.verify_card_qalam(code text, digits text default null)
returns table (school text, year integer)
language sql
stable
security definer
set search_path = ''
as $$
  select q.school, q.year
  from membership.cards c
  cross join lateral private.card_qalam(c.user_id) q
  where c.code = lower(trim(verify_card_qalam.code))
    and coalesce(private.totp_live(c.secret, verify_card_qalam.digits), false);
$$;
revoke all on function private.verify_card_qalam(text, text) from public;
grant execute on function private.verify_card_qalam(text, text) to anon, authenticated;

create function membership.verify_card_qalam(code text, digits text default null)
returns table (school text, year integer)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.verify_card_qalam($1, $2) $$;
revoke all on function membership.verify_card_qalam(text, text) from public;
grant execute on function membership.verify_card_qalam(text, text) to anon, authenticated;

-- The certificate's check page names the student from the account.
create or replace function private.verify_certificate(code text)
returns table (
  serial text, kind text, prize_category text, status text,
  holder_en text, holder_ar text, school text, year integer,
  citation_en text, citation_ar text, issued_at timestamptz, revoked_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.serial, c.kind, c.prize_category, c.status,
    case when c.kind = 'qalam' then coalesce(private.initial_name(q.user_id, 'en'), private.initial_name(q.user_id, 'ar')) else p.full_name_en end,
    case when c.kind = 'qalam' then coalesce(private.initial_name(q.user_id, 'ar'), private.initial_name(q.user_id, 'en')) else p.full_name_ar end,
    q.school,
    coalesce(q.year, extract(year from c.issued_at at time zone 'Asia/Baghdad')::integer),
    case when c.kind = 'prize' then c.citation_en end,
    case when c.kind = 'prize' then c.citation_ar end,
    c.issued_at, c.revoked_at
  from membership.certificates c
  left join core.profiles p on p.id = c.user_id
  left join programmes.qalam_students q on q.id = c.qalam_student_id
  where c.verification_code = lower(trim(verify_certificate.code))
    and c.status in ('issued', 'revoked');
$$;

-- ── Who a link is about ───────────────────────────────────────────────────

-- The consent and release forms no longer ask for the student's name: the
-- link names the student, and the form page shows their first name and
-- last initial to whoever holds the open link.
create function private.form_link_subject(form_key text, token text)
returns table (name_en text, name_ar text)
language sql
stable
security definer
set search_path = ''
as $$
  select private.initial_name(l.subject_user, 'en'), private.initial_name(l.subject_user, 'ar')
  from governance.form_links l
  where l.form_key = form_link_subject.form_key
    and l.token_hash = encode(extensions.digest(form_link_subject.token, 'sha256'), 'hex')
    and l.used_at is null and l.expires_at > now()
    and l.subject_user is not null;
$$;
revoke all on function private.form_link_subject(text, text) from public;
grant execute on function private.form_link_subject(text, text) to anon, authenticated, service_role;

create function governance.form_link_subject(form_key text, token text)
returns table (name_en text, name_ar text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.form_link_subject($1, $2) $$;
revoke all on function governance.form_link_subject(text, text) from public;
grant execute on function governance.form_link_subject(text, text) to anon, authenticated, service_role;
