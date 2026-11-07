-- Documents and Qalam (owner, Nov 7, 2026; claude/decisions.md §1 and §6).

-- 1. The document set, on the American standard. Codes follow the owner:
-- each family is a Council seat (GOV is the members' own); 01 is the
-- family's general manual. Every document is written in Notion
-- (Publishing, Documents) as English and Arabic editions, linked, and
-- public ones are copied to the Library by the sync. The Society is
-- founded in spring 2027: until the Founding Meeting adopts them, every
-- document is Version 1, proposed, and no adoption record exists. The
-- retired codes (SAL-POL, HBK, STR, PRP, BRD, PLT, QRT, CMP, OPS, and
-- SAL-GOV-03 as Roles and Staffing) go, with their Library pages; the
-- re-sync rebuilds the Library from Notion.
delete from core.notion_links where kind = 'document';
delete from governance.society_documents;

alter table governance.society_documents drop constraint society_documents_status_check;
alter table governance.society_documents add constraint society_documents_status_check
  check (status in ('proposed', 'adopted', 'superseded'));
alter table governance.society_documents alter column status set default 'proposed';
alter table governance.society_documents drop constraint society_documents_audience_check;
alter table governance.society_documents add constraint society_documents_audience_check
  check (audience = 'public');
alter table governance.society_documents
  add column owner text check (char_length(owner) <= 60),
  add constraint society_documents_code_family check (
    split_part(code, '-', 2) in ('GOV', 'EXB', 'EVT', 'MEM', 'PTN', 'MED', 'ART', 'EDT')
  ),
  add constraint society_documents_adopted check (
    (status = 'adopted') = (adopted_on is not null)
  );

comment on table governance.society_documents is
  'The public documents of SAL''s document set (owner, Nov 7, 2026), copied from Notion: Version 1, proposed, until the Founding Meeting (March 30, 2027) adopts them. Internal documents stay in Notion. Codes: SAL-GOV, EXB, EVT, MEM, PTN, MED, ART, EDT.';

-- 2. Qalam (decisions §1), Qirtas's summer program for high school
-- students, first run in summer 2028. Its applications and roster live in
-- the staff area of the site, never in Notion. High school students never
-- get accounts; their families consent on the forms page (F-38, F-39).
-- Records: consent forms and attendance kept three years after the
-- program, then deleted.
create table programmes.qalam_students (
  id uuid primary key default gen_random_uuid(),
  year integer not null check (year >= 2028),
  first_name text not null check (char_length(btrim(first_name)) between 1 and 80),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 80),
  school text not null check (char_length(btrim(school)) between 1 and 200),
  grade text check (char_length(grade) <= 40),
  status text not null default 'applied' check (status in ('applied', 'accepted', 'declined', 'withdrawn', 'finished')),
  consent_form_id uuid references governance.form_submissions (id) on delete set null,
  photos_allowed boolean not null default false,
  publishing_allowed boolean not null default false,
  sessions_attended integer not null default 0 check (sessions_attended >= 0),
  note text check (char_length(note) <= 1000),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index qalam_students_year_idx on programmes.qalam_students (year, status);
create index qalam_students_consent_form_id_idx on programmes.qalam_students (consent_form_id);
create index qalam_students_created_by_idx on programmes.qalam_students (created_by);

alter table programmes.qalam_students enable row level security;

create policy "No third-party apps" on programmes.qalam_students
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('programmes')))
  with check ((select private.client_allows('programmes')));

create policy "Qalam's staff read the roster" on programmes.qalam_students
  for select to authenticated
  using ((select private.has_permission('qalam.manage')));
create policy "Qalam's staff add students" on programmes.qalam_students
  for insert to authenticated
  with check ((select private.has_permission('qalam.manage')));
create policy "Qalam's staff keep the roster" on programmes.qalam_students
  for update to authenticated
  using ((select private.has_permission('qalam.manage')))
  with check ((select private.has_permission('qalam.manage')));
create policy "Qalam's staff remove students" on programmes.qalam_students
  for delete to authenticated
  using ((select private.has_permission('qalam.manage')));

create trigger set_updated_at before update on programmes.qalam_students
  for each row execute function private.set_updated_at();

comment on table programmes.qalam_students is
  'Qalam''s applications and roster (owner, Nov 7, 2026): staff only (qalam.manage), never in Notion; students never get accounts. Deleted three years after the program''s year, with their consent forms.';

-- A Qalam student's certificate names them without an account.
alter table membership.certificates alter column user_id drop not null;
alter table membership.certificates
  add column recipient_name text check (char_length(recipient_name) <= 200),
  add column qalam_student_id uuid references programmes.qalam_students (id) on delete set null,
  add constraint certificates_recipient check (user_id is not null or recipient_name is not null);
create index certificates_qalam_student_id_idx on membership.certificates (qalam_student_id);

-- Retention: three years after the program's year (the summer), the
-- roster and its consent forms are deleted.
create function private.purge_qalam_records()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from governance.form_submissions s
  where s.form_key in ('f38', 'f39')
    and s.signed_at < now() - interval '3 years 6 months';
  delete from programmes.qalam_students q
  where make_date(q.year + 3, 9, 1) < private.today();
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function private.purge_qalam_records() from public, anon, authenticated;

select cron.schedule('sal-qalam-retention', '40 5 * * *', $$ select private.purge_qalam_records() $$);
