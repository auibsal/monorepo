-- One scheduler (the owner, Nov 16: one place for each thing; a platform's
-- own feature over a second copy). Every scheduled job already runs from
-- pg_cron, but retention ran twice a day: Vercel Cron called
-- /api/cron/retention (files, accounts, then every rule) at 1:00 UTC, and
-- pg_cron's sal-retention ran the rules again at 5:15. Now pg_cron calls the
-- route once, like the calendar, Notion and Telegram jobs; the route runs
-- run_retention after the files, and a failure is emailed to the
-- administrators and shows in platform_health. Vercel Cron is no longer
-- used (apps/web/vercel.json).
select cron.unschedule('sal-retention')
where exists (select 1 from cron.job where jobname = 'sal-retention');

select cron.schedule('sal-retention', '0 1 * * *',
  $$ select private.call_api('/cron/retention', '{}'::jsonb, 'cron_secret') $$);
