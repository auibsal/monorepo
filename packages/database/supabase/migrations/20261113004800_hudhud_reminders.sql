-- Hudhud's private reminders (the owner, Nov 13, 2026): on an event's day,
-- the member's ticket in their chat; once a week, the role holder's own
-- to-dos (a handover to sign, a role agreement to sign). Both are
-- reminders in the one notices model: they go only to those who keep
-- Hudhud's reminders on, and Hudhud remembers what it sent.

create table core.telegram_nudges (
  telegram_id bigint not null check (telegram_id > 0),
  kind text not null check (kind in ('ticket', 'handover', 'role_agreement')),
  ref text not null check (char_length(ref) <= 100),
  sent_at timestamptz not null default now(),
  primary key (telegram_id, kind, ref)
);

comment on table core.telegram_nudges is
  'The private reminders Hudhud sent (a ticket on the day, a role to-do each week), so each goes once.';

alter table core.telegram_nudges enable row level security;

create policy "No third-party apps" on core.telegram_nudges
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));

grant all on core.telegram_nudges to service_role;

-- Tickets for events starting in the next three hours (the bot, with the
-- secret key): confirmed bookings of linked members who keep reminders on.
create function core.telegram_tickets_soon()
returns table (
  telegram_id bigint, locale text, event_id uuid, slug text,
  title_en text, title_ar text, venue_en text, venue_ar text,
  starts_at timestamptz, ticket_code text
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.telegram_id, p.locale, e.id, e.slug, e.title_en, e.title_ar,
    e.venue_en, e.venue_ar, e.starts_at, r.ticket_code
  from events.rsvps r
  join events.events e on e.id = r.event_id
  join core.telegram_accounts t on t.user_id = r.user_id
  join core.profiles p on p.id = r.user_id
  where r.status = 'confirmed'
    and e.status = 'published'
    and t.reminders
    and e.starts_at > now()
    and e.starts_at <= now() + interval '3 hours'
$$;

revoke all on function core.telegram_tickets_soon() from public, anon, authenticated;
grant execute on function core.telegram_tickets_soon() to service_role;

-- Each role holder's own to-dos (the bot, with the secret key), for linked
-- holders who keep reminders on: a handover to sign (a role ended in the
-- last 60 days or ending in the next 14, none signed yet, as
-- access.my_handovers_due) and a current role's agreement not yet signed.
create function core.telegram_role_todos()
returns table (
  telegram_id bigint, locale text, kind text, assignment_id uuid,
  role_en text, role_ar text
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.telegram_id, p.locale, 'handover', a.id,
    coalesce(nullif(btrim(a.title_en), ''), r.name_en),
    coalesce(nullif(btrim(a.title_ar), ''), r.name_ar)
  from access.role_assignments a
  join access.roles r on r.key = a.role
  join core.telegram_accounts t on t.user_id = a.user_id
  join core.profiles p on p.id = a.user_id
  where t.reminders
    and r.kind <> 'outside'
    and a.ends_at is not null
    and a.ends_at > now() - interval '60 days'
    and a.ends_at < now() + interval '14 days'
    and not exists (
      select 1 from governance.form_submissions s
      where s.form_key = 'handover' and s.subject_id = a.id and s.status <> 'draft'
    )
  union all
  select t.telegram_id, p.locale, 'role_agreement', a.id,
    coalesce(nullif(btrim(a.title_en), ''), r.name_en),
    coalesce(nullif(btrim(a.title_ar), ''), r.name_ar)
  from access.role_assignments a
  join access.roles r on r.key = a.role
  join core.telegram_accounts t on t.user_id = a.user_id
  join core.profiles p on p.id = a.user_id
  where t.reminders
    and r.kind <> 'outside'
    and a.starts_at <= now()
    and (a.ends_at is null or a.ends_at > now())
    and not exists (select 1 from access.role_agreements g where g.assignment_id = a.id)
$$;

revoke all on function core.telegram_role_todos() from public, anon, authenticated;
grant execute on function core.telegram_role_todos() to service_role;
