-- Student Life's staff and the Faculty Advisor sit on Associate accounts
-- (decisions.md, Members: "Accounts follow one model"; fourth prompt, 6).
-- Assigning either outside role puts the person on one (the assignment is
-- the officer's word for it, as an invitation is): an account with no
-- class or a guest's becomes an Associate account, and a Member account
-- (staff who signed up with their AUIB address are Members until then,
-- like the Campus Recreation Officer's) moves to Associate, keeping its
-- number and history. An Honorary Member stays one.
--
-- The trigger's name sorts before one_membership, which refuses roles on a
-- guest's account, so the guest has become an Associate by then.

create function private.associate_for_outside_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_tier membership.tier;
begin
  if new.role not in ('student_life', 'faculty_advisor')
     or (new.ends_at is not null and new.ends_at <= now()) then
    return new;
  end if;
  select m.tier into current_tier from membership.memberships m where m.user_id = new.user_id;
  if current_tier = 'member' then
    update membership.memberships set tier = 'associate' where user_id = new.user_id;
  elsif current_tier is null then
    update core.profiles set verified_at = coalesce(verified_at, now()) where id = new.user_id;
    update membership.guests set ended_at = now() where user_id = new.user_id and ended_at is null;
    insert into membership.memberships (user_id, tier) values (new.user_id, 'associate');
  end if;
  return new;
end;
$$;

revoke all on function private.associate_for_outside_role() from public, anon, authenticated;

create trigger associate_for_outside_role
  before insert on access.role_assignments
  for each row execute function private.associate_for_outside_role();
