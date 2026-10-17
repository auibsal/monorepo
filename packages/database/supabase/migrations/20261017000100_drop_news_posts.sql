-- The old news table goes (owner, Oct 17, 2026). News has been Waraq's
-- News desk since 20261014000400 and nothing has written to
-- content.news_posts since (the News desk's archive is in Waraq, from
-- 20261014000300). First the two functions that still named it, then the
-- table and its rows; its policies, triggers and indexes go with it.

create or replace function private.publish_scheduled()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  total integer := 0;
  n integer;
  due uuid;
begin
  if exists (
    select 1 from journal.issues
    where status = 'scheduled' and publish_at <= now()
  ) then
    update journal.issues set status = 'published', published_at = publish_at
    where status = 'scheduled' and publish_at <= now();
    get diagnostics n = row_count; total := total + n;
  end if;

  for due in
    select p.id from journal.pieces p
    where p.status = 'scheduled' and p.publish_at <= now()
    order by p.publish_at
  loop
    update journal.pieces set status = 'approved' where id = due;
    if private.try_publish(due) = 'published' then
      total := total + 1;
    end if;
  end loop;

  return total;
end;
$$;

revoke all on function private.publish_scheduled() from public, anon, authenticated;

-- Co-editing rooms: news rooms no longer exist; pieces and pages remain.
create or replace function private.can_edit_room(topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[] := regexp_match(
    topic,
    '^sal:([a-z]+):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$'
  );
  kind text := parts[1];
  record_id uuid := parts[2]::uuid;
  issue uuid;
begin
  if parts is null or (select private.oauth_client_id()) is not null then
    return false;
  end if;
  case kind
    when 'minutes' then
      return exists (select 1 from governance.minutes m where m.id = record_id)
        and access.has_permission('governance.minutes.write');
    when 'page' then
      return exists (select 1 from content.pages p where p.id = record_id)
        and access.has_permission('content.manage');
    when 'piece' then
      select p.issue_id into issue from journal.pieces p where p.id = record_id;
      return issue is not null
        and access.has_permission('journal.publish', 'issue', issue);
    else
      return false;
  end case;
end;
$$;

drop table content.news_posts;
