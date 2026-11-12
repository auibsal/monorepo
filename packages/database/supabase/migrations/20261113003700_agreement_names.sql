-- Names, not numbers (decisions.md, Documents and forms; the sixth
-- prompt, 2). Each kind of agreement or consent has a stable name and
-- version ("media-release", version 1), which the signature record, /verify
-- and the retention rules point to; each signing gets its own record number
-- (AGR-<year>-<four digits>) and a verification code, shown on the signer's
-- copy and checked at /verify. The F-numbers retire: the old number stays
-- on each kind only as `legacy_number`, the one-time mapping that keeps
-- anything already signed resolvable (and, in the app, every shared /forms
-- address redirecting). The four numbers already retired (F-08, F-22, F-31,
-- F-44) had no kind left to name, and their rows go.
--
-- Nothing had been signed in production when this ran.

create temporary table form_names (old text primary key, name text not null unique) on commit drop;
insert into form_names (old, name) values
  ('f01', 'role-application'),
  ('f02', 'interview-score-sheet'),
  ('f03', 'appointment-letter'),
  ('f04', 'role-holder-checklist'),
  ('f05', 'service-letter'),
  ('f06', 'conflict-of-interest-declaration'),
  ('f07', 'handover'),
  ('f09', 'council-minutes'),
  ('f10', 'members-meeting-motion'),
  ('f11', 'event-pitch'),
  ('f12', 'event-plan'),
  ('f13', 'event-debrief'),
  ('f14', 'semester-report'),
  ('f15', 'media-release'),
  ('f16', 'incident-report'),
  ('f17', 'partnership-memorandum'),
  ('f18', 'needs-list'),
  ('f19', 'student-life-request'),
  ('f20', 'charity-collection-count'),
  ('f21', 'concern'),
  ('f23', 'tour-tally'),
  ('f24', 'audition-form'),
  ('f25', 'audition-score-sheet'),
  ('f26', 'company-agreement'),
  ('f27', 'stage-risk-checklist'),
  ('f28', 'rights-request-letter'),
  ('f29', 'faculty-advisor-invitation'),
  ('f30', 'thank-you-letter'),
  ('f32', 'application-outcome'),
  ('f33', 'welcome-letter'),
  ('f34', 'honorary-membership-invitation'),
  ('f35', 'members-meeting-notice'),
  ('f36', 'election-notice'),
  ('f37', 'qalam-mentor-agreement'),
  ('f38', 'qalam-parent-consent'),
  ('f39', 'qalam-publishing-consent'),
  ('f40', 'confidentiality-agreement'),
  ('f41', 'reader-score-sheet'),
  ('f42', 'author-letters'),
  ('f43', 'publication-agreement'),
  ('f45', 'trip-consent'),
  ('f46', 'parent-consent');

-- Keys follow their kind's name through the signatures and the links.
alter table governance.form_submissions drop constraint form_submissions_form_key_fkey;
alter table governance.form_links drop constraint form_links_form_key_fkey;
alter table governance.form_types drop constraint form_types_key_check;

delete from governance.form_types t
where not exists (select 1 from form_names n where n.old = t.key);

update governance.form_submissions s set form_key = n.name from form_names n where s.form_key = n.old;
update governance.form_links l set form_key = n.name from form_names n where l.form_key = n.old;
update governance.form_types t set key = n.name from form_names n where t.key = n.old;

