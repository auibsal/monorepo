-- One form flow (decisions.md, The site): every application gets its record
-- number (SUB-<year>-<n>) the moment it is sent, shown on the receipt on the
-- page and in Your account, as Submit to Qirtas already does. The four other
-- flows: an opening's application, an audition sign-up, a nomination and
-- the partner application.

alter table programmes.opening_replies add column reference text unique;
alter table programmes.audition_signups add column reference text unique;
alter table governance.candidates add column reference text unique;
alter table governance.partner_agreements add column application_reference text unique;

comment on column programmes.opening_replies.reference is
  'The record number, SUB-<year>-<n>, given when the application is sent (not while a draft).';
comment on column programmes.audition_signups.reference is
  'The record number, SUB-<year>-<n>, given on signing up.';
comment on column governance.candidates.reference is
  'The record number, SUB-<year>-<n>, given on standing.';
comment on column governance.partner_agreements.application_reference is
  'The partner application''s record number, SUB-<year>-<n>, given when it is signed and sent; the memorandum takes its MOU number on countersigning.';

-- The numbers, given once.
create function private.give_application_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'opening_replies' then
    if new.status <> 'draft' and new.reference is null then
      new.reference := private.next_code('SUB');
    end if;
  elsif tg_table_name = 'partner_agreements' then
    if new.applied_by is not null and new.application_reference is null then
      new.application_reference := private.next_code('SUB');
    end if;
  elsif new.reference is null then
    new.reference := private.next_code('SUB');
  end if;
  return new;
end;
$$;
revoke all on function private.give_application_number() from public, anon, authenticated;

create trigger opening_replies_number
  before insert or update of status on programmes.opening_replies
  for each row execute function private.give_application_number();
create trigger audition_signups_number
  before insert on programmes.audition_signups
  for each row execute function private.give_application_number();
create trigger candidates_number
  before insert on governance.candidates
  for each row execute function private.give_application_number();
create trigger partner_agreements_number
  before insert or update of applied_by on governance.partner_agreements
  for each row execute function private.give_application_number();

-- Those already sent take theirs now, in the year they were sent.
update programmes.opening_replies
set reference = private.next_code('SUB', extract(year from coalesce(submitted_at, created_at))::integer)
where status <> 'draft' and reference is null;
update programmes.audition_signups
set reference = private.next_code('SUB', extract(year from created_at)::integer)
where reference is null;
update governance.candidates
set reference = private.next_code('SUB', extract(year from created_at)::integer)
where reference is null;
update governance.partner_agreements
set application_reference = private.next_code('SUB', extract(year from created_at)::integer)
where applied_by is not null and application_reference is null;

-- The partner application, as the applicant sees it: with its number.
drop function governance.my_partner_application();
drop function private.my_partner_application();

create function private.my_partner_application()
returns table (partner_id uuid, slug text, name_en text, name_ar text,
  partner_status text, agreement_status text, applied_at timestamptz,
  reference text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.slug, p.name_en, p.name_ar, p.status, a.status,
    a.partner_signed_at, a.application_reference
  from governance.partner_agreements a
  join governance.partners p on p.id = a.partner_id
  where a.applied_by = (select auth.uid())
  order by a.created_at desc
  limit 1;
$$;
revoke all on function private.my_partner_application() from public, anon;
grant execute on function private.my_partner_application() to authenticated;

create function governance.my_partner_application()
returns table (partner_id uuid, slug text, name_en text, name_ar text,
  partner_status text, agreement_status text, applied_at timestamptz,
  reference text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_partner_application() $$;
revoke all on function governance.my_partner_application() from public, anon;
grant execute on function governance.my_partner_application() to authenticated;
