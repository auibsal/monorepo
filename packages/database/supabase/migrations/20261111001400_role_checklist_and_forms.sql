-- The forms register (decisions.md, Forms): 42 active forms, F-01 to F-46,
-- with F-08, F-22, F-31 and F-44 retired and never reused. F-04 is the
-- new role holder's checklist, run by the site in Your account from the
-- day the role is given: what the site can see it marks itself, and the
-- rest is ticked by the person it belongs to.

-- ── Retired numbers ─────────────────────────────────────────────────────────

update governance.form_types
set submit_rule = 'retired', filled = 'removed', title_en = 'Removed', title_ar = 'محذوف'
where key in ('f08', 'f31');

-- ── F-04, the new role holder's checklist ───────────────────────────────────

update governance.form_types
set title_en = 'New role holder’s checklist',
    title_ar = 'قائمة صاحب الدور الجديد',
    filled = 'page',
    submit_rule = 'role_holder'
where key = 'f04';

-- The steps a person ticks: the pages they opened, the handover walked
-- through, a seat's mailbox received; and the Notion invitation, which the
-- General Secretary ticks.
create table access.role_checklist (
  assignment_id uuid not null references access.role_assignments (id) on delete cascade,
  step text not null check (step in ('pages', 'handover', 'mailbox', 'notion')),
  done_at timestamptz not null default now(),
  done_by uuid references auth.users (id) on delete set null default auth.uid(),
  primary key (assignment_id, step)
);

create index role_checklist_done_by_idx on access.role_checklist (done_by);

comment on table access.role_checklist is
  'F-04, the new role holder''s checklist: the steps ticked by hand (the rest the site sees for itself, access.my_role_checklist()).';

alter table access.role_checklist enable row level security;

create policy "No third-party apps" on access.role_checklist
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('access')))
  with check ((select private.client_allows('access')));

create policy "The role holder reads their checklist" on access.role_checklist
  for select to authenticated
  using (
    exists (
      select 1 from access.role_assignments a
      where a.id = role_checklist.assignment_id and a.user_id = (select auth.uid())
    )
  );

revoke all on access.role_checklist from anon, authenticated;
grant select on access.role_checklist to authenticated;
grant all on access.role_checklist to service_role;

-- The caller's checklists: one per role given in the last 120 days and
-- still held, each step with whether it is done.
create function private.my_role_checklist()
returns table (
  assignment_id uuid,
  role text,
  role_en text,
  role_ar text,
  seat boolean,
  starts_at timestamptz,
  step text,
  done boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select a.id, a.role, a.starts_at, r.name_en, r.name_ar, r.is_council,
      exists (
        select 1 from access.role_permissions rp
        where rp.role = a.role and rp.permission like 'journal.%'
      ) as qirtas
    from access.role_assignments a
    join access.roles r on r.key = a.role
    where a.user_id = (select auth.uid())
      and a.starts_at <= now()
      and a.starts_at > now() - interval '120 days'
      and (a.ends_at is null or a.ends_at > now())
  ),
  steps as (
    select m.*, s.step, s.ord
    from mine m
    cross join lateral (values
      ('email', 1), ('pledge', 2), ('declaration', 3), ('two_step', 4),
      ('diwan_group', 5), ('pages', 6), ('handover', 7), ('mailbox', 8), ('notion', 9)
    ) as s (step, ord)
    where m.is_council or s.step not in ('mailbox', 'notion')
  )
  select s.id, s.role, s.name_en, s.name_ar, s.is_council, s.starts_at, s.step,
    case s.step
      -- The role email goes out when the role is given.
      when 'email' then true
      -- The Code of Conduct, and for Qirtas the readers' pledge (F-40).
      when 'pledge' then
        exists (
          select 1 from membership.pledges p
          where p.user_id = (select auth.uid()) and p.pledge_type = 'member'
        )
        and (not s.qirtas or private.has_reader_pledge())
      when 'declaration' then
        exists (
          select 1 from governance.form_submissions f
          where f.form_key = 'f06' and f.submitted_by = (select auth.uid())
            and f.status <> 'draft'
        )
      when 'two_step' then
        exists (
          select 1 from auth.mfa_factors f
          where f.user_id = (select auth.uid()) and f.status = 'verified'
        )
      when 'diwan_group' then
        exists (
          select 1
          from core.telegram_accounts t
          join core.telegram_members tm on tm.telegram_id = t.telegram_id
          join core.telegram_groups g on g.chat_id = tm.chat_id
          where t.user_id = (select auth.uid()) and g.audience = 'staff'
            and tm.removed_at is null
        )
      else exists (
        select 1 from access.role_checklist c
        where c.assignment_id = s.id and c.step = s.step
      )
    end
  from steps s
  order by s.starts_at desc, s.id, s.ord;
$$;

create function access.my_role_checklist()
returns table (
  assignment_id uuid,
  role text,
  role_en text,
  role_ar text,
  seat boolean,
  starts_at timestamptz,
  step text,
  done boolean
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_role_checklist() $$;

comment on function access.my_role_checklist() is
  'F-04: the caller''s checklist for each role given in the last 120 days, step by step, with what is done.';

-- Ticks a step: the role holder their own pages, handover, mailbox and
-- Notion invitation; the General Secretary may also record the invitation.
create function private.tick_role_step(assignment_id uuid, step text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  holder uuid;
begin
  select a.user_id into holder from access.role_assignments a where a.id = tick_role_step.assignment_id;
  if holder is null then
    raise exception 'Role not found' using errcode = 'P0002';
  end if;
  if tick_role_step.step = 'notion' then
    -- The General Secretary sends it; the holder or the General Secretary
    -- records that it arrived.
    if not (holder = (select auth.uid()) or access.has_permission('governance.manage')) then
      raise exception 'The holder or the General Secretary records the Notion invitation' using errcode = '42501';
    end if;
  elsif tick_role_step.step in ('pages', 'handover', 'mailbox') then
    if holder <> (select auth.uid()) then
      raise exception 'Only the role holder ticks this step' using errcode = '42501';
    end if;
  else
    raise exception 'The site marks this step itself' using errcode = '22023';
  end if;
  insert into access.role_checklist (assignment_id, step)
  values (tick_role_step.assignment_id, tick_role_step.step)
  on conflict do nothing;
  return true;
end;
$$;

create function access.tick_role_step(assignment_id uuid, step text)
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.tick_role_step(assignment_id, step) $$;

comment on function access.tick_role_step(uuid, text) is
  'F-04: ticks a step done by hand (pages, handover, mailbox and notion by the role holder; notion also by governance.manage).';

revoke all on function private.my_role_checklist() from public, anon;
revoke all on function access.my_role_checklist() from public, anon;
revoke all on function private.tick_role_step(uuid, text) from public, anon;
revoke all on function access.tick_role_step(uuid, text) from public, anon;
grant execute on function private.my_role_checklist() to authenticated, service_role;
grant execute on function access.my_role_checklist() to authenticated;
grant execute on function private.tick_role_step(uuid, text) to authenticated, service_role;
grant execute on function access.tick_role_step(uuid, text) to authenticated;
