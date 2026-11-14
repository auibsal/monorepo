-- One sign-up for everyone, on one screen (decisions.md, Members; the
-- ninth site prompt, 2).
--
-- - Any address may sign up. An @auib.edu.iq address answers "Student" or
--   "Faculty, staff or alumni" and becomes a Member or an Associate (the
--   Director of Membership can correct it); any other address becomes a
--   Guest, and "I studied at AUIB" sends an Associate request. An
--   invitation (Associate, Honorary, a partner's team or guests, a
--   parent's consent link, Qalam) uses the same page and attaches its role.
-- - No boxes to agree and no signature: one line by the button. The
--   acceptance is logged on the account with the versions of the Terms,
--   the Privacy Notice and the Code of Conduct and the time; it is not a
--   signed record, goes nowhere in Documents and sends no email. The same
--   line is the consent to sign electronically.
-- - The official name's parts and the Arabic form are given here, and the
--   name is locked at once (20261114000000).

alter table core.profiles
  add column accepted_versions jsonb
    check (accepted_versions is null or jsonb_typeof(accepted_versions) = 'object');

comment on column core.profiles.accepted_versions is
  'The versions of the Terms, the Privacy Notice and the Code of Conduct accepted by the sign-up line, with agreed_at as the time. Not a signed record.';

insert into core.settings (key, value) values
  ('terms.version', '"1"'),
  ('privacy.version', '"1"'),
  ('code_of_conduct.version', '"1"')
on conflict (key) do nothing;

-- Any address may sign up now; the class follows the address. An
-- invitation still belongs to its address: a code sent to one address
-- does not sign up another.
create or replace function private.sign_up_allowed(email text, meta jsonb)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(meta ->> 'invitation', '') is null
    or exists (
      select 1 from governance.partner_invitations i
      where i.code = meta ->> 'invitation'
        and private.invitation_usable(i)
        and (i.email is null or i.email = lower(sign_up_allowed.email))
    );
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  agreed boolean := meta ? 'agreed_at';
begin
  insert into core.profiles (
    id, full_name_en, full_name_ar, locale, agreed_at, accepted_versions,
    esign_asked_at, esign_agreed_at, title_form,
    first_name_en, father_name_en, grandfather_name_en, last_name_en,
    first_name_ar, father_name_ar, grandfather_name_ar, last_name_ar,
    legal_name_locked_at
  )
  values (
    new.id,
    left(btrim(coalesce(nullif(meta ->> 'full_name_en', ''),
      concat_ws(' ', meta ->> 'first_name_en', meta ->> 'last_name_en'))), 120),
    nullif(left(btrim(coalesce(nullif(meta ->> 'full_name_ar', ''),
      concat_ws(' ', meta ->> 'first_name_ar', meta ->> 'last_name_ar'))), 120), ''),
    case when meta ->> 'locale' = 'ar' then 'ar' else 'en' end,
    -- The sign-up line (sign-in-wrap): the time is the database's.
    case when agreed then now() end,
    case when agreed then jsonb_build_object(
      'terms', coalesce((select s.value #>> '{}' from core.settings s where s.key = 'terms.version'), '1'),
      'privacy', coalesce((select s.value #>> '{}' from core.settings s where s.key = 'privacy.version'), '1'),
      'code_of_conduct', coalesce((select s.value #>> '{}' from core.settings s where s.key = 'code_of_conduct.version'), '1')
    ) end,
    -- The line is also the consent to sign electronically (E-SIGN).
    case when agreed then now() end,
    case when agreed then now() end,
    case when meta ->> 'title_form' in ('masculine', 'feminine') then meta ->> 'title_form' end,
    meta ->> 'first_name_en', meta ->> 'father_name_en',
    meta ->> 'grandfather_name_en', meta ->> 'last_name_en',
    meta ->> 'first_name_ar', meta ->> 'father_name_ar',
    meta ->> 'grandfather_name_ar', meta ->> 'last_name_ar',
    now()
  )
  on conflict (id) do nothing;

  if private.is_auib_email(new.email) and new.email_confirmed_at is not null then
    perform private.verify_user(new.id);
  end if;

  return new;
end;
$$;

-- On confirmation, the class: an AUIB address is a Member (a student) or an
-- Associate (faculty, staff or alumni); any other address, with no
-- invitation and no partner application, a Guest, and "I studied at AUIB"
-- sends the Associate request for the Director of Membership.
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
    if meta ->> 'class' = 'staff' then
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
