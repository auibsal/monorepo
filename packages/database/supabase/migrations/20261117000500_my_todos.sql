-- To-dos (decisions.md, To-dos): each worked out from the record's current
-- state, never stored on its own, so it clears the moment the thing is
-- done and can't appear twice; a person's own to-dos are on Today, their
-- seat's on the Desk, and the count is the list's length. core.my_todos()
-- is the one list behind Today: one row per to-do, with the place it is
-- done. A role held before the agreement was introduced has it as its own
-- to-do, and its checklist then leaves the signing step out (no duplicate).

create function core.my_todos()
returns table (kind text, ref text)
language sql
stable
security invoker
set search_path = ''
as $$
  -- Consent to sign electronically, for an account made before sign-up
  -- asked for it, until answered.
  select 'esign', null::text
  from core.my_esign() e
  where e.asked_at is null and e.agreed_at is null
  union all
  -- The Arabic form of address.
  select 'arabic_form', null
  from core.my_private_profile() p
  where p.title_form is null
  union all
  -- The official name in four parts, in both languages.
  select 'name', null
  from core.my_name_parts() n
  where not (
    nullif(btrim(n.first_name_en), '') is not null
    and ((nullif(btrim(n.father_name_en), '') is not null and nullif(btrim(n.grandfather_name_en), '') is not null)
         or nullif(btrim(n.last_name_en), '') is not null)
    and nullif(btrim(n.first_name_ar), '') is not null
    and ((nullif(btrim(n.father_name_ar), '') is not null and nullif(btrim(n.grandfather_name_ar), '') is not null)
         or nullif(btrim(n.last_name_ar), '') is not null)
  )
  union all
  -- Someone who left AUIB with no confirmed personal email yet.
  select 'personal_email', null
  from core.my_addresses() a
  where a.left_auib_at is not null and a.sign_in_auib and not coalesce(a.personal_verified, false)
  union all
  -- "I'm still here," each September.
  select 'renewal', null where membership.renewal_due()
  union all
  -- Each role's agreement, until signed.
  select 'role_agreement', g.assignment_id::text
  from access.my_unsigned_role_agreements() g
  union all
  -- Each role's first steps still to take, one to-do per role; the
  -- signing step is left out where the agreement is its own to-do.
  select 'role_steps', c.assignment_id::text
  from access.my_role_checklist() c
  where not c.done
    and not (c.step = 'pledge' and exists (
      select 1 from access.my_unsigned_role_agreements() g
      where g.assignment_id = c.assignment_id))
  group by c.assignment_id
  union all
  -- A handover for a role ending soon or just ended.
  select 'handover', h.assignment_id::text
  from access.my_handovers_due() h;
$$;
revoke all on function core.my_todos() from public, anon;
grant execute on function core.my_todos() to authenticated;

comment on function core.my_todos() is
  'The caller''s to-dos on Today, each worked out from current state: one row per to-do.';

select private.build_api();
