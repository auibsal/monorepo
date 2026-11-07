-- One source for every card, certificate and letter (owner, Nov 7, 2026;
-- decisions §6). Production held no certificates and no service records
-- (checked Nov 7), so the certificate table is reshaped in place.
--
-- 1. Certificates: only finishing Qalam and the Mutanabbi Prize (each
--    category). One language each, the one the recipient chose. Signers:
--    Qalam, the Qalam lead and the Editor-in-Chief; the Prize, the
--    Editor-in-Chief and the President. A Qalam certificate names the
--    student from the roster (the only place the full name appears); its
--    check page shows only the first name, last initial, school and year.
-- 2. The membership card's check shows the name, class, status and member
--    since only: the card no longer lists certificates.
-- 3. Service letters (F-05) carry a verification code, checked on
--    auibsal.org/verify/<code> like a certificate.

-- ── 1. Certificates ─────────────────────────────────────────────────────────

alter table membership.certificates
  drop column role_en,
  drop column role_ar,
  drop column hours,
  drop column partner_id cascade,
  drop column resolution_id cascade,
  drop column production_id cascade;

alter table membership.certificates rename column president_signed_by to first_signed_by;
alter table membership.certificates rename column president_signed_at to first_signed_at;
alter table membership.certificates rename column advisor_signed_by to second_signed_by;
alter table membership.certificates rename column advisor_signed_at to second_signed_at;

alter table membership.certificates
  drop constraint if exists certificates_check1;
alter table membership.certificates
  drop column recipient_name,
  add column lang text not null default 'en' check (lang in ('en', 'ar')),
  add column prize_category text check (prize_category in ('qirtas', 'qalam')),
  add constraint certificate_names_someone check (
    (kind = 'prize' and user_id is not null and prize_category is not null)
    -- An issued Qalam certificate outlives the roster, deleted three years
    -- after the program.
    or (kind = 'qalam' and (qalam_student_id is not null or issued_at is not null))
  );

comment on column membership.certificates.lang is
  'The certificate''s one language, the one its recipient chose (owner, Nov 7, 2026); the Arabic one is mirrored with the Arabic lockup.';
comment on column membership.certificates.first_signed_by is
  'The first signer: the Qalam lead for Qalam, the Editor-in-Chief for the Mutanabbi Prize.';
comment on column membership.certificates.second_signed_by is
  'The second signer: the Editor-in-Chief for Qalam, the President for the Mutanabbi Prize.';

