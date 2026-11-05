-- Public pages stopped refreshing (owner, Nov 5, 2026: "Mohammed Ali Ehsan"
-- stayed on the site after the byline was renamed).
--
-- A change queues one `revalidate` row per set of tags, unless one is
-- already waiting. A row that failed five times (MAX_ATTEMPTS in
-- apps/web/lib/api/outbox.ts) is never tried again, yet it still counted
-- as waiting: from then on no refresh for those tags was ever queued, and
-- the cached pages kept their old content. Only a row that can still run
-- counts now; the stuck ones are closed, and every public cache is
-- refreshed once.

create or replace function private.queue_revalidation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tags jsonb := jsonb_build_object('tags', to_jsonb(tg_argv));
begin
  if not exists (
    select 1 from core.outbox o
    where o.kind = 'revalidate' and o.processed_at is null and o.payload = tags
      and o.attempts < 5
  ) then
    perform private.enqueue('revalidate', tags);
  end if;
  return null;
end;
$$;

update core.outbox
set processed_at = now(),
    last_error = concat_ws(' · ', last_error, 'closed: gave up after five tries (Nov 5, 2026)')
where kind = 'revalidate' and processed_at is null and attempts >= 5;

select private.enqueue('revalidate', jsonb_build_object('tags', jsonb_build_array(
  'events', 'journal', 'news', 'charity', 'programmes', 'documents', 'about',
  'partners', 'certificates', 'productions', 'governance'
)));
