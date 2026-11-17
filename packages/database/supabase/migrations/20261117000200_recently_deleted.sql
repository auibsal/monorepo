-- Recently deleted (decisions.md, The site: receipts and undo). Deleting an event
-- or a partner moves it to its area's "Recently deleted" for 30 days,
-- where whoever may delete it can restore it; the retention job then
-- removes it for good. A deleted record is hidden from every read
-- (a restrictive policy), so the site, the Diwan and the API skip it
-- without each query asking. Deleting is refused while the record is
-- public (unpublish or unlist first) or in use (a partner on an event or
-- with a memorandum), and the refusal names the uses.

alter table events.events
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users (id) on delete set null;
alter table governance.partners
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users (id) on delete set null;

create index events_deleted_by_idx on events.events (deleted_by);
create index events_deleted_at_idx on events.events (deleted_at) where deleted_at is not null;
create index partners_deleted_by_idx on governance.partners (deleted_by);
create index partners_deleted_at_idx on governance.partners (deleted_at) where deleted_at is not null;

-- A client can't move a record in or out itself: the read policy below
-- refuses an update whose new row is deleted (and hides deleted rows),
-- so only the functions, which check what stops a delete, do it.
create policy "Not in Recently deleted" on events.events
  as restrictive for select to anon, authenticated
  using (deleted_at is null);
create policy "Not in Recently deleted" on governance.partners
  as restrictive for select to anon, authenticated
  using (deleted_at is null);

