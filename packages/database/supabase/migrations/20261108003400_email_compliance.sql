-- Email compliance (audit D3; CAN-SPAM and the bulk senders' rules).
--
-- 1. Addresses that bounced or complained are kept on a suppression list,
--    written by Resend's webhook (/api/hooks/resend); the outbox and the
--    Broadcasts never write to them again.
-- 2. The Sunday Paper's confirmation goes at most three times in thirty
--    days to one address, and a sign-up never confirmed is deleted after
--    thirty days.

create table core.email_suppressions (
  email text primary key check (email = lower(btrim(email)) and char_length(email) between 3 and 320),
  reason text not null check (reason in ('bounced', 'complained')),
  -- Resend's event id, so a delivery retried by Resend is kept once.
  event_id text,
  created_at timestamptz not null default now()
);

comment on table core.email_suppressions is
  'Addresses that bounced or complained (Resend''s webhook): the outbox and Broadcasts skip them. Read and written by the API routes only.';

alter table core.email_suppressions enable row level security;

create policy "No third-party apps" on core.email_suppressions
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));

-- ── 2. The Sunday Paper's confirmations ─────────────────────────────────────

alter table content.newsletter_subscribers
  add column confirm_sends integer not null default 0 check (confirm_sends >= 0),
  add column confirm_window_at timestamptz;

comment on column content.newsletter_subscribers.confirm_sends is
  'Confirmations sent since confirm_window_at: at most three in thirty days (/api/newsletter/subscribe).';

create function private.purge_unconfirmed_subscribers()
returns integer
language sql
security definer
set search_path = ''
as $$
  with gone as (
    delete from content.newsletter_subscribers
    where status = 'pending' and created_at < now() - interval '30 days'
    returning 1
  )
  select count(*)::integer from gone;
$$;

revoke all on function private.purge_unconfirmed_subscribers() from public, anon, authenticated;

select cron.schedule('sal-newsletter-unconfirmed', '50 5 * * *', $$ select private.purge_unconfirmed_subscribers() $$);

-- ── 3. An invitation in the invitee's language (audit D2) ──────────────────

alter table governance.partner_invitations
  add column lang text check (lang in ('en', 'ar'));
comment on column governance.partner_invitations.lang is
  'The language the invitation email is written in, chosen by whoever invites (the invitee''s); unset falls back to the inviter''s.';
grant insert (lang) on governance.partner_invitations to authenticated;
