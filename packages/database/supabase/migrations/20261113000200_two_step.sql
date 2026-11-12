-- Two-step sign-in (decisions.md, Members; Get involved and roles): offered
-- to everyone, required for officers, Council seats and every role that
-- sees personal data from Sunday, November 22, 2026. A passkey sign-in
-- meets it on its own: a passkey is already two factors (NIST SP 800-63B's
-- phishing-resistant authenticator).

-- ── A passkey sign-in counts ─────────────────────────────────────────────

create or replace function private.session_two_step()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
    or exists (
      select 1
      from jsonb_array_elements(coalesce((select auth.jwt() -> 'amr'), '[]'::jsonb)) as m(entry)
      where case jsonb_typeof(m.entry)
              when 'object' then m.entry ->> 'method'
              when 'string' then m.entry #>> '{}'
            end in ('passkey', 'webauthn', 'mfa/webauthn')
    );
$$;

comment on function private.session_two_step() is
  'Whether this session has two steps: an authenticator code (aal2) or a passkey sign-in (decisions.md, Members).';

-- ── Roles that see personal data, from Nov 22 ────────────────────────────

alter table access.roles add column requires_mfa_from timestamptz;

comment on column access.roles.requires_mfa_from is
  'When two-step sign-in becomes required for the role (decisions.md: every role that sees personal data, from Sun Nov 22, 2026); the daily job then sets requires_mfa.';

update access.roles r
set requires_mfa_from = '2026-11-22 00:00:00+03'
where not r.requires_mfa
  and exists (
    select 1 from access.role_permissions rp
    where rp.role = r.key
      and rp.permission in (
        'audit.read', 'concerns.handle', 'events.checkin', 'events.manage',
        'forms.handle', 'journal.identity.view', 'mailing.read',
        'members.manage', 'members.register', 'members.verify',
        'partners.lead', 'partners.manage', 'partners.own',
        'productions.manage', 'qalam.manage', 'settings.manage', 'tour.run'
      )
  );

create function private.start_two_step_requirements()
returns void
language sql
security definer
set search_path = ''
as $$
  update access.roles
  set requires_mfa = true
  where not requires_mfa
    and requires_mfa_from is not null
    and requires_mfa_from <= now();
$$;

revoke all on function private.start_two_step_requirements() from public, anon, authenticated;

select private.start_two_step_requirements();
select cron.schedule('sal-two-step-from', '5 * * * *', $$ select private.start_two_step_requirements() $$);

-- ── When the person's own roles start to need it ─────────────────────────

create function private.two_step_from()
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select min(r.requires_mfa_from)
  from access.role_assignments a
  join access.roles r on r.key = a.role
  where a.user_id = (select auth.uid())
    and not r.requires_mfa
    and r.requires_mfa_from > now()
    and a.starts_at <= now()
    and (a.ends_at is null or a.ends_at > now());
$$;

revoke all on function private.two_step_from() from public, anon;
grant execute on function private.two_step_from() to authenticated, service_role;

create function access.two_step_from()
returns timestamptz
language sql
stable
security invoker
set search_path = ''
as $$ select private.two_step_from() $$;

revoke all on function access.two_step_from() from public, anon;
grant execute on function access.two_step_from() to authenticated, service_role;

comment on function access.two_step_from() is
  'The date one of the caller''s roles starts to need two-step sign-in, while it is still ahead; null otherwise.';
