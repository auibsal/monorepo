-- A route that fails or times out reaches the web lead (decisions.md, The
-- site: no silent failures), the same as a failed job.
--
-- The scheduled jobs call the site's routes through private.call_api
-- (pg_net). pg_cron marks a job succeeded as soon as the request is queued,
-- so a route that ran out of Vercel's 60 seconds, or answered with an
-- error, was invisible to the health check: on Nov 16, 2026, the Telegram
-- route timed out every ten minutes for eight hours with every job green.
--
-- Now each call is recorded with its path, pg_net waits long enough to hear
-- Vercel's own timeout (504), and the hourly sal-platform-health reports a
-- route that answered with a server error or not at all, once a day per
-- route, to the web topic and the Desk.

create table private.api_calls (
  request_id bigint primary key,
  path text not null,
  called_at timestamptz not null default now()
);
comment on table private.api_calls is
  'Which route each pg_net request called, for the health check; kept a day.';
create index api_calls_called_at_idx on private.api_calls (called_at);
alter table private.api_calls enable row level security;
revoke all on private.api_calls from public, anon, authenticated;
-- Its writer is private.call_api and its reader private.platform_health
-- (SECURITY DEFINER, as the owner); no one else reaches it.
create policy "Only the health check" on private.api_calls
  as restrictive for all to public using (false) with check (false);

create or replace function private.call_api(path text, body jsonb, secret_name text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text := private.setting('platform.api_url') #>> '{}';
  token text := private.vault_secret(secret_name);
  request bigint;
begin
  if base is null or base = '' or token is null then
    return null;
  end if;
  -- 70 seconds: longer than the routes' 60, so a timeout is heard as
  -- Vercel's 504 instead of pg_net giving up first.
  request := net.http_post(
    url := rtrim(base, '/') || path,
    body := body,
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'authorization', 'Bearer ' || token
    ),
    timeout_milliseconds := 70000
  );
  insert into private.api_calls (request_id, path) values (request, path)
  on conflict (request_id) do nothing;
  delete from private.api_calls where called_at < now() - interval '1 day';
  return request;
end;
$$;
revoke all on function private.call_api(text, jsonb, text) from public, anon, authenticated;

-- The routes that answered with a server error, or never answered, in the
-- last hour (pg_net keeps its answers six hours).
create function private.failed_routes()
returns table (path text, failures bigint, last_status integer, timed_out boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.path, count(*),
    (array_agg(r.status_code order by r.created desc))[1],
    bool_or(coalesce(r.timed_out, false) or r.status_code = 504)
  from private.api_calls c
  join net._http_response r on r.id = c.request_id
  where r.created > now() - interval '1 hour'
    and (r.status_code >= 500 or r.timed_out or r.error_msg is not null)
  group by c.path;
$$;
revoke all on function private.failed_routes() from public, anon, authenticated;

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
