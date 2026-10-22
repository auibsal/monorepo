-- The Telegram bot moved into apps/api (owner, 2026-10-22: one app holds the
-- secrets). The group posts now go through private.call_api like the other
-- scheduled jobs, so the bot's own address and caller are gone.

select cron.unschedule('sal-telegram-posts');
select cron.schedule('sal-telegram-posts', '*/10 * * * *',
  $$ select private.call_api('/cron/telegram', '{}'::jsonb, 'cron_secret') $$);

drop function private.call_bot(text, jsonb);

delete from core.settings where key = 'platform.bot_url';
