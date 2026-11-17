-- A role holder's first steps, each checked against the thing itself
-- (decisions.md, Members: "A new role holder"; Where things live: "checked
-- against the thing itself"):
--
-- - The role agreement step is the role agreement only. The
--   confidentiality agreement is its own step, asked only of a role that
--   reads submissions: one holding journal.review, the permission that
--   opens blind reading (never any journal.% permission).
-- - "Join the Diwan group" reads the person's membership of the staff
--   group, as Telegram reports it (core.telegram_memberships): confirmed
--   when Today asks Telegram, on each approval and on every chat_member
--   update, and cleared when they leave or are removed.
-- - "Open your role's manual and Brand essentials" become two steps, each
--   recorded by its document's page as it loads.

-- ── The membership record ─────────────────────────────────────────────
create table core.telegram_memberships (
  chat_id bigint not null references core.telegram_groups (chat_id) on delete cascade,
  telegram_id bigint not null check (telegram_id > 0),
  -- Telegram's own words: a restricted person is still in the group.
  status text not null check (status in ('creator', 'administrator', 'member', 'restricted')),
  checked_at timestamptz not null default now(),
  primary key (chat_id, telegram_id)
);
create index telegram_memberships_telegram_id_idx on core.telegram_memberships (telegram_id);
alter table core.telegram_memberships enable row level security;
create policy "No third-party apps" on core.telegram_memberships
  as restrictive for all to authenticated
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));
-- Written only by the API routes (Hudhud and Today's check); read by the
-- checklist through its own function.
revoke all on core.telegram_memberships from anon, authenticated;
grant select, insert, update, delete on core.telegram_memberships to service_role;

-- ── Two steps where there was one ─────────────────────────────────────
alter table access.role_checklist drop constraint role_checklist_step_check;
alter table access.role_checklist add constraint role_checklist_step_check
  check (step in ('pages', 'manual', 'brand', 'handover', 'mailbox', 'notion'));

-- The seat's manual for each role (decisions.md, Documents and forms: the
-- documents and their keepers): its 01 manual, or the handbook a team works
-- from.
create function private.role_manual(role text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when role in ('events_director', 'program_lead') then 'SAL-EVT-01'
    when role in ('membership_director', 'alumni_lead', 'tour_lead') then 'SAL-MEM-01'
    when role in ('partnerships_director', 'club_relations_lead') then 'SAL-PTN-01'
    when role in ('next_stop_host', 'next_stop_producer', 'next_stop_crew') then 'SAL-MED-03'
    when role in ('media_director', 'communications_lead', 'design_lead',
                  'photo_video_lead', 'web_lead') then 'SAL-MED-01'
    when role = 'artistic_director' then 'SAL-ART-01'
    when role in ('actor', 'assistant_director', 'assistant_stage_manager',
                  'costume_designer', 'dramaturg', 'front_of_house_manager',
                  'lighting_designer', 'narrator', 'production_crew',
                  'production_director', 'production_producer', 'set_designer',
                  'sound_designer', 'stage_manager', 'understudy') then 'SAL-ART-02'
    when role in ('qalam_lead', 'qalam_mentor') then 'SAL-EDT-03'
    when role = 'eic' or role like '%editor' or role in ('reader', 'reporter',
                  'photographer', 'illustrator') then 'SAL-EDT-02'
    else 'SAL-EXB-01'
  end
$$;

create or replace function private.my_role_checklist()
returns table (assignment_id uuid, role text, role_en text, role_ar text, seat boolean,
  starts_at timestamptz, step text, done boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select a.id, a.role, a.starts_at, r.name_en, r.name_ar, r.is_council,
      exists (
        select 1 from access.role_permissions rp
        where rp.role = a.role and rp.permission = 'journal.review'
      ) as reads
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
      ('email', 1), ('pledge', 2), ('confidentiality', 3), ('declaration', 4),
      ('two_step', 5), ('diwan_group', 6), ('manual', 7), ('brand', 8),
      ('handover', 9), ('mailbox', 10), ('notion', 11)
    ) as s (step, ord)
    where (m.is_council or s.step not in ('mailbox', 'notion'))
      and (m.reads or s.step <> 'confidentiality')
  )
  select s.id, s.role, s.name_en, s.name_ar, s.is_council, s.starts_at, s.step,
    case s.step
      -- The role email goes out when the role is given.
      when 'email' then true
      -- The role agreement, and only it.
      when 'pledge' then exists (
        select 1 from access.role_agreements g where g.assignment_id = s.id
      )
      when 'confidentiality' then private.has_reader_pledge()
      when 'declaration' then exists (
        select 1 from governance.form_submissions f
        where f.form_key = 'conflict-of-interest-declaration'
          and f.submitted_by = (select auth.uid())
          and f.status <> 'draft'
      )
      when 'two_step' then exists (
        select 1 from auth.mfa_factors f
        where f.user_id = (select auth.uid()) and f.status = 'verified'
      )
      when 'diwan_group' then exists (
        select 1
        from core.telegram_accounts t
        join core.telegram_memberships m on m.telegram_id = t.telegram_id
        join core.telegram_groups g on g.chat_id = m.chat_id
        where t.user_id = (select auth.uid()) and g.audience = 'staff'
      )
      -- The one step these were before still counts for both.
      when 'manual' then exists (
        select 1 from access.role_checklist c
        where c.assignment_id = s.id and c.step in ('manual', 'pages')
      )
      when 'brand' then exists (
        select 1 from access.role_checklist c
        where c.assignment_id = s.id and c.step in ('brand', 'pages')
      )
      else exists (
        select 1 from access.role_checklist c
        where c.assignment_id = s.id and c.step = s.step
      )
    end
  from steps s
  order by s.starts_at desc, s.id, s.ord;
