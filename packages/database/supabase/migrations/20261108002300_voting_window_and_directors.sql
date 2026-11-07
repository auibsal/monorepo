-- Decisions §2 and §4, as settled Nov 7: a voting member has attended at
-- least two events or general meetings in the 12 months before the voter
-- list's record date (the list is drawn on that date, so the window ends
-- now); and directors serve no first term (the Executive Board approves
-- them at appointment, after Student Life confirms eligibility), like the
-- elected seats. Only team members serve a first term.

create or replace function private.activity_count(uid uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(distinct coalesce(r.event_id::text, r.id::text))::integer
  from membership.activity_records r
  where r.user_id = uid
    and r.occurred_at > now() - interval '12 months'
    and r.occurred_at <= now();
$$;

create or replace function private.elected_seat(role text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from access.roles r where r.key = elected_seat.role and r.is_council
  ) or elected_seat.role in ('acting_president');
$$;
comment on function private.elected_seat(text) is
  'The Council''s seats (the Executive Board and the six directors) serve no first term (decisions §2): they are confirmed when assigned.';

-- Directors appointed before this are confirmed now.
update access.role_assignments a
set confirmed_at = coalesce(a.confirmed_at, a.created_at), confirmed_by = coalesce(a.confirmed_by, a.assigned_by)
where a.confirmed_at is null and private.elected_seat(a.role);
