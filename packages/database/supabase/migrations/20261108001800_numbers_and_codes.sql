-- Numbers and codes (decisions §6): records numbered by type and year,
-- with no meaning built in: CERT-, LTR-, RES-, MOU- and TOUR-<year>-<three
-- digits>; verification codes stay random and separate. Each series is
-- gapless: a number is taken in the same transaction that issues the
-- record, so a failed issue gives its number back.

-- ── One counter per series and year ─────────────────────────────────────────

create table core.code_counters (
  prefix text not null check (prefix in ('CERT', 'LTR', 'RES', 'MOU', 'TOUR')),
  year integer not null check (year between 2025 and 2200),
  last integer not null default 0 check (last >= 0),
  primary key (prefix, year)
);
comment on table core.code_counters is
  'The last number issued in each series and year (decisions §6), written only by private.next_code.';
alter table core.code_counters enable row level security;
revoke all on core.code_counters from anon, authenticated;
grant all on core.code_counters to service_role;
create policy "No third-party apps" on core.code_counters
  as restrictive for all to authenticated
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));

-- The next code in a series for the year (Baghdad time): CERT-2028-001.
create function private.next_code(prefix text, year integer default null)
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  insert into core.code_counters as c (prefix, year, last)
  values (next_code.prefix,
    coalesce(next_code.year, extract(year from now() at time zone 'Asia/Baghdad')::integer), 1)
  on conflict (prefix, year) do update set last = c.last + 1
  returning c.prefix || '-' || c.year || '-' || lpad(c.last::text, 3, '0');
$$;
revoke all on function private.next_code(text, integer) from public, anon, authenticated;

-- ── Certificates: CERT-<year>-<n> ────────────────────────────────────────────

alter table membership.certificates drop constraint certificates_serial_check;
alter table membership.certificates add constraint certificates_serial_check
  check (serial ~ '^CERT-\d{4}-\d{3,}$');

create or replace function private.sign_certificate(certificate_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c membership.certificates;
  roles text[];
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
    update membership.certificates set
      status = 'issued',
      issued_at = now(),
      serial = private.next_code('CERT')
    where id = certificate_id;
    return 'issued';
  end if;
  return 'signed';
end;
$$;

-- ── Letters: LTR-<year>-<n> ──────────────────────────────────────────────────

alter table membership.service_letters
  add column reference text unique check (reference ~ '^LTR-\d{4}-\d{3,}$');
comment on column membership.service_letters.reference is
  'The letter''s number (decisions §6), given when it is written; the verification code is separate.';
update membership.service_letters
set reference = private.next_code('LTR', extract(year from issued_at at time zone 'Asia/Baghdad')::integer)
where reference is null;

create function private.number_letter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.reference := private.next_code('LTR');
  else
    new.reference := old.reference;
  end if;
  return new;
end;
$$;
revoke all on function private.number_letter() from public, anon, authenticated;
create trigger number_letter before insert or update of reference on membership.service_letters
  for each row execute function private.number_letter();

-- ── Council resolutions: RES-<year>-<n>, on adoption ─────────────────────────
-- Gapless (decisions §6): a draft has no number; adoption gives the next
-- one for the year it was adopted, and an adopted resolution keeps it and
-- stays adopted. Failed motions are only in the minutes.

alter table governance.resolutions drop constraint resolutions_code_check;
alter table governance.resolutions alter column code drop not null;
update governance.resolutions set code = null where status <> 'adopted';
alter table governance.resolutions add constraint resolutions_code_check
  check ((code ~ '^RES-\d{4}-\d{3,}$' and status = 'adopted') or (code is null and status <> 'adopted'))
  not valid;

create function private.number_resolution()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.status = 'adopted' then
    if new.status <> 'adopted' then
      raise exception 'resolution_adopted' using errcode = '22023';
    end if;
    new.code := old.code;
    return new;
  end if;
  if new.status = 'adopted' then
    new.code := private.next_code('RES',
      extract(year from coalesce(new.adopted_on, (now() at time zone 'Asia/Baghdad')::date))::integer);
  else
    new.code := null;
  end if;
  return new;
end;
$$;
revoke all on function private.number_resolution() from public, anon, authenticated;
create trigger number_resolution before insert or update on governance.resolutions
  for each row execute function private.number_resolution();

-- ── Memoranda: MOU-<year>-<n>, when the President countersigns ──────────────

alter table governance.partner_agreements drop constraint partner_agreements_code_check;
alter table governance.partner_agreements add constraint partner_agreements_code_check
  check (code ~ '^MOU-\d{4}-\d{3,}$');

create function private.number_memorandum()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'signed' and old.status <> 'signed' and old.code is null then
    new.code := private.next_code('MOU');
  else
    new.code := old.code;
  end if;
  return new;
end;
$$;
revoke all on function private.number_memorandum() from public, anon, authenticated;
create trigger number_memorandum before update on governance.partner_agreements
  for each row execute function private.number_memorandum();

-- ── Typewriter Tour pages: TOUR-<year>-<n> ───────────────────────────────────
-- The 2026 pages keep their TT26- reference as the scan reference
-- (page_ref); every page gets its number, in the order it was recorded.

alter table programmes.six_words
  add column reference text unique check (reference ~ '^TOUR-\d{4}-\d{3,}$');
comment on column programmes.six_words.reference is
  'The page''s number (decisions §6); 2026 pages keep their TT26- scan reference in page_ref.';

do $$
declare
  page record;
begin
  for page in select id, created_at from programmes.six_words order by created_at, id loop
    update programmes.six_words
    set reference = private.next_code('TOUR', extract(year from page.created_at at time zone 'Asia/Baghdad')::integer)
    where id = page.id;
  end loop;
end;
$$;

create function private.number_tour_page()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.reference := private.next_code('TOUR');
  else
    new.reference := old.reference;
  end if;
  return new;
end;
$$;
revoke all on function private.number_tour_page() from public, anon, authenticated;
create trigger number_tour_page before insert or update of reference on programmes.six_words
  for each row execute function private.number_tour_page();
