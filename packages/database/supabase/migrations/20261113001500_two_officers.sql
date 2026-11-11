-- Two officers approve (decisions.md, Documents and forms): granting a
-- Council role, changing a legal name and exporting a list for Student Life
-- wait until a second officer approves: for a Council role, which only the
-- President assigns, one holding governance.manage (the Vice President or
-- the Secretary); otherwise one holding the same permission. The first
-- officer's request and the second's decision are both kept.
-- Removing a member needs the same once the site has that action (it has
-- none today: a member leaves, or the Council acts in Notion's minutes).

create table governance.pending_actions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('council_role', 'legal_name', 'student_life_export')),
  permission text not null,
  payload jsonb not null default '{}',
  requested_by uuid not null references auth.users (id) on delete cascade default auth.uid(),
  requested_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'used')),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  check ((status = 'pending') = (decided_at is null) or status = 'used')
);

comment on table governance.pending_actions is
  'Actions that take two officers (decisions.md): the request, then another officer''s approval or refusal; read by those holding the permission.';

create index pending_actions_requested_by_idx on governance.pending_actions (requested_by);
create index pending_actions_decided_by_idx on governance.pending_actions (decided_by);
create index pending_actions_pending_idx on governance.pending_actions (requested_at) where status = 'pending';

alter table governance.pending_actions enable row level security;

create policy "Officers holding the permission read pending actions" on governance.pending_actions
  for select to authenticated
  using ((select private.has_permission(permission)) or requested_by = (select auth.uid()));
create policy "No third-party apps" on governance.pending_actions
  as restrictive for all to authenticated
  using ((select private.client_allows('governance')))
  with check ((select private.client_allows('governance')));

grant select on governance.pending_actions to authenticated;
grant all on governance.pending_actions to service_role;

create function private.second_officer()
returns boolean
language sql
stable
set search_path = ''
as $$ select coalesce(current_setting('sal.second_officer', true), '') = 'on' $$;

create function private.queue_action(kind text, permission text, payload jsonb)
returns uuid
language sql
security definer
set search_path = ''
as $$
  insert into governance.pending_actions (kind, permission, payload)
  values (queue_action.kind, queue_action.permission, queue_action.payload)
  returning id;
$$;

revoke all on function private.second_officer(), private.queue_action(text, text, jsonb)
  from public, anon, authenticated;
grant execute on function private.second_officer() to authenticated, service_role;

