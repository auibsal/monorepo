-- The eighth prompt (decisions.md, Documents and forms).
--
-- 1. The handover is signed on the site: a step when someone leaves a
--    role. The outgoing holder fills and signs it; the incoming holder, or
--    the seat's officer when there is none yet, countersigns. It gets an
--    AGR number like every signing. Notion keeps no handover pages.
-- 2. Consent to sign electronically (E-SIGN) is asked once, explicitly: a
--    line of its own at sign-up, and, for accounts made before, once at
--    the next sign-in. It is marked given only when the person gives it.
-- 3. The kinds' titles are in sentence case, as in EXB-01.

-- ── 2. Consent to sign electronically ──────────────────────────────────────

alter table core.profiles
  add column esign_agreed_at timestamptz,
  add column esign_asked_at timestamptz;
comment on column core.profiles.esign_agreed_at is
  'When the person agreed to sign electronically (E-SIGN), asked once on its own line; null until they agree.';
comment on column core.profiles.esign_asked_at is
  'When the person was asked, at sign-up or at the first sign-in after the question was added; they are not asked again at sign-in.';

create function private.esign_given(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.esign_agreed_at is not null from core.profiles p where p.id = uid), false);
$$;
revoke all on function private.esign_given(uuid) from public, anon;
grant execute on function private.esign_given(uuid) to authenticated, service_role;