-- Who signs which certificate, in order.
create function private.certificate_signer_roles(kind text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case kind
    when 'qalam' then array['qalam_lead', 'eic']
    when 'prize' then array['eic', 'president']
  end;
$$;
revoke all on function private.certificate_signer_roles(text) from public, anon, authenticated;

-- Whether the caller holds a role now (the Acting President signs for the
-- President while one is in office).
create function private.holds_role_now(role_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from access.role_assignments a
    where a.user_id = (select auth.uid())
      and (a.role = role_key or (role_key = 'president' and a.role = 'acting_president'))
      and a.starts_at <= now()
      and (a.ends_at is null or a.ends_at > now())
  );
$$;
revoke all on function private.holds_role_now(text) from public, anon, authenticated;

create or replace function private.guard_certificate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' or new.first_signed_by is not null or new.second_signed_by is not null
      or new.serial is not null then
      raise exception 'certificate_starts_draft' using errcode = '22023';
    end if;
  elsif current_user = 'authenticated' then
    if old.status <> 'draft'
      or new.status is distinct from old.status
      or new.serial is distinct from old.serial
      or new.first_signed_by is distinct from old.first_signed_by
      or new.second_signed_by is distinct from old.second_signed_by
      or new.verification_code is distinct from old.verification_code then
      raise exception 'certificate_locked' using errcode = '42501';
    end if;
    if old.first_signed_by is not null or old.second_signed_by is not null then
      raise exception 'certificate_signed' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.sign_certificate(certificate_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c membership.certificates;
  roles text[];
  year_text text;
  next_number integer;
begin
  select * into c from membership.certificates where id = certificate_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if c.status <> 'draft' then
    raise exception 'not_draft' using errcode = '22023';
  end if;
  if c.user_id = (select auth.uid()) then
    raise exception 'not_your_own' using errcode = '42501';
  end if;
  if not access.has_permission('certificates.sign') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  roles := private.certificate_signer_roles(c.kind);

  if c.first_signed_by is null and private.holds_role_now(roles[1]) then
    update membership.certificates
    set first_signed_by = (select auth.uid()), first_signed_at = now()
    where id = certificate_id;
  elsif c.second_signed_by is null and private.holds_role_now(roles[2])
    and c.first_signed_by is distinct from (select auth.uid()) then
    update membership.certificates
    set second_signed_by = (select auth.uid()), second_signed_at = now()
    where id = certificate_id;
  else
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select * into c from membership.certificates where id = certificate_id;
  if c.first_signed_by is not null and c.second_signed_by is not null then
    perform pg_advisory_xact_lock(hashtext('membership.certificates.serial'));
    year_text := to_char(now() at time zone 'Asia/Baghdad', 'YYYY');
    select coalesce(max(split_part(serial, '-', 3)::int), 0) + 1 into next_number
    from membership.certificates where serial like 'SAL-' || year_text || '-%';
    update membership.certificates set
      status = 'issued',
      issued_at = now(),
      serial = 'SAL-' || year_text || '-' || lpad(next_number::text, 3, '0')
    where id = certificate_id;
    return 'issued';
  end if;
  return 'signed';
end;
$$;

-- The signers' names, for the certificate's foot.
drop function if exists membership.certificate_signers(uuid);
drop function if exists private.certificate_signers(uuid);
create function private.certificate_signers(certificate_id uuid)
returns table (first_en text, first_ar text, second_en text, second_ar text)
language sql
stable
security definer
set search_path = ''
as $$
  select fp.full_name_en, fp.full_name_ar, sp.full_name_en, sp.full_name_ar
  from membership.certificates c
  left join core.profiles fp on fp.id = c.first_signed_by
  left join core.profiles sp on sp.id = c.second_signed_by
  where c.id = certificate_id
    and (
      c.user_id = (select auth.uid())
      or access.has_permission('certificates.prepare')
      or access.has_permission('certificates.sign')
    );
$$;
revoke all on function private.certificate_signers(uuid) from public, anon;
grant execute on function private.certificate_signers(uuid) to authenticated;

create function membership.certificate_signers(certificate_id uuid)
returns table (first_en text, first_ar text, second_en text, second_ar text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.certificate_signers(certificate_id) $$;
revoke all on function membership.certificate_signers(uuid) from public, anon;
grant execute on function membership.certificate_signers(uuid) to authenticated;

-- The check page: what was awarded and when. A Qalam student shows as the
-- first name, last initial, school and year only.
drop function if exists membership.verify_certificate(text);
drop function if exists private.verify_certificate(text);
create function private.verify_certificate(code text)
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
    case when c.kind = 'qalam' then q.first_name || ' ' || left(q.last_name, 1) || '.' else p.full_name_en end,
    case when c.kind = 'qalam' then q.first_name || ' ' || left(q.last_name, 1) || '.' else p.full_name_ar end,
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
revoke all on function private.verify_certificate(text) from public;
grant execute on function private.verify_certificate(text) to anon, authenticated;

create function membership.verify_certificate(code text)
returns table (
  serial text, kind text, prize_category text, status text,
  holder_en text, holder_ar text, school text, year integer,
  citation_en text, citation_ar text, issued_at timestamptz, revoked_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.verify_certificate(code) $$;
revoke all on function membership.verify_certificate(text) from public;
grant execute on function membership.verify_certificate(text) to anon, authenticated;

-- Signing and preparing follow the signers: the Qalam lead, the
-- Editor-in-Chief and the President (or the Acting President). The Faculty
-- Advisor no longer countersigns.
delete from access.role_permissions where permission = 'certificates.countersign';
insert into access.role_permissions (role, permission) values
  ('qalam_lead', 'certificates.sign'),
  ('eic', 'certificates.sign'),
  ('acting_president', 'certificates.sign'),
  ('qalam_lead', 'certificates.prepare'),
  ('eic', 'certificates.prepare')
on conflict do nothing;

drop policy "Holders read their own certificates" on membership.certificates;
create policy "Holders read their own certificates" on membership.certificates
  for select to authenticated
  using (
    (user_id = (select auth.uid()) and status <> 'draft')
    or (select private.has_permission('certificates.prepare'))
    or (select private.has_permission('certificates.sign'))
  );

-- ── 2. The card's check: name, class, status and member since ─────────────

drop function if exists membership.card_record(text);
drop function if exists private.card_record(text);
alter table core.profiles drop column if exists show_certificates_on_card;

-- ── 3. Service letters (F-05) ───────────────────────────────────────────────

create table membership.service_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lang text not null default 'en' check (lang in ('en', 'ar')),
  role_en text not null check (char_length(role_en) between 1 and 200),
  role_ar text check (char_length(role_ar) <= 200),
  period_from date not null,
  period_to date,
  hours numeric(6, 2) check (hours >= 0),
  body text check (char_length(body) <= 3000),
  verification_code text not null unique
    default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  issued_by uuid default auth.uid() references auth.users (id) on delete set null,
  -- The signer's name as it stood when the letter was written (the holder
  -- reads it on the letter; the profile may change or go).
  signer_en text,
  signer_ar text,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoke_reason text check (char_length(revoke_reason) <= 500),
  check (period_to is null or period_to >= period_from),
  check (revoked_at is null or revoke_reason is not null)
);

create index service_letters_user_id_idx on membership.service_letters (user_id);
create index service_letters_issued_by_idx on membership.service_letters (issued_by);

alter table membership.service_letters enable row level security;

create policy "No third-party apps" on membership.service_letters
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('membership')))
  with check ((select private.client_allows('membership')));