alter table governance.form_types add constraint form_types_key_check
  check (key ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$');
alter table governance.form_types rename column code to legacy_number;
comment on column governance.form_types.key is
  'The kind''s stable name ("media-release"), which signatures, /verify and the retention rules point to.';
comment on column governance.form_types.legacy_number is
  'The retired F-number this kind had before November 12, 2026: the one-time mapping, so anything signed or shared under it still resolves.';

alter table governance.form_submissions add constraint form_submissions_form_key_fkey
  foreign key (form_key) references governance.form_types (key) on update cascade;
alter table governance.form_links add constraint form_links_form_key_fkey
  foreign key (form_key) references governance.form_types (key) on update cascade;

-- Every function that named a kind by its old key now names it by its
-- name; the fingerprint is taken over the name.
do $$
declare
  f record;
  n record;
  def text;
begin
  for f in
    select p.oid from pg_proc p join pg_namespace s on s.oid = p.pronamespace
    where s.nspname in ('private', 'governance', 'journal', 'membership', 'programmes', 'events', 'core', 'access')
      and (p.prosrc ~ '''f[0-9]{2}''' or p.prosrc ~ 't\.code\M')
  loop
    def := pg_get_functiondef(f.oid);
    for n in select * from form_names loop
      def := replace(def, '''' || n.old || '''', '''' || n.name || '''');
    end loop;
    def := regexp_replace(def, 't\.code\M', 't.key', 'g');
    execute def;
  end loop;
end
$$;

do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace
    where s.nspname in ('private', 'governance', 'journal', 'membership', 'programmes', 'events', 'core', 'access')
      and p.prosrc ~ '''f[0-9]{2}[a-z]?'''
  ) then
    raise exception 'A function still names a form by its number';
  end if;
end
$$;

-- ── The record number and the verification code ────────────────────────────

alter table core.code_counters drop constraint code_counters_prefix_check;
alter table core.code_counters add constraint code_counters_prefix_check
  check (prefix in ('CERT', 'LTR', 'RES', 'MOU', 'TOUR', 'SUB', 'AGR'));

alter table governance.form_submissions
  add column reference text unique,
  add column verification_code text unique check (verification_code ~ '^[a-z0-9]{10}$');

-- AGR numbers take four digits (decisions.md, Numbers and codes).
create or replace function private.next_code(prefix text, year integer default null)
returns text
language sql
security definer
set search_path = ''
as $$
  insert into core.code_counters as c (prefix, year, last)
  values (next_code.prefix,
    coalesce(next_code.year, extract(year from now() at time zone 'Asia/Baghdad')::integer), 1)
  on conflict (prefix, year) do update set last = c.last + 1
  returning c.prefix || '-' || c.year || '-'
    || lpad(c.last::text, case when c.prefix = 'AGR' then 4 else 3 end, '0');
$$;

comment on column governance.form_submissions.reference is
  'The signing''s record number, AGR-<year>-<four digits>, given when it is signed.';
comment on column governance.form_submissions.verification_code is
  'The code on the signer''s copy that /verify checks.';

create function private.number_agreement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.reference := old.reference;
    new.verification_code := old.verification_code;
  end if;
  if new.reference is null and new.status <> 'draft' and new.signed_at is not null then
    new.reference := private.next_code('AGR');
    new.verification_code := substr(encode(extensions.gen_random_bytes(10), 'hex'), 1, 10);
  end if;
  return new;
end;
$$;
revoke all on function private.number_agreement() from public, anon, authenticated;

create trigger number_agreement before insert or update
  on governance.form_submissions
  for each row execute function private.number_agreement();

-- Signings made before (local and test data only), numbered in order.
do $$
declare
  s record;
begin
  for s in select id, signed_at from governance.form_submissions
    where reference is null and status <> 'draft' and signed_at is not null
    order by signed_at, id
  loop
    update governance.form_submissions
    set reference = private.next_code('AGR', extract(year from s.signed_at at time zone 'Asia/Baghdad')::integer),
        verification_code = substr(encode(extensions.gen_random_bytes(10), 'hex'), 1, 10)
    where id = s.id;
  end loop;
end
$$;

-- /verify: what a signed agreement or consent is, by its code. The
-- signer's name as signed, the kind and its version, the record number,
-- the time and the fingerprint; never its answers.
create function private.verify_agreement(code text)
returns table (
  reference text, kind text, title_en text, title_ar text, version integer,
  signer_name text, signed_at timestamptz, withdrawn_at timestamptz, document_sha256 text
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.reference, t.key, t.title_en, t.title_ar, s.form_version,
    s.signer_name, s.signed_at, s.withdrawn_at, s.document_sha256
  from governance.form_submissions s
  join governance.form_types t on t.key = s.form_key
  where s.verification_code = lower(btrim(verify_agreement.code))
    and s.status <> 'draft'
    and s.signer_name is not null;
$$;
revoke all on function private.verify_agreement(text) from public;
grant execute on function private.verify_agreement(text) to anon, authenticated, service_role;

create function governance.verify_agreement(code text)
returns table (
  reference text, kind text, title_en text, title_ar text, version integer,
  signer_name text, signed_at timestamptz, withdrawn_at timestamptz, document_sha256 text
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.verify_agreement($1) $$;
revoke all on function governance.verify_agreement(text) from public;
grant execute on function governance.verify_agreement(text) to anon, authenticated, service_role;
