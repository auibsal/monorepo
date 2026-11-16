-- The scheduled jobs' run history is kept 7 days (Supabase's guidance for
-- pg_cron), in code like every other job: the copy made by hand in the
-- dashboard on Nov 17, 2026 is replaced by sal-cron-history, with the same
-- schedule (noon UTC) and work. The health checks read at most 26 hours of
-- history, well inside the 7 days.
do $history$
begin
  if exists (select 1 from cron.job where jobname = 'delete-job-run-details') then
    perform cron.unschedule('delete-job-run-details');
  end if;
end
$history$;

select cron.schedule('sal-cron-history', '0 12 * * *',
  $$ delete from cron.job_run_details where end_time < now() - interval '7 days' $$);
