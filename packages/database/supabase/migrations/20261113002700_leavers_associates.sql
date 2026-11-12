-- Leavers become Associates (fourth prompt, 7k; decisions.md, Members):
-- a student who leaves AUIB without graduating moves to Associate exactly as
-- a graduate does, keeping the account, number, history and the members'
-- group, losing the vote and any seat. (Since Nov 7 a leaver had become a
-- guest.)

create or replace function private.record_departure(member uuid, graduated boolean)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  m membership.memberships;
begin
  if not private.has_permission('members.manage') then
    raise exception 'The Director of Membership records who left' using errcode = '42501';
  end if;
  select * into m from membership.memberships where user_id = member for update;
  if not found or m.tier <> 'member' then
    raise exception 'not_a_student_member' using errcode = 'P0002';
  end if;

  -- Office goes with the student class, either way.
  update access.role_assignments
  set ends_at = now()
  where user_id = member and starts_at < now() and (ends_at is null or ends_at > now());
  delete from access.role_assignments
  where user_id = member and starts_at >= now();

  -- Graduates and leavers alike become Associates (decisions.md, Members:
  -- the class follows the person's status; fourth prompt, 7k): the same
  -- account, number and history; no vote and no seat; the members' group
  -- stays. The Wallet pass follows the class.
  update membership.memberships set tier = 'associate' where user_id = member;
  perform private.enqueue('wallet.refresh', jsonb_build_object('user_id', member));
  return 'associate';
end;
$function$;
