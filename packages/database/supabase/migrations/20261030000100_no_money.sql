-- No money (owner, Oct 30, 2026). The Society holds no budget, no account
-- and no money, and has no Treasurer: Student Life provides what the
-- programs need. So the spending approvals, the spending limits, the
-- Treasurer, the Expense Claim (F-13) and every cost and price on a
-- campaign go. Programs list what they need instead (programmes.needs:
-- item, quantity, date needed, purpose); the General Secretary sends every
-- request to Student Life and logs what was asked, what was provided and
-- when.
--
-- The one exception is Second Chapter's collection, which is kept as it
-- was: counted by two people at the close of each day and recorded in the
-- charity ledger, sealed, handed over to the charity partner with a
-- witness and a receipt, and reported in the impact report. The Second
-- Chapter Lead owns it (campaign_lead, scoped to the campaign); the
-- General Secretary witnesses the counts, signs off the ledger and keeps
-- the record.

-- ── Spending approvals ──────────────────────────────────────────────────────

drop function governance.request_spending(text, bigint, uuid, uuid, uuid, text);
drop function governance.approve_spending(uuid);
drop function governance.reject_spending(uuid, text);
drop function private.request_spending(text, bigint, uuid, uuid, uuid, text);
drop function private.approve_spending(uuid);
drop function private.reject_spending(uuid, text);
drop table governance.spending_approvals;
drop function private.my_spending_limit();

alter table access.roles drop column spending_limit_iqd;

-- ── The Treasurer ───────────────────────────────────────────────────────────

-- No election has been held for the office; its positions go with it.
delete from governance.positions where role_key = 'treasurer';
delete from access.role_assignments where role = 'treasurer';
delete from access.roles where key in ('treasurer');

-- The Expense Claim and its submissions.
delete from governance.form_submissions where form_key = 'f13';
delete from governance.form_types where key = 'f13';

-- The cash count sheet is the collection's daily count: the General
-- Secretary, who witnesses the counts, handles it.
update governance.form_types set handle_permission = 'charity.ledger.signoff'
where key = 'f14';

delete from access.permissions where key in ('spending.request', 'spending.countersign');

-- The General Secretary witnesses the counts, signs off the ledger and
-- keeps the record.
insert into access.role_permissions (role, permission) values
  ('general_secretary', 'charity.manage'),
  ('general_secretary', 'charity.ledger.signoff');

-- ── Campaigns: no costs, a witnessed handover ───────────────────────────────

drop function charity.campaign_progress(uuid);
drop function private.campaign_progress(uuid);

alter table charity.campaigns
  drop column cost_per_unit_iqd,
  drop column unit_label_en,
  drop column unit_label_ar,
  drop column target_units,
  drop column price_list;

delete from core.settings where key = 'charity.cost_per_winter_set_iqd';

-- The handover: on what day, how much, who witnessed it and the receipt.
alter table charity.campaigns
  add column handed_over_on date,
  add column handed_over_iqd bigint check (handed_over_iqd >= 0),
  add column handover_witness uuid references auth.users (id) on delete set null,
  add column handover_receipt_id uuid references charity.receipts (id) on delete set null,
  add column handover_note text check (char_length(handover_note) <= 1000);

alter table charity.campaigns add constraint campaigns_handover_whole check (
  (handed_over_on is null) = (handed_over_iqd is null)
);

comment on column charity.campaigns.handed_over_on is
  'The day the sealed collection was handed over to the charity partner, with a witness and a receipt.';

create index campaigns_handover_witness_idx on charity.campaigns (handover_witness);
create index campaigns_handover_receipt_id_idx on charity.campaigns (handover_receipt_id);

