-- A list's addresses go 30 days after its send (decisions §12), and with
-- them the contacts Resend kept for the Broadcast (decisions §18). The
-- daily purge hands each such list to the outbox, whose job removes the
-- contacts from Resend and then deletes the addresses here.

create or replace function private.purge_tour_lists()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer := 0;
  m integer := 0;
  until date := (private.setting('tour.unclaimed_until') #>> '{}')::date;
  list_source text;
begin
  for list_source in
    select distinct l.source from membership.invitation_lists l
    where l.sent_at is not null and l.sent_at < now() - interval '30 days'
      and exists (select 1 from membership.invitations i where i.source = l.source)
  loop
    perform private.enqueue('invitation.forget', jsonb_build_object('source', list_source));
    n := n + 1;
  end loop;
  if until is not null and private.today() > until then
    delete from programmes.six_words where user_id is null and tour is not null;
    get diagnostics m = row_count;
  end if;
  return n + m;
end;
$$;

revoke all on function private.purge_tour_lists() from public, anon, authenticated;

-- The job's last step, once Resend has let go of the contacts.
create function private.forget_invitation_list(list_source text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from membership.invitations i
  using membership.invitation_lists l
  where i.source = forget_invitation_list.list_source and l.source = i.source
    and l.sent_at is not null and l.sent_at < now() - interval '30 days';
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function private.forget_invitation_list(text) from public, anon, authenticated;
grant execute on function private.forget_invitation_list(text) to service_role;

create function membership.forget_invitation_list(list_source text)
returns integer language sql security invoker set search_path = ''
as $$ select private.forget_invitation_list(list_source) $$;

revoke all on function membership.forget_invitation_list(text) from public, anon, authenticated;
grant execute on function membership.forget_invitation_list(text) to service_role;