$$;

-- Only what the site can't see is ticked by the holder; the manual and
-- Brand essentials are recorded by their pages.
create or replace function private.tick_role_step(assignment_id uuid, step text)
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
    -- The Secretary sends it; the holder or the Secretary records that it
    -- arrived.
    if not (holder = (select auth.uid()) or access.has_permission('governance.manage')) then
      raise exception 'The holder or the Secretary records the Notion invitation' using errcode = '42501';
    end if;
  elsif tick_role_step.step in ('handover', 'mailbox') then
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

-- The seat's manual, for one of the caller's roles, recorded as opened
-- when it is found (the page calls this as it loads).
create function private.open_role_manual(assignment_id uuid)
returns table (code text, slug text, title_en text, title_ar text, body_en text, body_ar text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text;
begin
  select private.role_manual(a.role) into wanted
  from access.role_assignments a
  where a.id = open_role_manual.assignment_id and a.user_id = (select auth.uid());
  if wanted is null then
    raise exception 'Role not found' using errcode = 'P0002';
  end if;
  return query
    select d.code, d.slug, d.title_en, d.title_ar, d.body_en, d.body_ar
    from governance.society_documents d
    where d.code = wanted
    order by d.updated_at desc
    limit 1;
  if found then
    insert into access.role_checklist (assignment_id, step)
    values (open_role_manual.assignment_id, 'manual')
    on conflict do nothing;
  end if;
end;
$$;

-- Brand essentials opened: recorded for each of the caller's current roles.
create function private.record_brand_opened()
returns void
language sql
security definer
set search_path = ''
as $$
  insert into access.role_checklist (assignment_id, step)
  select a.id, 'brand'
  from access.role_assignments a
  where a.user_id = (select auth.uid())
    and a.starts_at <= now()
    and (a.ends_at is null or a.ends_at > now())
  on conflict do nothing;
$$;

revoke all on function private.role_manual(text), private.open_role_manual(uuid),
  private.record_brand_opened() from public, anon;
grant execute on function private.role_manual(text), private.open_role_manual(uuid),
  private.record_brand_opened() to authenticated;

create function core.open_role_manual(assignment_id uuid)
returns table (code text, slug text, title_en text, title_ar text, body_en text, body_ar text)
language sql
security invoker
set search_path = ''
as $$ select * from private.open_role_manual(assignment_id) $$;
create function core.record_brand_opened()
returns void
language sql
security invoker
set search_path = ''
as $$ select private.record_brand_opened() $$;
revoke all on function core.open_role_manual(uuid), core.record_brand_opened() from public, anon;
grant execute on function core.open_role_manual(uuid), core.record_brand_opened() to authenticated;

select private.build_api();
