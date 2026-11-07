-- The Register is private (decisions §6, §10; audit A2). Until now any
-- verified member could list every verified member's name, bio and photo
-- through the API. A profile is now read by:
--   - its owner;
--   - whoever keeps the Register (members.manage, members.verify), and the
--     staff (role holders), whose screens and pickers name members;
--   - the Director of Partnerships, for a partner's own people;
--   - other verified members only where the person is public anyway: they
--     chose the members' directory, they hold a role (the Council page, the
--     masthead), or they stand as an approved candidate.
-- Personal email and the legal name parts stay column-protected as before.

create function private.profile_visible(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    target = (select auth.uid())
    or private.has_permission('members.manage')
    or private.has_permission('members.verify')
    or private.is_staff((select auth.uid()))
    or (
      private.has_permission('partners.manage')
      and exists (
        select 1 from governance.partner_affiliations f where f.user_id = target
      )
    )
    or (
      private.is_verified()
      and (
        exists (
          select 1 from membership.memberships m
          where m.user_id = target and m.in_directory
        )
        or private.is_staff(target)
        or exists (
          select 1 from governance.candidates c
          where c.user_id = target and c.status = 'approved'
        )
      )
    );
$$;

revoke all on function private.profile_visible(uuid) from public, anon;
grant execute on function private.profile_visible(uuid) to authenticated;

drop policy "Select by authenticated" on core.profiles;

create policy "Select by authenticated" on core.profiles
  for select to authenticated
  using (private.profile_visible(id));