-- The caller's own answer.
create function private.my_esign()
returns table (agreed_at timestamptz, asked_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.esign_agreed_at, p.esign_asked_at from core.profiles p where p.id = (select auth.uid());
$$;
revoke all on function private.my_esign() from public, anon;
grant execute on function private.my_esign() to authenticated;

create function core.my_esign()
returns table (agreed_at timestamptz, asked_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_esign() $$;
revoke all on function core.my_esign() from public, anon;
grant execute on function core.my_esign() to authenticated;

-- The answer: "I agree" records the consent; "Not now" only that they were
-- asked (they are asked again where they next sign something). From
-- Settings, "no" withdraws a consent given (E-SIGN lets it be withdrawn).
create function private.answer_esign(agree boolean)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  update core.profiles
  set esign_asked_at = coalesce(esign_asked_at, now()),
      esign_agreed_at = case when answer_esign.agree then coalesce(esign_agreed_at, now()) end
  where id = me;
  return (select p.esign_agreed_at from core.profiles p where p.id = me);
end;
$$;
revoke all on function private.answer_esign(boolean) from public, anon;
grant execute on function private.answer_esign(boolean) to authenticated;

create function core.answer_esign(agree boolean)
returns timestamptz
language sql
security invoker
set search_path = ''
as $$ select private.answer_esign($1) $$;
revoke all on function core.answer_esign(boolean) from public, anon;
grant execute on function core.answer_esign(boolean) to authenticated;

-- At sign-up, the line of its own ("esign" in the sign-up's metadata).
do $$
declare
  def text;
  anchor text := '  on conflict (id) do nothing;';
begin
  def := pg_get_functiondef('private.handle_new_user'::regproc);
  if position(anchor in def) = 0 then
    raise exception 'Unexpected body in private.handle_new_user';
  end if;
  def := replace(def, anchor, anchor || E'\n'
    || E'  -- Consent to sign electronically, its own line at sign-up (E-SIGN).\n'
    || E'  if meta ? ''esign'' then\n'
    || E'    update core.profiles\n'
    || E'    set esign_asked_at = now(),\n'
    || E'        esign_agreed_at = case when meta ->> ''esign'' = ''true'' then now() end\n'
    || E'    where id = new.id;\n'
    || E'  end if;');
  execute def;
end
$$;

-- A signing needs the consent: the account's, or given on the page.
do $$
declare
  def text;
  check_old text := '  if not sign_form.esign_agreed then';
  value_old text := '    sign_form.esign_agreed,';
begin
  def := pg_get_functiondef('private.sign_form'::regproc);
  if position(check_old in def) = 0 or position(value_old in def) = 0 then
    raise exception 'Unexpected body in private.sign_form';
  end if;
  def := replace(def, check_old,
    '  if not (sign_form.esign_agreed or private.esign_given(auth.uid())) then');
  def := replace(def, value_old,
    '    (sign_form.esign_agreed or private.esign_given(auth.uid())),');
  execute def;
end
$$;

-- The records made on their own pages (the Code of Conduct, a role
-- agreement, the Publication Agreement) carry the account's consent.
do $$
declare
  def text;
  old_value text := '    btrim(signer_name), signed, email, ip,';
begin
  def := pg_get_functiondef('private.record_signing'::regproc);
  if position(old_value in def) = 0 then
    raise exception 'Unexpected body in private.record_signing';
  end if;
  def := replace(def, old_value,
    '    btrim(signer_name), signed, email and private.esign_given(signer), ip,');
  execute def;
end
$$;

-- The readers' pledge too.
do $$
declare
  def text;
  check_old text := '  if not coalesce(esign_agreed, false) then';
begin
  def := pg_get_functiondef('private.sign_reader_pledge'::regproc);
  if position(check_old in def) = 0 then
    raise exception 'Unexpected body in private.sign_reader_pledge';
  end if;
  def := replace(def, check_old,
    '  if not (coalesce(esign_agreed, false) or private.esign_given(me)) then');
  execute def;
end
$$;

-- ── 1. The handover ─────────────────────────────────────────────────────────

alter table governance.form_types drop constraint form_types_second_signer_check;
alter table governance.form_types add constraint form_types_second_signer_check
  check (second_signer in ('member', 'qalam.manage', 'partners.sign', 'successor'));
alter table governance.form_types drop constraint form_types_subject_kind_check;
alter table governance.form_types add constraint form_types_subject_kind_check
  check (subject_kind in ('event', 'piece', 'production', 'partner', 'role'));

update governance.form_types
set filled = 'site', submit_rule = 'anyone', needs_account = true,
    second_signer = 'successor', subject_kind = 'role', title_en = 'Handover', title_ar = 'التسليم'
where key = 'handover';

-- Who countersigns a handover: the incoming holder of the same role (a
-- current holder other than the one leaving), or, when there is none yet,
-- the seat's officer: an officer who assigns roles (roles.assign).
create function private.may_countersign_handover(assignment_id uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with a as (
    select r.* from access.role_assignments r where r.id = may_countersign_handover.assignment_id
  ), incoming as (
    select n.user_id from access.role_assignments n, a
    where n.role = a.role and n.scope_type = a.scope_type
      and n.scope_id is not distinct from a.scope_id
      and n.user_id <> a.user_id and n.id <> a.id
      and n.starts_at <= now() and (n.ends_at is null or n.ends_at > now())
  )
  select uid is not null and uid <> (select a.user_id from a) and (
    exists (select 1 from incoming i where i.user_id = uid)
    or (
      not exists (select 1 from incoming)
      -- The officers who assign roles (the caller's own grants).
      and uid = (select auth.uid())
      and private.has_permission_anywhere('roles.assign')
    )
  );
$$;
revoke all on function private.may_countersign_handover(uuid, uuid) from public, anon, authenticated;

-- A handover is about one of the signer's own roles, once.
create function private.handover_is_own()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  a access.role_assignments;
begin
  if new.form_key <> 'handover' then
    return new;
  end if;
  select * into a from access.role_assignments r where r.id = new.subject_id;
  if not found or a.user_id is distinct from new.submitted_by then
    raise exception 'not_your_role' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' and exists (
    select 1 from governance.form_submissions s
    where s.form_key = 'handover' and s.subject_id = new.subject_id and s.status <> 'draft'
      and s.id <> new.id
  ) then
    raise exception 'handover_signed' using errcode = '23505';
  end if;
  return new;
end;
$$;

create trigger handover_is_own
  before insert or update of subject_id on governance.form_submissions
  for each row execute function private.handover_is_own();

-- The countersignature: in the name the register holds ("Sign as …"), by
-- the incoming holder or the seat's officer; and, for every kind, the
-- typed name is ignored.
do $$
declare
  def text;
  case_old text := E'    when ''member'' then membership.is_member() and s.submitted_by is distinct from auth.uid()';
  name_old text := E'  set second_signer_name = btrim(second_sign_form.signer_name),';
  check_old text := E'  if char_length(btrim(coalesce(second_sign_form.signer_name, ''''))) < 2 then';
begin
  def := pg_get_functiondef('private.second_sign_form'::regproc);
  if position(case_old in def) = 0 or position(name_old in def) = 0 or position(check_old in def) = 0 then
    raise exception 'Unexpected body in private.second_sign_form';
  end if;
  def := replace(def, case_old, case_old || E'\n'
    || E'    when ''successor'' then private.may_countersign_handover(s.subject_id, auth.uid())');
  def := replace(def, check_old,
    E'  signer_name := coalesce(private.register_name(auth.uid()), second_sign_form.signer_name);\n' || check_old);
  def := replace(def, name_old,
    E'  set second_signer_name = btrim(second_sign_form.signer_name),');
  execute def;
end
$$;

-- The outgoing holder's handovers to sign: roles ended in the last 60 days
-- or ending in the next 14, not outside roles, with none signed yet.
create function private.my_handovers_due()
returns table (assignment_id uuid, role text, role_en text, role_ar text, ends_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.role, r.name_en, r.name_ar, a.ends_at
  from access.role_assignments a
  join access.roles r on r.key = a.role
  where a.user_id = (select auth.uid())
    and r.kind <> 'outside'
    and a.ends_at is not null
    and a.ends_at > now() - interval '60 days'
    and a.ends_at < now() + interval '14 days'
    and not exists (
      select 1 from governance.form_submissions s
      where s.form_key = 'handover' and s.subject_id = a.id and s.status <> 'draft'
    )
  order by a.ends_at;
$$;
revoke all on function private.my_handovers_due() from public, anon;
grant execute on function private.my_handovers_due() to authenticated;

create function access.my_handovers_due()
returns table (assignment_id uuid, role text, role_en text, role_ar text, ends_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_handovers_due() $$;
revoke all on function access.my_handovers_due() from public, anon;
grant execute on function access.my_handovers_due() to authenticated;

-- The handovers waiting for the caller's countersignature, with what the
-- outgoing holder wrote: the countersigner reads them here, not from the
-- table (whose policy is the handlers').
create function private.handovers_to_countersign()
returns table (
  id uuid, reference text, role_en text, role_ar text, outgoing text,
  data jsonb, signed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.reference, r.name_en, r.name_ar, s.signer_name, s.data, s.signed_at
  from governance.form_submissions s
  join access.role_assignments a on a.id = s.subject_id
  join access.roles r on r.key = a.role
  where s.form_key = 'handover' and s.status <> 'draft' and s.second_signed_at is null
    and private.may_countersign_handover(s.subject_id, (select auth.uid()))
  order by s.signed_at;
$$;
revoke all on function private.handovers_to_countersign() from public, anon;
grant execute on function private.handovers_to_countersign() to authenticated;

create function governance.handovers_to_countersign()
returns table (
  id uuid, reference text, role_en text, role_ar text, outgoing text,
  data jsonb, signed_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.handovers_to_countersign() $$;
revoke all on function governance.handovers_to_countersign() from public, anon;
grant execute on function governance.handovers_to_countersign() to authenticated;

-- ── 3. Titles in sentence case ──────────────────────────────────────────────
-- Proper names keep their capitals (the Code of Conduct, the Faculty
-- Advisor, Honorary Membership, Student Life).

update governance.form_types set title_en = 'Publication agreement' where key = 'publication-agreement';

-- The countersigner keeps the signed copy too (Your account → Documents).
drop policy "Submitters, handlers and subjects read submissions" on governance.form_submissions;
create policy "Submitters, handlers and subjects read submissions" on governance.form_submissions
  for select to authenticated
  using (
    submitted_by = (select auth.uid())
    or second_signer_id = (select auth.uid())
    or exists (
      select 1 from governance.sealed_signers s
      where s.submission_id = form_submissions.id and s.user_id = (select auth.uid())
    )
    or (status <> 'draft' and (select private.may_handle_form(form_submissions.form_key, form_submissions.routing)))
    or (status <> 'draft' and subject_user_id = (select auth.uid()) and exists (
      select 1 from governance.form_types t
      where t.key = form_submissions.form_key and t.subject_reads
    ))
  );
