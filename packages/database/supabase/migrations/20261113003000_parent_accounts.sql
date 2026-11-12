-- Parents (decisions.md, Members: Parents; the fourth prompt, 7k): the
-- consent link makes a guest account with the "Parent" role linked to the
-- child, which shows the child's consents and lets the parent withdraw
-- them. The role ends when the child turns 18; the guest account stays.
--
-- The API route that takes the signed link (/api/forms/sign) creates or
-- finds the parent's account by the address the link was sent to, then
-- calls governance.make_parent. Nothing here names a person.

-- The account behind an address, for the API route only.
create function private.user_by_email(email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id from auth.users u where lower(u.email) = lower(btrim(user_by_email.email)) limit 1;
$$;
revoke all on function private.user_by_email(text) from public, anon, authenticated;
grant execute on function private.user_by_email(text) to service_role;

create function governance.user_by_email(email text)
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$ select private.user_by_email($1) $$;
revoke all on function governance.user_by_email(text) from public, anon, authenticated;
grant execute on function governance.user_by_email(text) to service_role;

-- What the parent's link was about: the child, and the address it went to.
create function private.parent_link(submission_id uuid)
returns table (child uuid, sent_to text)
language sql
stable
security definer
set search_path = ''
as $$
  select l.subject_user, l.sent_to from governance.form_links l
  where l.submission_id = parent_link.submission_id
    and l.form_key = 'f46' and l.used_at is not null and l.subject_user is not null;
$$;
revoke all on function private.parent_link(uuid) from public, anon, authenticated;
grant execute on function private.parent_link(uuid) to service_role;

create function governance.parent_link(submission_id uuid)
returns table (child uuid, sent_to text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.parent_link($1) $$;
revoke all on function governance.parent_link(uuid) from public, anon, authenticated;
grant execute on function governance.parent_link(uuid) to service_role;

-- The parent's account becomes a guest's (unless it already has a class)
-- with the Parent role on the child, until the child turns 18.
create function private.make_parent(submission_id uuid, parent uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  kid uuid;
  until timestamptz;
  role_id uuid;
begin
  select l.child into kid from private.parent_link(make_parent.submission_id) l;
  if kid is null or parent is null or kid = parent then
    raise exception 'not_a_parent_consent' using errcode = '22023';
  end if;

  if private.membership_kind(parent) is null then
    insert into membership.guests (user_id) values (parent)
    on conflict (user_id) do update set ended_at = null;
  end if;

  select make_date(p.birth_year, p.birth_month, 1) + interval '18 years'
  into until from core.profiles p
  where p.id = kid and p.birth_year is not null and p.birth_month is not null;

  select a.id into role_id from access.role_assignments a
  where a.user_id = parent and a.role = 'parent' and a.scope_type = 'member'
    and a.scope_id = kid and (a.ends_at is null or a.ends_at > now());
  if role_id is null then
    insert into access.role_assignments (user_id, role, scope_type, scope_id, starts_at, ends_at, note)
    values (parent, 'parent', 'member', kid, now(), until, 'By the parent''s consent (F-46)')
    returning id into role_id;
  end if;
  return role_id;
end;
$$;
revoke all on function private.make_parent(uuid, uuid) from public, anon, authenticated;
grant execute on function private.make_parent(uuid, uuid) to service_role;

create function governance.make_parent(submission_id uuid, parent uuid)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.make_parent($1, $2) $$;
revoke all on function governance.make_parent(uuid, uuid) from public, anon, authenticated;
grant execute on function governance.make_parent(uuid, uuid) to service_role;

-- The parent's view: each child, by first name and last initial, and the
-- consents signed for them by link.
create function private.my_children_consents()
returns table (
  child uuid,
  child_name_en text,
  child_name_ar text,
  submission_id uuid,
  form_key text,
  signed_at timestamptz,
  withdrawn_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.scope_id, private.card_name(a.scope_id, 'en'), private.card_name(a.scope_id, 'ar'),
    s.id, s.form_key, s.signed_at, s.withdrawn_at
  from access.role_assignments a
  join governance.form_links l on l.subject_user = a.scope_id and l.used_at is not null
  join governance.form_submissions s on s.id = l.submission_id
  where a.user_id = (select auth.uid()) and a.role = 'parent' and a.scope_type = 'member'
    and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now())
  order by s.signed_at desc;
$$;
revoke all on function private.my_children_consents() from public, anon;
grant execute on function private.my_children_consents() to authenticated;

create function governance.my_children_consents()
returns table (
  child uuid,
  child_name_en text,
  child_name_ar text,
  submission_id uuid,
  form_key text,
  signed_at timestamptz,
  withdrawn_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_children_consents() $$;
revoke all on function governance.my_children_consents() from public, anon;
grant execute on function governance.my_children_consents() to authenticated, service_role;

-- A parent withdraws a consent for the future; the signed copy stays,
-- marked withdrawn. Withdrawing F-46 puts the child's limits back.
create function private.parent_withdraw_consent(submission_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  s governance.form_submissions;
  kid uuid;
begin
  select l.subject_user into kid from governance.form_links l
  where l.submission_id = parent_withdraw_consent.submission_id and l.used_at is not null;
  if kid is null or not exists (
    select 1 from access.role_assignments a
    where a.user_id = (select auth.uid()) and a.role = 'parent' and a.scope_type = 'member'
      and a.scope_id = kid and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now())
  ) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into s from governance.form_submissions f
  where f.id = parent_withdraw_consent.submission_id for update;
  if s.withdrawn_at is not null then
    return s.withdrawn_at;
  end if;
  update governance.form_submissions set withdrawn_at = now() where id = s.id;
  if s.form_key = 'f46' then
    update core.profiles set parent_consent_at = null where id = kid;
  end if;
  return now();
end;
$$;
revoke all on function private.parent_withdraw_consent(uuid) from public, anon;
grant execute on function private.parent_withdraw_consent(uuid) to authenticated;

create function governance.parent_withdraw_consent(submission_id uuid)
returns timestamptz
language sql
security invoker
set search_path = ''
as $$ select private.parent_withdraw_consent($1) $$;
revoke all on function governance.parent_withdraw_consent(uuid) from public, anon;
grant execute on function governance.parent_withdraw_consent(uuid) to authenticated, service_role;

-- Outside roles sit on a guest's account (decisions.md, Members: one
-- account model): a guest may hold the Parent and Qalam student roles, as
-- a guest editor's, besides a partner's.
create or replace function private.one_membership_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.ends_at is not null and new.ends_at <= now() then
    return new;
  end if;
  if new.role in ('partner_rep', 'partner_lead') then
    if not private.may_become(new.user_id, 'partner') then
      raise exception 'one_membership' using errcode = '42501';
    end if;
  elsif new.role not in ('guest_editor', 'parent', 'qalam_student', 'advisory_board_member')
    and (private.is_guest(new.user_id)
      or (private.is_partner_team(new.user_id) and not private.is_member(new.user_id))) then
    raise exception 'one_membership' using errcode = '42501';
  end if;
  return new;
end;
$$;
