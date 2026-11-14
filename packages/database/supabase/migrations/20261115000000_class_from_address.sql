-- The class follows the AUIB address, with no question (the owner, Nov 15,
-- 2026; decisions.md, Members).
--
-- AUIB gives students a number: "1241295@auib.edu.iq", or under the older
-- pattern "name.1241295@auib.edu.iq". Every other AUIB address
-- ("name.name@" or "name@") belongs to faculty or staff, an Associate.
-- Alumni don't keep their AUIB address; they join with another one and
-- "I studied at AUIB" asks the Director of Membership for Associate.
-- The database decides from the confirmed address alone; what the browser
-- sends is not asked any more.

create or replace function private.is_student_address(address text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select split_part(lower(btrim(coalesce(address, ''))), '@', 1) ~ '^([^.@]+\.)?[0-9]+$'
    and split_part(lower(btrim(coalesce(address, ''))), '@', 2) = 'auib.edu.iq';
$$;
revoke all on function private.is_student_address(text) from public, anon, authenticated;

comment on function private.is_student_address(text) is
  'An AUIB student''s address: a number, or a name and a number ("1241295@", "name.1241295@"). Any other AUIB address is faculty or staff.';

create or replace function private.handle_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if new.email_confirmed_at is null then
    return new;
  end if;
  if private.is_auib_email(new.email) then
    perform private.verify_user(new.id);
    -- Faculty and staff are Associates; a student stays a Member.
    if not private.is_student_address(new.email) then
      update membership.memberships set tier = 'associate'
      where user_id = new.id and tier = 'member'
        and created_at > now() - interval '1 day';
    end if;
    update membership.verification_requests
    set status = 'approved', decided_at = now(), decision_note = 'AUIB address confirmed'
    where user_id = new.id and status = 'pending';
  elsif coalesce(meta ->> 'invitation', '') = ''
    and coalesce(meta ->> 'partner_applicant', '') <> 'true'
    and private.membership_kind(new.id) is null
  then
    insert into membership.guests (user_id) values (new.id) on conflict do nothing;
    if meta ->> 'studied_at_auib' = 'true' then
      insert into membership.associate_requests (full_name, email, relation)
      select left(coalesce(nullif(btrim(p.full_name_en), ''), lower(new.email)), 120),
        lower(new.email), 'alumni'
      from core.profiles p where p.id = new.id
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;
