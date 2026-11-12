-- TEMPORARY (the owner's ask, with 20261113004300): while the site is set
-- up and tested,
--
-- 1. the President needs no second officer: what would wait for another
--    officer's approval (an official name, a Council role, a removal…)
--    takes effect at once when the President does it (on a two-step
--    session, as the President's role requires);
-- 2. the Vice President does not inherit the President's temporary grants
--    while the President is recorded absent; only the seat's usual ones.
--
-- To undo: restore private.second_officer() and private.has_permission()
-- from 20261113001500_two_officers.sql and
-- 20261108000800_president_and_qirtas.sql, and drop private.is_president().

create function private.is_president()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from access.role_assignments a
    join access.roles r on r.key = a.role
    where a.user_id = (select auth.uid())
      and a.role = 'president'
      and a.starts_at <= now()
      and (a.ends_at is null or a.ends_at > now())
      and (not r.requires_mfa or (select private.session_two_step()))
  );
$$;

revoke all on function private.is_president() from public, anon;
grant execute on function private.is_president() to authenticated, service_role;

create or replace function private.second_officer()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(current_setting('sal.second_officer', true), '') = 'on'
    or private.is_president()
$$;

create or replace function private.has_permission(
  permission text,
  scope_type text default 'global',
  scope_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from access.role_assignments a
    join access.roles r on r.key = a.role
    join access.role_permissions rp
      on rp.permission = has_permission.permission
      and (
        rp.role = a.role
        or (
          a.role = 'vice_president' and rp.role = 'president'
          and private.president_absent()
          -- Not the President's temporary grants (20261113004300).
          and rp.permission not in (
            'certificates.countersign', 'concerns.about_president', 'elections.manage',
            'journal.advise', 'journal.approve', 'journal.copy', 'journal.decide',
            'journal.edit.gallery', 'journal.edit.games', 'journal.edit.letters',
            'journal.edit.news', 'journal.edit.video', 'journal.edit.voices',
            'journal.frontpage', 'journal.identity.view', 'journal.manage', 'journal.prize',
            'journal.publish', 'journal.review', 'media.guest_ideas', 'partners.lead',
            'partners.own', 'qalam.manage')
        )
      )
    where a.user_id = (select auth.uid())
      and a.starts_at <= now()
      and (a.ends_at is null or a.ends_at > now())
      and (not r.requires_mfa or (select private.session_two_step()))
      and (
        a.scope_type = 'global'
        or (
          a.scope_type = has_permission.scope_type
          and a.scope_id = has_permission.scope_id
        )
      )
  );
$$;
