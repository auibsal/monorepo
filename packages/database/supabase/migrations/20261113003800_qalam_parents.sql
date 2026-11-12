-- Qalam's parents get accounts (decisions.md, Documents and forms: Qalam;
-- the sixth prompt, 1). The consent goes to each parent directly: the school
-- gives the parents' addresses with its application, each parent signs
-- through their own single-use link, and the teacher gets a copy of each
-- signed consent. Signing makes the parent's guest account with the Parent
-- role on their child and the student's guest account with the Qalam
-- student role. Contact with the students still goes only through the
-- teacher: the site writes to the parent and the teacher, never to the
-- student.

-- Who gets a copy of what is signed through a link (the teacher).
alter table governance.form_links
  add column copy_to text check (copy_to is null or copy_to ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');
comment on column governance.form_links.copy_to is
  'Who gets a copy of the signed consent besides the signer: for Qalam, the teacher.';

-- Qalam's staff send the consent to a parent, with the teacher's copy.
create function private.qalam_consent_link(parent_email text, teacher_email text, note text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text := encode(extensions.gen_random_bytes(24), 'hex');
  new_id uuid;
begin
  if not private.has_permission('qalam.manage') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if coalesce(parent_email, '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    or coalesce(teacher_email, '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;
  insert into governance.form_links (form_key, sent_to, copy_to, note, token_hash)
  values ('qalam-parent-consent', lower(btrim(parent_email)), lower(btrim(teacher_email)),
    nullif(btrim(coalesce(note, '')), ''), encode(extensions.digest(token, 'sha256'), 'hex'))
  returning id into new_id;
  perform private.enqueue('forms.link', jsonb_build_object(
    'link_id', new_id, 'token', token, 'form_key', 'qalam-parent-consent'));
  return new_id;
end;
$$;
revoke all on function private.qalam_consent_link(text, text, text) from public, anon;
grant execute on function private.qalam_consent_link(text, text, text) to authenticated;

create function programmes.qalam_consent_link(parent_email text, teacher_email text, note text default null)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.qalam_consent_link($1, $2, $3) $$;
revoke all on function programmes.qalam_consent_link(text, text, text) from public, anon;
grant execute on function programmes.qalam_consent_link(text, text, text) to authenticated, service_role;

-- The teacher's copy goes out with the signer's.
do $$
declare
  def text;
  anchor text := '    update governance.form_links set used_at = now(), submission_id = new_id where id = link.id;';
begin
  def := pg_get_functiondef('private.sign_form'::regproc);
  if position(anchor in def) = 0 then
    raise exception 'Unexpected body in private.sign_form';
  end if;
  def := replace(def, anchor, anchor || E'\n'
    || E'    if link.copy_to is not null then\n'
    || E'      perform private.enqueue(''forms.signed_copy'', jsonb_build_object(\n'
    || E'        ''submission_id'', new_id, ''to'', link.copy_to));\n'
    || E'    end if;');
  execute def;
end
$$;

-- The address the consent went to: the parent's own.
create function private.consent_link(submission_id uuid)
returns table (sent_to text, copy_to text)
language sql
stable
security definer
set search_path = ''
as $$
  select l.sent_to, l.copy_to from governance.form_links l
  where l.submission_id = consent_link.submission_id and l.used_at is not null;
$$;
revoke all on function private.consent_link(uuid) from public, anon, authenticated;
grant execute on function private.consent_link(uuid) to service_role;

create function governance.consent_link(submission_id uuid)
returns table (sent_to text, copy_to text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.consent_link($1) $$;
revoke all on function governance.consent_link(uuid) from public, anon, authenticated;
grant execute on function governance.consent_link(uuid) to service_role;

-- Enrolling now makes the parent's role too: the Parent role on the child,
-- until the child leaves Qalam (or turns 18, if the birth month is known).
drop function programmes.qalam_enroll(uuid, uuid);
drop function private.qalam_enroll(uuid, uuid);

create function private.qalam_enroll(submission_id uuid, student uuid, parent uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  f governance.form_submissions;
  run integer := extract(year from now() at time zone 'Asia/Baghdad')::integer;
  row_id uuid;
  until timestamptz;
begin
  select * into f from governance.form_submissions s
  where s.id = qalam_enroll.submission_id and s.form_key = 'qalam-parent-consent' and s.status <> 'draft';
  if not found or student is null or parent is null or student = parent then
    raise exception 'not_a_qalam_consent' using errcode = '22023';
  end if;

  -- Both are guests, unless they already hold a class.
  if private.membership_kind(student) is null then
    insert into membership.guests (user_id) values (student)
    on conflict (user_id) do update set ended_at = null;
  end if;
  if private.membership_kind(parent) is null then
    insert into membership.guests (user_id) values (parent)
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
    values (student, 'qalam_student', now(), 'By the parent''s consent (qalam-parent-consent)');
  end if;

  select make_date(p.birth_year, p.birth_month, 1) + interval '18 years'
  into until from core.profiles p
  where p.id = student and p.birth_year is not null and p.birth_month is not null;
  if not exists (
    select 1 from access.role_assignments a
    where a.user_id = parent and a.role = 'parent' and a.scope_type = 'member'
      and a.scope_id = student and (a.ends_at is null or a.ends_at > now())
  ) then
    insert into access.role_assignments (user_id, role, scope_type, scope_id, starts_at, ends_at, note)
    values (parent, 'parent', 'member', student, now(), until, 'Qalam: by the parent''s consent');
  end if;

  update governance.form_submissions set subject_user_id = student
  where id = f.id and subject_user_id is null;
  return row_id;
end;
$$;
revoke all on function private.qalam_enroll(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function private.qalam_enroll(uuid, uuid, uuid) to service_role;

create function programmes.qalam_enroll(submission_id uuid, student uuid, parent uuid)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.qalam_enroll($1, $2, $3) $$;
revoke all on function programmes.qalam_enroll(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function programmes.qalam_enroll(uuid, uuid, uuid) to service_role;

-- Leaving Qalam ends the parent's Qalam role too.
create or replace function private.qalam_role_follows_roster()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('finished', 'withdrawn', 'declined') and old.status is distinct from new.status then
    update access.role_assignments
    set ends_at = now()
    where ((user_id = new.user_id and role = 'qalam_student')
        or (role = 'parent' and scope_type = 'member' and scope_id = new.user_id
          and note = 'Qalam: by the parent''s consent'))
      and starts_at < now() and (ends_at is null or ends_at > now());
    -- One given this very moment simply goes.
    delete from access.role_assignments
    where ((user_id = new.user_id and role = 'qalam_student')
        or (role = 'parent' and scope_type = 'member' and scope_id = new.user_id
          and note = 'Qalam: by the parent''s consent'))
      and starts_at >= now();
  end if;
  return new;
end;
$$;

-- The publishing release goes the same way: to a parent, for a student on
-- the roster, with the teacher's copy.
drop function programmes.qalam_release_link(uuid, text, text);
drop function private.qalam_release_link(uuid, text, text);

create function private.qalam_release_link(student_row uuid, parent_email text, teacher_email text, note text default null)
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
  if coalesce(parent_email, '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    or coalesce(teacher_email, '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;
  insert into governance.form_links (form_key, sent_to, copy_to, note, token_hash, subject_user)
  values ('qalam-publishing-consent', lower(btrim(parent_email)), lower(btrim(teacher_email)),
    nullif(btrim(coalesce(note, '')), ''), encode(extensions.digest(token, 'sha256'), 'hex'), student)
  returning id into new_id;
  perform private.enqueue('forms.link', jsonb_build_object(
    'link_id', new_id, 'token', token, 'form_key', 'qalam-publishing-consent'));
  return new_id;
end;
$$;
revoke all on function private.qalam_release_link(uuid, text, text, text) from public, anon;
grant execute on function private.qalam_release_link(uuid, text, text, text) to authenticated;

create function programmes.qalam_release_link(student_row uuid, parent_email text, teacher_email text, note text default null)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.qalam_release_link($1, $2, $3, $4) $$;
revoke all on function programmes.qalam_release_link(uuid, text, text, text) from public, anon;
grant execute on function programmes.qalam_release_link(uuid, text, text, text) to authenticated, service_role;