-- Who may delete (and restore) the record: the event's leads with
-- events.manage, or Partnerships.
create function private.may_delete(kind text, record_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if kind = 'event' then
    return exists (
      select 1 from events.events e
      where e.id = record_id
        and private.leads_event('events.manage', e.id, e.program_id)
    );
  elsif kind = 'partner' then
    return private.has_permission('partners.manage');
  end if;
  return false;
end;
$$;
revoke all on function private.may_delete(text, uuid) from public, anon;

-- What the confirmation names: the record, what stops the delete, and
-- where it is used.
create function private.record_uses(kind text, record_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not private.may_delete(kind, record_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if kind = 'event' then
    select jsonb_build_object(
      'title_en', e.title_en, 'title_ar', e.title_ar,
      'blocked', case when e.status <> 'draft' then 'unpublish_first' end,
      'uses', '[]'::jsonb)
    into result
    from events.events e where e.id = record_id and e.deleted_at is null;
  elsif kind = 'partner' then
    select jsonb_build_object(
      'title_en', p.name_en, 'title_ar', p.name_ar,
      'blocked', case
        when p.is_listed then 'unlist_first'
        when exists (select 1 from events.event_organizations o
                     join events.events e on e.id = o.event_id
                     where o.partner_id = p.id and e.deleted_at is null)
          or exists (select 1 from governance.partner_agreements a
                     where a.partner_id = p.id)
          then 'in_use'
      end,
      'uses', coalesce((
        select jsonb_agg(u order by u->>'title_en')
        from (
          select jsonb_build_object('kind', 'event',
            'title_en', e.title_en, 'title_ar', e.title_ar) u
          from events.event_organizations o
          join events.events e on e.id = o.event_id
          where o.partner_id = p.id and e.deleted_at is null
          union all
          select jsonb_build_object('kind', 'memorandum',
            'title_en', coalesce(a.code, 'Memorandum'),
            'title_ar', coalesce(a.code, 'مذكرة تفاهم'))
          from governance.partner_agreements a
          where a.partner_id = p.id
        ) s
      ), '[]'::jsonb))
    into result
    from governance.partners p where p.id = record_id and p.deleted_at is null;
  end if;
  if result is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  return result;
end;
$$;
revoke all on function private.record_uses(text, uuid) from public, anon;

create function private.trash_record(kind text, record_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uses jsonb := private.record_uses(kind, record_id);
begin
  if uses->>'blocked' is not null then
    raise exception '%', uses->>'blocked' using errcode = '23514';
  end if;
  if kind = 'event' then
    update events.events set deleted_at = now(), deleted_by = auth.uid()
    where id = record_id;
  else
    update governance.partners set deleted_at = now(), deleted_by = auth.uid()
    where id = record_id;
  end if;
end;
$$;
revoke all on function private.trash_record(text, uuid) from public, anon;

create function private.restore_record(kind text, record_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.may_delete(kind, record_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if kind = 'event' then
    update events.events set deleted_at = null, deleted_by = null
    where id = record_id and deleted_at is not null;
  else
    update governance.partners set deleted_at = null, deleted_by = null
    where id = record_id and deleted_at is not null;
  end if;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function private.restore_record(text, uuid) from public, anon;

-- An area's Recently deleted: what the caller may restore, newest first,
-- with the day each is removed for good.
create function private.recently_deleted(kind text)
returns table (id uuid, title_en text, title_ar text, deleted_at timestamptz, purges_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.title_en, e.title_ar, e.deleted_at, e.deleted_at + interval '30 days'
  from events.events e
  where kind = 'event' and e.deleted_at is not null
    and private.leads_event('events.manage', e.id, e.program_id)
  union all
  select p.id, p.name_en, p.name_ar, p.deleted_at, p.deleted_at + interval '30 days'
  from governance.partners p
  where kind = 'partner' and p.deleted_at is not null
    and private.has_permission('partners.manage')
  order by 4 desc;
$$;
revoke all on function private.recently_deleted(text) from public, anon;

-- The retention job: 30 days after deletion, gone for good.
create function private.purge_recently_deleted()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  a integer;
  b integer;
begin
  delete from events.events where deleted_at < now() - interval '30 days';
  get diagnostics a = row_count;
  delete from governance.partners where deleted_at < now() - interval '30 days';
  get diagnostics b = row_count;
  return a + b;
end;
$$;
revoke all on function private.purge_recently_deleted() from public, anon, authenticated;
grant execute on function private.purge_recently_deleted() to service_role;

grant execute on function private.may_delete(text, uuid),
  private.record_uses(text, uuid), private.trash_record(text, uuid),
  private.restore_record(text, uuid), private.recently_deleted(text)
  to authenticated;

-- The names the Diwan calls.
create function core.record_uses(kind text, record_id uuid)
returns jsonb language sql stable security invoker set search_path = ''
as $$ select private.record_uses(kind, record_id) $$;
create function core.trash_record(kind text, record_id uuid)
returns void language sql security invoker set search_path = ''
as $$ select private.trash_record(kind, record_id) $$;
create function core.restore_record(kind text, record_id uuid)
returns void language sql security invoker set search_path = ''
as $$ select private.restore_record(kind, record_id) $$;
create function core.recently_deleted(kind text)
returns table (id uuid, title_en text, title_ar text, deleted_at timestamptz, purges_at timestamptz)
language sql stable security invoker set search_path = ''
as $$ select * from private.recently_deleted(kind) $$;
revoke all on function core.record_uses(text, uuid), core.trash_record(text, uuid),
  core.restore_record(text, uuid), core.recently_deleted(text) from public, anon;
grant execute on function core.record_uses(text, uuid), core.trash_record(text, uuid),
  core.restore_record(text, uuid), core.recently_deleted(text) to authenticated;

create or replace function private.retention_schedule()
 RETURNS TABLE(rule text, keeps text, runs text)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  values
    ('Unpublished Write for Qirtas submissions and their files', '12 months after the decision', null),
    ('Write for Qirtas drafts', '12 months after the last change', 'private.purge_stale_drafts'),
    ('Blind copies, assignments, scores and decisions of deleted submissions', '12 months', 'private.purge_blind_entries'),
    ('Invitation lists', '30 days after the list is sent', 'private.purge_tour_lists'),
    ('Unclaimed spring 2026 Tour pages', 'until the spring 2027 Tour (tour.unclaimed_until)', 'private.purge_unclaimed_tour_pages'),
    ('Associate membership requests', '1 year after the decision', 'private.purge_associate_requests'),
    ('Qalam consent forms (F-38, F-39) and the roster with attendance', '3 years after the program year', 'private.purge_qalam_records'),
    ('Incident records', '2 years after the case closes (Qalam''s: 7 years)', 'private.purge_incident_records'),
    ('Ballots, ballot receipts and voter lists', '1 year after the vote closes', 'private.purge_expired_ballots'),
    ('Who voted for the Prize', '1 year after the vote closes', 'private.purge_prize_vote_receipts'),
    ('Get involved replies', '12 months after the last change', 'private.purge_opening_replies'),
    ('Removal requests', '2 years after closing', 'private.purge_removal_requests'),
    ('Unconfirmed Sunday Paper sign-ups', 'until the confirmation window closes', 'private.purge_unconfirmed_subscribers'),
    ('Sign-ups never confirmed', '7 days', 'private.purge_unconfirmed_sign_ups'),
    ('Unconfirmed personal email requests', '7 days', 'private.purge_personal_email_requests'),
    ('Codes for a new AUIB address or a merge', '1 day', 'private.purge_address_codes'),
    ('Requests to merge two accounts', '1 year after the decision', 'private.purge_merge_requests'),
    ('Calendar feed addresses', '12 months without a sign-in', 'private.purge_idle_devices'),
    ('Guest accounts', '2 years without a sign-in, holding no role', null),
    ('Accounts their owners deleted', '30 days after the request, unless they sign in again', null),
    ('The activity log', '12 months', 'private.purge_activity_log'),
    ('Sent emails in the outbox', '30 days after sending', 'private.prune_outbox'),
    ('Problem reports', '1 year', 'private.purge_problem_reports'),
    ('Trip emergency contacts and health notes (F-45)', '7 days after the trip', 'private.purge_trip_contacts'),
    ('Recently deleted events and partners', '30 days after deletion', 'private.purge_recently_deleted');
$function$;

select private.build_api();