create policy "Holders and the Director of Membership read letters" on membership.service_letters
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_permission('members.manage')));

create policy "The Director of Membership writes letters" on membership.service_letters
  for insert to authenticated
  with check ((select private.has_permission('members.manage')) and user_id <> (select auth.uid()));

create policy "The Director of Membership revokes letters" on membership.service_letters
  for update to authenticated
  using ((select private.has_permission('members.manage')))
  with check ((select private.has_permission('members.manage')));

revoke all on membership.service_letters from anon, authenticated;
grant select on membership.service_letters to authenticated;
grant insert (id, user_id, lang, role_en, role_ar, period_from, period_to, hours, body)
  on membership.service_letters to authenticated;
grant update (revoked_at, revoke_reason) on membership.service_letters to authenticated;
grant all on membership.service_letters to service_role;

create function private.service_letter_signer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select p.full_name_en, p.full_name_ar into new.signer_en, new.signer_ar
  from core.profiles p where p.id = new.issued_by;
  return new;
end;
$$;
revoke all on function private.service_letter_signer() from public, anon, authenticated;

create trigger service_letter_signer
  before insert on membership.service_letters
  for each row execute function private.service_letter_signer();

comment on table membership.service_letters is
  'Service letters (SAL-EXB-01 · F-05, owner, Nov 7, 2026): written by the Director of Membership on request, from one letter template, each with a verification code checked on auibsal.org/verify/<code>. Service is a letter, never a certificate.';

-- The check: who, for what, when, and whether it stands.
create function private.verify_service_letter(code text)
returns table (
  holder_en text, holder_ar text, role_en text, role_ar text,
  period_from date, period_to date, issued_at timestamptz, revoked_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.full_name_en, p.full_name_ar, l.role_en, l.role_ar,
    l.period_from, l.period_to, l.issued_at, l.revoked_at
  from membership.service_letters l
  join core.profiles p on p.id = l.user_id
  where l.verification_code = lower(trim(verify_service_letter.code));
$$;
revoke all on function private.verify_service_letter(text) from public;
grant execute on function private.verify_service_letter(text) to anon, authenticated;

create function membership.verify_service_letter(code text)
returns table (
  holder_en text, holder_ar text, role_en text, role_ar text,
  period_from date, period_to date, issued_at timestamptz, revoked_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.verify_service_letter(code) $$;
revoke all on function membership.verify_service_letter(text) from public;
grant execute on function membership.verify_service_letter(text) to anon, authenticated;
