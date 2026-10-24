-- One app (owner, Oct 24, 2026): the API routes live at auibsal.org/api and
-- the api.auibsal.org host is gone. The outbox trigger and the scheduled
-- jobs call `platform.api_url` + a path (/hooks/outbox, /cron/...), so the
-- setting moves to the new base. Only an old api.auibsal.org value changes:
-- local stacks and CI keep their null (nothing is sent there).
update core.settings
set value = to_jsonb('https://auibsal.org/api'::text),
  description = 'Base URL of the API routes (auibsal.org/api), called by the outbox trigger and scheduled jobs.',
  updated_at = now()
where key = 'platform.api_url'
  and value #>> '{}' like 'https://api.auibsal.org%';

-- The description also names the new home where the value was never set.
update core.settings
set description = 'Base URL of the API routes (auibsal.org/api), called by the outbox trigger and scheduled jobs.'
where key = 'platform.api_url';