-- What was counted (signed off) and what waits for a sign-off.
create function private.campaign_progress(campaign_id uuid default null)
returns table (campaign_id uuid, counted_iqd bigint, pending_iqd bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    coalesce(sum(e.amount_iqd) filter (where s.entry_id is not null), 0)::bigint,
    coalesce(sum(e.amount_iqd) filter (where s.entry_id is null), 0)::bigint
  from charity.campaigns c
  left join charity.ledger_entries e on e.campaign_id = c.id
  left join charity.ledger_signoffs s on s.entry_id = e.id
  where (campaign_progress.campaign_id is null or c.id = campaign_progress.campaign_id)
    and (c.status <> 'draft' or access.has_permission('charity.manage', 'campaign', c.id))
  group by c.id;
$$;

revoke all on function private.campaign_progress(uuid) from public;
grant execute on function private.campaign_progress(uuid) to anon, authenticated, service_role;

create function charity.campaign_progress(campaign_id uuid default null)
returns table (campaign_id uuid, counted_iqd bigint, pending_iqd bigint)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.campaign_progress($1) $$;

revoke all on function charity.campaign_progress(uuid) from public;
grant execute on function charity.campaign_progress(uuid) to anon, authenticated, service_role;

-- The Diwan overview: campaigns without units.
create or replace function private.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb := '{}'::jsonb;
begin
  if access.has_permission('members.manage') then
    result := result || jsonb_build_object(
      'members', (
        select count(*)
        from membership.memberships m
        join core.profiles p on p.id = m.user_id
        where p.verified_at is not null
      ),
      'voting_members', (
        select count(*)
        from membership.memberships m
        join core.profiles p on p.id = m.user_id
        where p.verified_at is not null and private.is_voting_member(m.user_id)
      ),
      'verification_pending', (
        select count(*) from membership.verification_requests where status = 'pending'
      ),
      'verification_oldest_at', (
        select min(created_at) from membership.verification_requests where status = 'pending'
      )
    );
  end if;

  if access.has_permission_anywhere('events.manage') then
    result := result || jsonb_build_object(
      'upcoming_rsvps', (
        select count(*)
        from events.rsvps r
        join events.events e on e.id = r.event_id
        where r.status = 'confirmed'
          and e.starts_at > now()
          and (
            access.has_permission('events.manage')
            or access.has_permission('events.manage', 'programme', e.programme_id)
          )
      ),
      'next_event', (
        select jsonb_build_object(
          'title_en', e.title_en, 'title_ar', e.title_ar, 'starts_at', e.starts_at,
          'capacity', e.capacity, 'booked', events.confirmed_count(e.id)
        )
        from events.events e
        where e.status = 'published' and e.starts_at > now()
          and (
            access.has_permission('events.manage')
            or access.has_permission('events.manage', 'programme', e.programme_id)
          )
        order by e.starts_at
        limit 1
      )
    );
  end if;

  if access.has_permission_anywhere('journal.manage') then
    result := result || jsonb_build_object(
      'open_submissions', (
        select count(*)
        from journal.submissions s
        where s.status in ('received', 'intake_check', 'in_review', 'third_read', 'selection')
          and (
            access.has_permission('journal.manage')
            or access.has_permission('journal.manage', 'issue', private.call_issue(s.call_id))
          )
      ),
      'submissions_by_status', coalesce((
        select jsonb_object_agg(status, n)
        from (
          select s.status, count(*) as n, min(s.created_at) as oldest
          from journal.submissions s
          where s.status in ('received', 'intake_check', 'in_review', 'third_read', 'selection')
            and (
              access.has_permission('journal.manage')
              or access.has_permission('journal.manage', 'issue', private.call_issue(s.call_id))
            )
          group by s.status
        ) grouped
      ), '{}'::jsonb),
      'intake_oldest_at', (
        select min(s.created_at)
        from journal.submissions s
        where s.status in ('received', 'intake_check')
          and (
            access.has_permission('journal.manage')
            or access.has_permission('journal.manage', 'issue', private.call_issue(s.call_id))
          )
      )
    );
  end if;

  if access.has_permission_anywhere('charity.manage') then
    result := result || jsonb_build_object(
      'campaigns', coalesce((
        select jsonb_agg(jsonb_build_object(
          'campaign_id', c.id,
          'title_en', c.title_en,
          'title_ar', c.title_ar,
          'counted_iqd', p.counted_iqd,
          'pending_iqd', p.pending_iqd
        ) order by c.title_en)
        from charity.campaigns c
        cross join lateral charity.campaign_progress(c.id) p
        where c.status = 'active'
          and (
            access.has_permission('charity.manage')
            or access.has_permission('charity.manage', 'campaign', c.id)
          )
      ), '[]'::jsonb)
    );
  end if;

  return result;
end;
$$;

-- ── Needs lists ─────────────────────────────────────────────────────────────

-- What a program, or Qirtas (its own program row), needs from Student Life:
-- item, quantity, date needed and purpose; never a cost. The program's
-- managers list them (the Director of Programs gathers the six programs';
-- the Editor of Qirtas gathers the paper's); the General Secretary
-- (governance.manage) sends each request and records what was provided.
create table programmes.needs (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references core.programmes (id) on delete cascade,
  event_id uuid references events.events (id) on delete set null,
  item text not null check (char_length(item) between 1 and 200),
  quantity integer not null default 1 check (quantity between 1 and 10000),
  needed_by date not null,
  purpose text not null check (char_length(purpose) between 1 and 500),
  status text not null default 'listed'
    check (status in ('listed', 'requested', 'provided', 'partly_provided', 'not_provided')),
  requested_on date,
  provided_on date,
  provided_note text check (char_length(provided_note) <= 500),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'listed' or requested_on is not null),
  check ((status in ('provided', 'partly_provided')) = (provided_on is not null))
);

comment on table programmes.needs is
  'What a program (or Qirtas) needs from Student Life: item, quantity, date needed, purpose. No costs. The General Secretary sends the requests and logs what was provided and when.';

create index needs_programme_id_idx on programmes.needs (programme_id, needed_by);
create index needs_event_id_idx on programmes.needs (event_id);
create index needs_created_by_idx on programmes.needs (created_by);

create trigger set_updated_at before update on programmes.needs
  for each row execute function private.set_updated_at();
create trigger log_activity after insert or update or delete on programmes.needs
  for each row execute function private.log_activity();

-- Who lists a program's needs: its managers, and for Qirtas the editors
-- who run the paper.
create function private.lists_needs(programme_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_permission('programmes.manage', 'programme', lists_needs.programme_id)
    or (
      private.has_permission('journal.manage')
      and exists (select 1 from core.programmes p where p.id = lists_needs.programme_id and p.slug = 'waraq')
    );
$$;

-- Only the General Secretary moves a need past "listed".
create function private.need_status_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or private.has_permission('governance.manage') then
    return new;
  end if;
  if tg_op = 'INSERT' and new.status <> 'listed' then
    raise exception 'needs_requested_by_general_secretary' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and (
    new.status is distinct from old.status
    or new.requested_on is distinct from old.requested_on
    or new.provided_on is distinct from old.provided_on
    or new.provided_note is distinct from old.provided_note
  ) then
    raise exception 'needs_requested_by_general_secretary' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and old.status <> 'listed' then
    raise exception 'need_already_requested' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger need_status_guard before insert or update on programmes.needs
  for each row execute function private.need_status_guard();

revoke all on function private.lists_needs(uuid), private.need_status_guard() from public, anon;
grant execute on function private.lists_needs(uuid) to authenticated, service_role;

alter table programmes.needs enable row level security;

create policy "Select by authenticated" on programmes.needs
  for select to authenticated
  using ((select private.lists_needs(programme_id)) or (select private.has_permission('governance.manage')));
create policy "Program managers list needs" on programmes.needs
  for insert to authenticated
  with check ((select private.lists_needs(programme_id)) or (select private.has_permission('governance.manage')));
create policy "Program managers and the General Secretary update needs" on programmes.needs
  for update to authenticated
  using ((select private.lists_needs(programme_id)) or (select private.has_permission('governance.manage')))
  with check ((select private.lists_needs(programme_id)) or (select private.has_permission('governance.manage')));
create policy "Program managers remove needs not yet requested" on programmes.needs
  for delete to authenticated
  using (
    (status = 'listed' and (select private.lists_needs(programme_id)))
    or (select private.has_permission('governance.manage'))
  );
create policy "Third-party apps reach only their areas" on programmes.needs
  as restrictive for all to authenticated
  using ((select private.client_allows('programmes')))
  with check ((select private.client_allows('programmes')));

revoke all on programmes.needs from anon, authenticated;
grant select, insert, update, delete on programmes.needs to authenticated;
grant all on programmes.needs to service_role;

-- The Editor lists Qirtas's needs on Qirtas's own program row, which is
-- not published: editors read that row too.
drop policy "Select by authenticated" on core.programmes;
create policy "Select by authenticated" on core.programmes
  for select to authenticated
  using (
    is_active
    or (select private.has_permission('programmes.manage'))
    or (slug = 'waraq' and (select private.has_permission('journal.manage')))
  );
