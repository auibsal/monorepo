-- Removal from membership (decisions.md, Governance: "The Council may
-- remove a member from membership the same way", a two-thirds vote after
-- notice and a hearing; the fourth prompt, 7k). The vote is the Council's
-- adopted resolution; the site records the removal on it, and, like every
-- removal of a member, it takes two officers (decisions.md, Documents and
-- forms): one holding governance.manage asks, another approves on the Desk.
--
-- Removed: the person's roles end that day and their membership row goes;
-- the account, its number and its history stay (a guest of no one, with
-- Today and Settings). The person is told by email.

alter table governance.pending_actions drop constraint pending_actions_kind_check;
alter table governance.pending_actions add constraint pending_actions_kind_check
  check (kind in ('council_role', 'legal_name', 'student_life_export', 'member_removal'));

create table governance.removals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  resolution_id uuid not null references governance.resolutions (id) on delete restrict,
  reason text not null check (length(btrim(reason)) between 1 and 2000),
  requested_by uuid references auth.users (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  removed_at timestamptz not null default now()
);

comment on table governance.removals is
  'Members removed from membership by the Council (two-thirds), each with its resolution and the two officers who recorded it.';

create index removals_user_id_idx on governance.removals (user_id);
create index removals_resolution_id_idx on governance.removals (resolution_id);
create index removals_requested_by_idx on governance.removals (requested_by);
create index removals_approved_by_idx on governance.removals (approved_by);

alter table governance.removals enable row level security;

create policy "Officers holding governance.manage read removals" on governance.removals
  for select to authenticated
  using ((select private.has_permission('governance.manage')));
create policy "No third-party apps" on governance.removals
  as restrictive for all to authenticated
  using ((select private.client_allows('governance')))
  with check ((select private.client_allows('governance')));

grant select on governance.removals to authenticated;
grant all on governance.removals to service_role;

-- Whether a resolution can carry a removal: adopted by the Council or a
-- members' meeting, by at least two thirds of those voting.
create function private.removal_resolution_ok(resolution uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from governance.resolutions r
    where r.id = resolution and r.status = 'adopted'
      and r.votes_for > 0 and r.votes_for * 3 >= (r.votes_for + r.votes_against) * 2
  );
$$;
revoke all on function private.removal_resolution_ok(uuid) from public, anon;
grant execute on function private.removal_resolution_ok(uuid) to authenticated, service_role;

-- The first officer asks.
create function private.request_removal(member uuid, resolution uuid, reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('governance.manage') then
    raise exception 'governance.manage is required' using errcode = '42501';
  end if;
  if member is null or member = auth.uid() or not private.is_member(member) then
    raise exception 'not_a_member' using errcode = 'P0002';
  end if;
  if not private.removal_resolution_ok(resolution) then
    raise exception 'removal_needs_two_thirds' using errcode = '22023',
      hint = 'Cite the Council''s adopted resolution, carried by two thirds of those voting.';
  end if;
  if nullif(btrim(coalesce(reason, '')), '') is null then
    raise exception 'A removal needs its reason' using errcode = '22023';
  end if;
  return private.queue_action('member_removal', 'governance.manage', jsonb_build_object(
    'member', member, 'resolution', resolution, 'reason', btrim(reason)));
end;
$$;
revoke all on function private.request_removal(uuid, uuid, text) from public, anon;
grant execute on function private.request_removal(uuid, uuid, text) to authenticated;

create function governance.request_removal(member uuid, resolution uuid, reason text)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.request_removal($1, $2, $3) $$;
revoke all on function governance.request_removal(uuid, uuid, text) from public, anon;
grant execute on function governance.request_removal(uuid, uuid, text) to authenticated, service_role;

-- The removal itself, on the second officer's approval only.
create function private.remove_member(member uuid, resolution uuid, reason text, requested_by uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.second_officer() then
    raise exception 'second_officer_required' using errcode = '42501';
  end if;
  if not private.removal_resolution_ok(resolution) then
    raise exception 'removal_needs_two_thirds' using errcode = '22023';
  end if;
  update access.role_assignments
  set ends_at = now()
  where user_id = member and starts_at < now() and (ends_at is null or ends_at > now());
  delete from access.role_assignments where user_id = member and starts_at >= now();
  delete from membership.memberships where user_id = member;
  insert into governance.removals (user_id, resolution_id, reason, requested_by, approved_by)
  values (member, resolution, reason, requested_by, auth.uid());
  perform private.enqueue('membership.removed', jsonb_build_object('user_id', member));
  perform private.enqueue('wallet.refresh', jsonb_build_object('user_id', member));
end;
$$;
revoke all on function private.remove_member(uuid, uuid, text, uuid) from public, anon, authenticated;

-- decide_action learns the new kind.
do $$
declare
  def text;
  anchor text := E'    elsif a.kind = ''legal_name'' then';
begin
  def := pg_get_functiondef('private.decide_action'::regproc);
  if position(anchor in def) = 0 then
    raise exception 'Unexpected body in private.decide_action';
  end if;
  def := replace(def, anchor,
    E'    elsif a.kind = ''member_removal'' then\n'
    || E'      perform private.remove_member((p ->> ''member'')::uuid, (p ->> ''resolution'')::uuid,\n'
    || E'        p ->> ''reason'', a.requested_by);\n'
    || anchor);
  execute def;
end
$$;
