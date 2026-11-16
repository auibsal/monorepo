-- The hourly platform health check (Nov 16), corrected after its first day
-- in production (decisions.md, The site: no silent failures):
--
-- - A job is late only once it has been running long enough to have been
--   due: its first recorded run is older than its window. The health job
--   never judges itself: on its first run it is the one job with a run and
--   no success yet, and it flagged itself as late.
-- - The outbox alarm counts only emails still being tried. One that gave up
--   after its five tries (the outbox's MAX_ATTEMPTS, lib/api/outbox.ts) will
--   never send, so it no longer raises "waited over an hour" every day;
--   instead each new one is reported once, not urgent, for the web lead to
--   send again or tell the person.

create or replace function private.platform_health()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer := 0;
  day text := to_char(now() at time zone 'Asia/Baghdad', 'YYYY-MM-DD');
  r record;
  synced timestamptz;
  oldest timestamptz;
  dead_count integer;
  dead_newest bigint;
  dead_kind text;
begin
  -- Failed in the last hour.
  for r in
    select j.jobname, max(d.end_time) as at
    from cron.job_run_details d join cron.job j on j.jobid = d.jobid
    where d.status = 'failed' and d.end_time > now() - interval '1 hour'
    group by j.jobname
  loop
    insert into core.staff_alerts (team, urgent, text_en, text_ar, dedupe_key)
    values ('web', true,
      format('The scheduled job %s failed. Its runs are in Supabase, Integrations, Cron.', r.jobname),
      format('فشلت المهمة المجدولة %s. سجلّ تشغيلها في Supabase، ضمن Integrations ثم Cron.', r.jobname),
      format('cron-failed:%s:%s', r.jobname, day))
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
    n := n + 1;
  end loop;
  -- Late: a job that runs every few minutes or hourly with no success in
  -- two hours, or a daily one with none in 26 hours, once it has run long
  -- enough to have been due; never this job itself.
  for r in
    select j.jobname
    from cron.job j
    cross join lateral (
      select case
        when j.schedule ~ '^(\*/\d+|\d+) \* \* \* \*$' then interval '2 hours'
        when j.schedule ~ '^\d+ \d+ \* \* \*$' then interval '26 hours'
      end as due
    ) w
    where j.active
      and w.due is not null
      and j.jobname <> 'sal-platform-health'
      and (select min(d.start_time) from cron.job_run_details d where d.jobid = j.jobid)
        < now() - w.due
      and not exists (select 1 from cron.job_run_details d
        where d.jobid = j.jobid and d.status = 'succeeded' and d.end_time > now() - w.due)
  loop
    insert into core.staff_alerts (team, urgent, text_en, text_ar, dedupe_key)
    values ('web', true,
      format('The scheduled job %s is late: it has not run successfully when it should have.', r.jobname),
      format('تأخّرت المهمة المجدولة %s: لم تُنفَّذ بنجاح في موعدها.', r.jobname),
      format('cron-late:%s:%s', r.jobname, day))
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
    n := n + 1;
  end loop;
  -- The Notion sync, where it is set up.
  select (value ->> 'at')::timestamptz into synced from core.settings where key = 'notion.sync_state';
  if exists (select 1 from core.settings where key = 'notion.data_sources' and value ? 'events')
    and (synced is null or synced < now() - interval '1 hour')
  then
    insert into core.staff_alerts (team, urgent, text_en, text_ar, dedupe_key)
    values ('web', true,
      'The Notion sync has not finished a run in over an hour. Check NOTION_TOKEN and the runtime log on Vercel.',
      'لم تكتمل مزامنة Notion منذ أكثر من ساعة. راجع NOTION_TOKEN وسجلّ التشغيل على Vercel.',
      'notion-stalled:' || day)
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
    n := n + 1;
  end if;
  -- The email outbox: an email still being tried that has waited an hour.
  select min(created_at) into oldest
  from core.outbox
  where processed_at is null and attempts < 5;
  if oldest is not null and oldest < now() - interval '1 hour' then
    insert into core.staff_alerts (team, urgent, text_en, text_ar, dedupe_key)
    values ('web', true,
      'An email has waited in the outbox for over an hour. Check RESEND_TOKEN and the outbox job on Vercel.',
      'ينتظر بريد في صندوق الإرسال منذ أكثر من ساعة. راجع RESEND_TOKEN ومهمة الإرسال على Vercel.',
      'outbox-stalled:' || day)
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
    n := n + 1;
  end if;
  -- Emails that gave up after five tries: reported once for each newest one.
  select count(*), max(id) into dead_count, dead_newest
  from core.outbox
  where processed_at is null and attempts >= 5;
  if dead_count > 0 then
    select kind into dead_kind from core.outbox where id = dead_newest;
    insert into core.staff_alerts (team, urgent, text_en, text_ar, dedupe_key)
    values ('web', false,
      format('Emails that gave up after five tries: %s (the newest: %s). Each row in core.outbox keeps its last error; send it again or tell the person.', dead_count, dead_kind),
      format('رسائل توقّف إرسالها بعد خمس محاولات: %s (آخرها: ⁦%s⁩). لكل منها آخر خطأ في ⁦core.outbox⁩؛ أعيدوا إرسالها أو أبلغوا صاحبها.', dead_count, dead_kind),
      'outbox-dead:' || dead_newest)
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
    n := n + 1;
  end if;
  return n;
end;
$$;
revoke all on function private.platform_health() from public, anon, authenticated;