create or replace function private.assign_role(target_user uuid, role_key text, scope_type text DEFAULT 'global'::text, scope_id uuid DEFAULT NULL::uuid, starts_at timestamp with time zone DEFAULT now(), ends_at timestamp with time zone DEFAULT NULL::timestamp with time zone, title_en text DEFAULT NULL::text, title_ar text DEFAULT NULL::text, note text DEFAULT NULL::text, exception_resolution uuid DEFAULT NULL::uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  conflict text;
begin
  -- The second officer of a Council role (governance.manage) assigns it on
  -- approving the President's request.
  if not (access.has_permission('roles.assign') or private.second_officer()) then
    raise exception 'roles.assign is required' using errcode = '42501';
  end if;

  conflict := private.role_conflict(
    target_user, role_key, coalesce(assign_role.scope_type, 'global'), assign_role.scope_id,
    coalesce(assign_role.starts_at, now()), assign_role.ends_at, exception_resolution
  );
  if conflict is not null then
    raise exception '%', conflict using errcode = '23P01';
  end if;

  -- A Council role takes a second officer (decisions.md, Documents and
  -- forms): it waits until another officer approves it.
  if (select r.is_council from access.roles r where r.key = assign_role.role_key)
    and auth.uid() is not null and not private.second_officer() then
    perform private.queue_action('council_role', 'governance.manage', jsonb_build_object(
      'target_user', target_user, 'role_key', role_key,
      'scope_type', coalesce(assign_role.scope_type, 'global'), 'scope_id', assign_role.scope_id,
      'starts_at', coalesce(assign_role.starts_at, now()), 'ends_at', assign_role.ends_at,
      'title_en', assign_role.title_en, 'title_ar', assign_role.title_ar,
      'note', assign_role.note, 'exception_resolution', exception_resolution));
    return null;
  end if;

  insert into access.role_assignments
    (user_id, role, scope_type, scope_id, starts_at, ends_at,
     title_en, title_ar, assigned_by, note, exception_resolution_id)
  values
    (target_user, role_key, assign_role.scope_type, assign_role.scope_id,
     coalesce(assign_role.starts_at, now()), assign_role.ends_at,
     assign_role.title_en, assign_role.title_ar, (select auth.uid()),
     assign_role.note, exception_resolution)
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function private.correct_member_name(member uuid, first_en text, father_en text, grandfather_en text, last_en text, first_ar text, father_ar text, grandfather_ar text, last_ar text, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  required text[] := array[first_en, father_en, grandfather_en, first_ar, father_ar, grandfather_ar];
  part text;
  before core.profiles;
  after core.profiles;
begin
  if not private.has_permission('members.manage') then
    raise exception 'Only an officer who manages members corrects a name'
      using errcode = '42501';
  end if;
  if reason is null or char_length(btrim(reason)) < 3 then
    raise exception 'reason_required' using errcode = '22023';
  end if;
  foreach part in array required loop
    if part is null or btrim(part) = '' then
      raise exception 'name_parts_required' using errcode = '22023',
        hint = 'The given, father''s and grandfather''s names, in English and in Arabic.';
    end if;
  end loop;

  -- A legal name changes with a second officer (decisions.md, Documents
  -- and forms): it waits until another officer approves it.
  if auth.uid() is not null and not private.second_officer() then
    perform private.queue_action('legal_name', 'members.manage', jsonb_build_object(
      'member', member, 'first_en', first_en, 'father_en', father_en,
      'grandfather_en', grandfather_en, 'last_en', last_en, 'first_ar', first_ar,
      'father_ar', father_ar, 'grandfather_ar', grandfather_ar, 'last_ar', last_ar,
      'reason', reason));
    return;
  end if;

  select * into before from core.profiles where id = member for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  update core.profiles
  set first_name_en = first_en,
      father_name_en = father_en,
      grandfather_name_en = grandfather_en,
      last_name_en = last_en,
      first_name_ar = first_ar,
      father_name_ar = father_ar,
      grandfather_name_ar = grandfather_ar,
      last_name_ar = last_ar
  where id = member
  returning * into after;

  perform private.log_name_change(member, 'legal_name', btrim(left(reason, 300)), (
    select coalesce(array_agg(k order by k), '{}')
    from jsonb_each(to_jsonb(after)) as a(k, v)
    where k like '%\_name\_%' escape '\'
      and k not like 'full\_name%' escape '\'
      and k not like 'preferred\_name%' escape '\'
      and k not like 'signup\_name%' escape '\'
      and (to_jsonb(before) -> k) is distinct from v
  ));
end;
$$;

-- The second officer approves or declines; never the one who asked.
create function private.decide_action(action_id uuid, approve boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  a governance.pending_actions;
  p jsonb;
begin
  select * into a from governance.pending_actions where id = decide_action.action_id for update;
  if not found or a.status <> 'pending' then
    raise exception 'not_pending' using errcode = 'P0002';
  end if;
  if not private.has_permission(a.permission) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if a.requested_by = auth.uid() then
    raise exception 'second_officer_required' using errcode = '42501';
  end if;
  p := a.payload;
  if approve then
    perform set_config('sal.second_officer', 'on', true);
    if a.kind = 'council_role' then
      perform private.assign_role(
        (p ->> 'target_user')::uuid, p ->> 'role_key', p ->> 'scope_type',
        (p ->> 'scope_id')::uuid, (p ->> 'starts_at')::timestamptz,
        (p ->> 'ends_at')::timestamptz, p ->> 'title_en', p ->> 'title_ar',
        p ->> 'note', (p ->> 'exception_resolution')::uuid);
    elsif a.kind = 'legal_name' then
      perform private.correct_member_name(
        (p ->> 'member')::uuid, p ->> 'first_en', p ->> 'father_en',
        p ->> 'grandfather_en', p ->> 'last_en', p ->> 'first_ar',
        p ->> 'father_ar', p ->> 'grandfather_ar', p ->> 'last_ar', p ->> 'reason');
    end if;
    perform set_config('sal.second_officer', 'off', true);
  end if;
  update governance.pending_actions
  set status = case when approve then 'approved' else 'declined' end,
      decided_by = auth.uid(), decided_at = now()
  where id = a.id;
  return case when approve then 'approved' else 'declined' end;
end;
$$;

revoke all on function private.decide_action(uuid, boolean) from public, anon;
grant execute on function private.decide_action(uuid, boolean) to authenticated, service_role;

create function governance.decide_action(action_id uuid, approve boolean)
returns text
language sql
set search_path = ''
as $$ select private.decide_action(action_id, approve) $$;

revoke all on function governance.decide_action(uuid, boolean) from public, anon;
grant execute on function governance.decide_action(uuid, boolean) to authenticated, service_role;

-- Exporting a list for Student Life: asked for, approved by a second
-- officer, then downloaded once by whoever asked, within a day.
create function private.request_export(name text, params jsonb default '{}')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  permission text := case request_export.name
    when 'student-life-candidates' then 'elections.manage'
    when 'student-life-council' then 'governance.manage'
  end;
begin
  if permission is null then
    raise exception 'unknown_export' using errcode = '22023';
  end if;
  if not private.has_permission(permission) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return private.queue_action('student_life_export', permission,
    jsonb_build_object('name', request_export.name, 'params', coalesce(request_export.params, '{}')));
end;
$$;

revoke all on function private.request_export(text, jsonb) from public, anon;
grant execute on function private.request_export(text, jsonb) to authenticated, service_role;

create function governance.request_export(name text, params jsonb default '{}')
returns uuid
language sql
set search_path = ''
as $$ select private.request_export(name, params) $$;

revoke all on function governance.request_export(text, jsonb) from public, anon;
grant execute on function governance.request_export(text, jsonb) to authenticated, service_role;

-- The export route spends the approval: once, by whoever asked, within a day.
create function private.spend_export(name text, params jsonb, who uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with spent as (
    update governance.pending_actions a set status = 'used'
    where a.id = (
      select x.id from governance.pending_actions x
      where x.kind = 'student_life_export' and x.status = 'approved'
        and x.requested_by = spend_export.who
        and x.payload ->> 'name' = spend_export.name
        and x.payload -> 'params' = coalesce(spend_export.params, '{}')
        and x.decided_at > now() - interval '1 day'
      order by x.decided_at desc
      limit 1
    )
    returning 1
  )
  select exists (select 1 from spent);
$$;

revoke all on function private.spend_export(text, jsonb, uuid) from public, anon, authenticated;
grant execute on function private.spend_export(text, jsonb, uuid) to service_role;

-- The export route (service role) spends it through the exposed schema.
create function governance.spend_export(name text, params jsonb, who uuid)
returns boolean
language sql
set search_path = ''
as $$ select private.spend_export(name, params, who) $$;

revoke all on function governance.spend_export(text, jsonb, uuid) from public, anon, authenticated;
grant execute on function governance.spend_export(text, jsonb, uuid) to service_role;
