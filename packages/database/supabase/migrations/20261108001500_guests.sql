-- Guests (decisions §2, §10): a guest signs up themselves or is invited by a
-- partner or by an event's lead, has a number from the one series and a
-- Guest card for the door from the start, and may write for Qirtas
-- (bylined as a guest; never eligible for the Prize).

-- ── A card and number from the start ─────────────────────────────────────────

create trigger issue_card after insert on membership.guests
  for each row execute function private.issue_card();

insert into membership.cards (user_id)
select g.user_id from membership.guests g
where g.ended_at is null or g.ended_at > now()
on conflict (user_id) do nothing;

-- ── Guests write for Qirtas ──────────────────────────────────────────────────

-- Whether the signed-in person is a guest (answers only for themselves).
create function private.membership_is_guest()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select private.is_guest((select auth.uid())) $$;
revoke all on function private.membership_is_guest() from public, anon;
grant execute on function private.membership_is_guest() to authenticated;

drop policy "Members and partners' members submit their own work with curren" on journal.submissions;
create policy "Members and guests submit their own work" on journal.submissions
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (select private.membership_has_current_pledges())
    and (
      (
        ((select private.membership_is_member()) or (select private.membership_is_guest()))
        and (partner_id is null or (select private.can_submit_through(partner_id, call_id)))
      )
      or (partner_id is not null and (select private.can_submit_through(partner_id, call_id)))
    )
  );

-- ── An event's lead invites guests by named email ────────────────────────────

alter table governance.partner_invitations
  add column event_id uuid references events.events (id) on delete set null;
create index partner_invitations_event_idx on governance.partner_invitations (event_id);
grant select (event_id) on governance.partner_invitations to authenticated;
grant insert (event_id) on governance.partner_invitations to authenticated;
comment on column governance.partner_invitations.event_id is
  'The event a lead invited this guest to; the guest is the Society''s.';

create function private.leads_event_id(event uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from events.events e
    where e.id = leads_event_id.event
      and private.leads_event('events.manage', e.id, e.programme_id)
  );
$$;
revoke all on function private.leads_event_id(uuid) from public, anon;
grant execute on function private.leads_event_id(uuid) to authenticated;

drop policy "Whoever invites reads invitations" on governance.partner_invitations;
create policy "Whoever invites reads invitations" on governance.partner_invitations
  for select to authenticated
  using (
    case
      when partner_id is null then
        (select access.has_permission('members.manage'))
        or (event_id is not null and created_by = (select auth.uid()))
      else (select private.can_keep_partner(partner_id))
    end
  );

drop policy "The partner or Membership invites" on governance.partner_invitations;
create policy "The partner, Membership or an event's lead invites" on governance.partner_invitations
  for insert to authenticated
  with check (
    accepted_by is null and accepted_at is null and revoked_at is null
    and (
      (
        (select private.can_invite(partner_id, kind))
        and (partner_id is null or exists (
          select 1 from governance.partners p where p.id = partner_id and p.status = 'active'
        ))
      )
      or (
        partner_id is null and kind = 'guest' and email is not null
        and event_id is not null and (select private.leads_event_id(event_id))
      )
    )
  );

drop policy "Whoever invites withdraws" on governance.partner_invitations;
create policy "Whoever invites withdraws" on governance.partner_invitations
  for update to authenticated
  using (
    (select private.can_invite(partner_id, kind))
    or (event_id is not null and created_by = (select auth.uid()))
  )
  with check (
    (select private.can_invite(partner_id, kind))
    or (event_id is not null and created_by = (select auth.uid()))
  );
