-- Site emails never left (owner, Oct 31, 2026: "the personal email link
-- does not get sent"). The outbox trigger and the scheduled jobs call
-- platform.api_url + a path with a bearer token from Vault; with either
-- missing, private.call_api quietly does nothing. The address is known
-- (the site, packages/config/project.json), so it is set here rather than
-- by hand; the two Vault secrets carry the same values as the app's
-- DATABASE_WEBHOOK_SECRET and CRON_SECRET and are set in the dashboard.
-- Local stacks and CI keep no Vault secrets, so nothing is sent from them.

update core.settings
set value = to_jsonb('https://auibsal.org/api'::text),
  updated_at = now()
where key = 'platform.api_url'
  and (value is null or value = 'null'::jsonb or value #>> '{}' = '');

-- What the Desk's Connected panel shows about email: how many are waiting,
-- since when, the last one sent, and which of the three settings is
-- missing. Never the secrets themselves.
create function private.outbox_health()
returns table (
  waiting integer,
  oldest_waiting timestamptz,
  last_sent timestamptz,
  failing integer,
  api_url_set boolean,
  outbox_secret_set boolean,
  cron_secret_set boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not access.has_permission('settings.manage') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query
  select
    (select count(*)::integer from core.outbox o where o.processed_at is null),
    (select min(o.created_at) from core.outbox o where o.processed_at is null),
    (select max(o.processed_at) from core.outbox o),
    (select count(*)::integer from core.outbox o
      where o.processed_at is null and o.last_error is not null),
    coalesce(nullif(private.setting('platform.api_url') #>> '{}', ''), null) is not null,
    private.vault_secret('outbox_webhook_secret') is not null,
    private.vault_secret('cron_secret') is not null;
end;
$$;
revoke all on function private.outbox_health() from public, anon;
grant execute on function private.outbox_health() to authenticated;

create function core.outbox_health()
returns table (
  waiting integer,
  oldest_waiting timestamptz,
  last_sent timestamptz,
  failing integer,
  api_url_set boolean,
  outbox_secret_set boolean,
  cron_secret_set boolean
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.outbox_health() $$;
revoke all on function core.outbox_health() from public, anon;
grant execute on function core.outbox_health() to authenticated;
