-- Hudhud's posts run through Supabase Queues (decisions.md, The site:
-- Background jobs). The Telegram job (sal-telegram-posts, every ten
-- minutes) plans its posts as messages on the queue `telegram`, then reads
-- a small batch at a time, invisible to other runs for 40 seconds (inside
-- the route's 60), sends each, and deletes it once Telegram confirms. A run
-- that dies leaves its messages to reappear for the next; a message that
-- keeps failing (five reads) is archived and reported to the web topic and
-- the Desk by sal-platform-health, like a failed job.
--
-- The queue's schema (pgmq) is not exposed: the job reaches it only
-- through the four functions below, for the server's secret key alone.

create extension if not exists pgmq;
select pgmq.create('telegram');

create function private.telegram_enqueue(messages jsonb[])
returns integer
language sql
security definer
set search_path = ''
as $$
  select count(*)::integer from pgmq.send_batch('telegram', messages)
$$;

create function private.telegram_read(how_many integer, hidden_for integer)
returns table (msg_id bigint, read_ct integer, message jsonb)
language sql
security definer
set search_path = ''
as $$
  select r.msg_id, r.read_ct, r.message
  from pgmq.read('telegram', hidden_for, how_many) r
$$;

create function private.telegram_done(msg_id bigint)
returns boolean
language sql
security definer
set search_path = ''
as $$ select pgmq.delete('telegram', msg_id) $$;

create function private.telegram_set_aside(msg_id bigint)
returns boolean
language sql
security definer
set search_path = ''
as $$ select pgmq.archive('telegram', msg_id) $$;

-- The names the job calls (in core, so api wraps them), for service_role only.
create function core.telegram_enqueue(messages jsonb[])
returns integer language sql security invoker set search_path = ''
as $$ select private.telegram_enqueue(messages) $$;
create function core.telegram_read(how_many integer, hidden_for integer)
returns table (msg_id bigint, read_ct integer, message jsonb)
language sql security invoker set search_path = ''
as $$ select * from private.telegram_read(how_many, hidden_for) $$;
create function core.telegram_done(msg_id bigint)
returns boolean language sql security invoker set search_path = ''
as $$ select private.telegram_done(msg_id) $$;
create function core.telegram_set_aside(msg_id bigint)
returns boolean language sql security invoker set search_path = ''
as $$ select private.telegram_set_aside(msg_id) $$;

do $grants$
declare
  f text;
begin
  foreach f in array array[
    'private.telegram_enqueue(jsonb[])', 'private.telegram_read(integer, integer)',
    'private.telegram_done(bigint)', 'private.telegram_set_aside(bigint)',
    'core.telegram_enqueue(jsonb[])', 'core.telegram_read(integer, integer)',
    'core.telegram_done(bigint)', 'core.telegram_set_aside(bigint)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end
$grants$;

-- The health check: a post set aside in the last hour (pgmq's archive keeps
-- it, with its last try), reported once a day.
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
  aside integer;
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
  -- A route a job called that failed or ran out of time in the last hour.
  for r in select * from private.failed_routes() loop
    insert into core.staff_alerts (team, urgent, text_en, text_ar, dedupe_key)
    values ('web', true,
      case when r.timed_out
        then format('The route %s ran out of time in the last hour (calls: %s). Its log is on Vercel, under Logs.', r.path, r.failures)
        else format('The route %s failed in the last hour (calls: %s; last answer: %s). Its log is on Vercel, under Logs.', r.path, r.failures, coalesce(r.last_status::text, 'none'))
      end,
      case when r.timed_out
        then format('نفد وقت المسار ⁦%s⁩ في الساعة الأخيرة (عدد الطلبات: %s). سجلّه على Vercel، ضمن Logs.', r.path, r.failures)
        else format('فشل المسار ⁦%s⁩ في الساعة الأخيرة (عدد الطلبات: %s؛ آخر رد: %s). سجلّه على Vercel، ضمن Logs.', r.path, r.failures, coalesce(r.last_status::text, 'لا رد'))
      end,
      format('route-failed:%s:%s', r.path, day))
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
    n := n + 1;
  end loop;
  -- Telegram posts set aside after five tries in the last hour.
  select count(*) into aside from pgmq.a_telegram where archived_at > now() - interval '1 hour';
  if aside > 0 then
    insert into core.staff_alerts (team, urgent, text_en, text_ar, dedupe_key)
    values ('web', true,
      format('Hudhud set aside posts it could not send after five tries (in the last hour: %s). They are in Supabase, Integrations, Queues, the archive of telegram.', aside),
      format('نحّى الهدهد منشورات تعذّر إرسالها بعد خمس محاولات (في الساعة الأخيرة: %s). هي في Supabase، ضمن Integrations ثم Queues، في أرشيف ⁦telegram⁩.', aside),
      'telegram-set-aside:' || day)
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
    n := n + 1;
  end if;
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

select private.build_api();
