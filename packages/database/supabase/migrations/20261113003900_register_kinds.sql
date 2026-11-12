-- The register holds only what people sign (decisions.md, Documents and
-- forms: "Names, not numbers"; the seventh prompt, 1). "Agreements and
-- consents" (SAL-EXB-01) lists seventeen kinds; letters, notices, minutes,
-- score sheets, reports, lists and checklists keep their names but are
-- templates or records, listed in the templates index, never in the
-- register. The Code of Conduct and the role agreement become kinds of
-- their own: each signing is a signature record like every other, with its
-- AGR number and verification code, kept in Your account → Documents and
-- checkable at /verify.

alter table governance.form_types alter column legacy_number drop not null;
alter table governance.form_types add column in_register boolean not null default false;
comment on column governance.form_types.in_register is
  'In the register "Agreements and consents" (SAL-EXB-01): a kind people sign. The rest are templates or records.';

insert into governance.form_types (
  key, legacy_number, title_en, title_ar, filled, submit_rule, handle_permission,
  needs_account, version, sort
) values
  ('code-of-conduct', null, 'Code of Conduct', 'مدونة السلوك', 'page', 'handler', 'members.manage', true, 1, 1),
  ('role-agreement', null, 'Role agreement', 'اتفاقية الدور', 'page', 'handler', 'roles.assign', true, 1, 2);

update governance.form_types set in_register = true
where key in (
  'code-of-conduct', 'role-agreement', 'conflict-of-interest-declaration',
  'confidentiality-agreement', 'handover', 'members-meeting-motion', 'event-pitch',
  'concern', 'media-release', 'partnership-memorandum', 'company-agreement',
  'publication-agreement', 'trip-consent', 'parent-consent', 'qalam-mentor-agreement',
  'qalam-parent-consent', 'qalam-publishing-consent'
);

do $$
begin
  if (select count(*) from governance.form_types where in_register) <> 17 then
    raise exception 'The register should hold seventeen kinds';
  end if;
end
$$;

-- ── One signature record ────────────────────────────────────────────────────

-- A signing made on its own page (the Code of Conduct, a role agreement):
-- the record every kind keeps (the name, time, IP address, version and
-- fingerprint), which takes its AGR number on insert. The signer is emailed
-- their copy unless the record is older than this change.
create function private.record_signing(
  kind text, signer uuid, signer_name text, data jsonb, signed timestamptz, email boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  t governance.form_types;
  ip text;
  new_id uuid;
begin
  select * into t from governance.form_types where key = kind;
  if not found or char_length(btrim(coalesce(signer_name, ''))) < 2 then
    return null;
  end if;
  if email then
    ip := nullif(btrim(split_part(coalesce(
      (nullif(current_setting('request.headers', true), '')::jsonb) ->> 'x-forwarded-for', ''), ',', 1)), '');
  end if;
  insert into governance.form_submissions (
    form_key, submitted_by, routing, data, status, submitted_at, form_version,
    signer_name, signed_at, esign_agreed, signer_ip, document_sha256
  ) values (
    kind, signer, 'none', data, 'closed', signed, t.version,
    btrim(signer_name), signed, email, ip,
    encode(extensions.digest(jsonb_build_object(
      'form', t.key, 'version', t.version, 'data', data, 'signer', btrim(signer_name)
    )::text, 'sha256'), 'hex')
  )
  returning id into new_id;
  if email then
    perform private.enqueue('forms.signed_copy', jsonb_build_object('submission_id', new_id));
  end if;
  return new_id;
end;
$$;
revoke all on function private.record_signing(text, uuid, text, jsonb, timestamptz, boolean) from public, anon, authenticated;

-- ── The role agreement ──────────────────────────────────────────────────────

alter table access.role_agreements
  add column submission_id uuid references governance.form_submissions (id) on delete set null;
create index role_agreements_submission_id_idx on access.role_agreements (submission_id);

-- The kind's version is the one source (no separate setting).
do $$
declare
  def text;
  old_version text := E'coalesce((select s.value #>> ''{}'' from core.settings s where s.key = ''role_agreement.version''), ''1'')';
begin
  def := pg_get_functiondef('private.sign_role_agreement'::regproc);
  if position(old_version in def) = 0 then
    raise exception 'Unexpected body in private.sign_role_agreement';
  end if;
  def := replace(def, old_version,
    E'(select t.version::text from governance.form_types t where t.key = ''role-agreement'')');
  execute def;
end
$$;
delete from core.settings where key = 'role_agreement.version';

create function private.role_agreement_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r access.roles;
begin
  select ro.* into r from access.role_assignments a
  join access.roles ro on ro.key = a.role
  where a.id = new.assignment_id;
  new.submission_id := private.record_signing('role-agreement', new.user_id, new.signer_name,
    jsonb_build_object('role', r.key, 'role_en', r.name_en, 'role_ar', r.name_ar,
      'assignment_id', new.assignment_id),
    new.signed_at, true);
  return new;
end;
$$;

create trigger role_agreement_record
  before insert on access.role_agreements
  for each row execute function private.role_agreement_record();

-- ── The Code of Conduct ─────────────────────────────────────────────────────

alter table membership.pledges
  add column submission_id uuid references governance.form_submissions (id) on delete set null;
create index pledges_submission_id_idx on membership.pledges (submission_id);

create function private.code_of_conduct_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.pledge_type = 'member' then
    new.submission_id := private.record_signing('code-of-conduct', new.user_id,
      private.register_name(new.user_id),
      jsonb_build_object('pledge_version', new.version), new.accepted_at, true);
  end if;
  return new;
end;
$$;

create trigger code_of_conduct_record
  before insert on membership.pledges
  for each row execute function private.code_of_conduct_record();

-- Those who accepted the Code of Conduct before this get their record, at
-- the time they accepted it, in that order, with no email. Role agreements
-- ship in the same deploy, so none are waiting.
do $$
declare
  p record;
begin
  for p in
    select id, user_id, version, accepted_at from membership.pledges
    where pledge_type = 'member' and submission_id is null
    order by accepted_at
  loop
    update membership.pledges set submission_id = private.record_signing('code-of-conduct',
      p.user_id, private.register_name(p.user_id),
      jsonb_build_object('pledge_version', p.version), p.accepted_at, false)
    where id = p.id;
  end loop;
end
$$;

-- ── The Publication Agreement ───────────────────────────────────────────────
-- Signed on accepted work (Your account → Work), it is a signature record
-- like the rest: its AGR number, its check, the signer's emailed copy.

alter table journal.agreements
  add column record_id uuid references governance.form_submissions (id) on delete set null;
create index agreements_record_id_idx on journal.agreements (record_id);

create function private.publication_agreement_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.record_id := private.record_signing('publication-agreement', new.signed_by, new.signer_name,
    jsonb_build_object('submission_id', new.submission_id, 'agreement_version', new.version),
    new.signed_at, true);
  return new;
end;
$$;

create trigger publication_agreement_record
  before insert on journal.agreements
  for each row execute function private.publication_agreement_record();

do $$
declare
  g record;
begin
  for g in
    select id, submission_id, version, signer_name, signed_by, signed_at
    from journal.agreements where record_id is null order by signed_at
  loop
    update journal.agreements set record_id = private.record_signing('publication-agreement',
      g.signed_by, g.signer_name,
      jsonb_build_object('submission_id', g.submission_id, 'agreement_version', g.version),
      g.signed_at, false)
    where id = g.id;
  end loop;
end
$$;
