-- Removal requests (SAL-MEM-02, decisions §13). A request from Contact
-- hides what it points to on the site at once (a Qirtas piece or a Next
-- Stop episode, found from its address); staff then decide within two
-- business days (AUIB's week: Sunday to Thursday): take it down from the
-- Society's channels ("removed", it stays hidden) or decline with a reason
-- ("declined", it comes back as it was).

-- ── Two business days ────────────────────────────────────────────────────────

create function private.add_business_days(start timestamptz, days integer)
returns timestamptz
language plpgsql
immutable
set search_path = ''
as $$
declare
  at timestamptz := start;
  left_ integer := days;
begin
  while left_ > 0 loop
    at := at + interval '1 day';
    -- Friday (5) and Saturday (6) are not working days in Baghdad.
    if extract(dow from at at time zone 'Asia/Baghdad') not in (5, 6) then
      left_ := left_ - 1;
    end if;
  end loop;
  return at;
end;
$$;
revoke all on function private.add_business_days(timestamptz, integer) from public, anon, authenticated;

alter table programmes.removal_requests
  alter column due_at set default private.add_business_days(now(), 2),
  add column hidden_kind text check (hidden_kind in ('piece', 'episode')),
  add column hidden_id uuid,
  add column hidden_was timestamptz;
comment on column programmes.removal_requests.hidden_kind is
  'What the request hid on the site as it arrived (decisions §13): a piece or an episode, restored if the request is declined.';

-- ── Hide at once ─────────────────────────────────────────────────────────────

create function private.hide_for_removal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  path text := lower(coalesce(substring(new.content_url from '^(?:https?://[^/]+)?(/[^?#]*)'), ''));
  target text := (regexp_match(path, '/([a-z0-9]+(?:-[a-z0-9]+)*)/?$'))[1];
  piece journal.pieces;
  episode programmes.episodes;
begin
  if target is null then
    return new;
  end if;
  if path ~ '/qirtas/' then
    select * into piece from journal.pieces p where p.slug = target and p.status = 'published' limit 1;
    if found then
      update journal.pieces set status = 'unpublished', front_rank = null where id = piece.id;
      new.hidden_kind := 'piece';
      new.hidden_id := piece.id;
      new.hidden_was := piece.published_at;
    end if;
  elsif path ~ '/next-stop/' then
    select * into episode from programmes.episodes e
    where e.slug = target and e.published_at is not null limit 1;
    if found then
      update programmes.episodes set published_at = null where id = episode.id;
      new.hidden_kind := 'episode';
      new.hidden_id := episode.id;
      new.hidden_was := episode.published_at;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.hide_for_removal() from public, anon, authenticated;

create trigger hide_for_removal before insert on programmes.removal_requests
  for each row execute function private.hide_for_removal();

-- ── A declined request brings it back ────────────────────────────────────────

create function private.restore_after_decline()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'declined' and old.status is distinct from 'declined' and new.hidden_id is not null then
    if new.hidden_kind = 'piece' then
      update journal.pieces
      set status = 'published', published_at = coalesce(new.hidden_was, published_at, now())
      where id = new.hidden_id and status = 'unpublished';
    elsif new.hidden_kind = 'episode' then
      update programmes.episodes set published_at = coalesce(new.hidden_was, now())
      where id = new.hidden_id and published_at is null;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.restore_after_decline() from public, anon, authenticated;

create trigger restore_after_decline after update of status on programmes.removal_requests
  for each row execute function private.restore_after_decline();
