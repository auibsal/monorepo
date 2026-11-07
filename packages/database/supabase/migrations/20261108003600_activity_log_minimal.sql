-- The activity log keeps what it needs and no more (audit E1).
--
-- Each line keeps the record's id and the few fields that name it (its
-- title, code, slug, status, the role and the person's account id), the
-- columns that changed, and who did it: never names of people, addresses
-- or what anyone wrote. Lines are deleted after twelve months, and a
-- person's own lines with their account (lib/api/deletion.ts).

alter table core.activity_log add column changed text[];
comment on column core.activity_log.changed is
  'For an update: the columns that changed (their names only).';

-- The fields a line may keep: what names a record, never personal data.
create function private.activity_fields(r jsonb, table_name text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case when r is null then null else (
    select coalesce(jsonb_object_agg(k, r -> k), '{}'::jsonb)
    from jsonb_object_keys(r) as k
    where k in ('id', 'user_id', 'role', 'scope_type', 'scope_id', 'slug', 'code', 'kind',
                'status', 'stage', 'event_id', 'partner_id', 'form_key')
       or (k in ('title_en', 'title_ar', 'name_en', 'name_ar')
           and table_name not in ('profiles', 'guests', 'memberships'))
  ) end
$$;

create or replace function private.log_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_json jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  new_json jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  insert into core.activity_log
    (table_schema, table_name, operation, row_id, actor_id, old_row, new_row, changed)
  values (
    tg_table_schema,
    tg_table_name,
    tg_op,
    coalesce(new_json, old_json) ->> 'id',
    auth.uid(),
    private.activity_fields(old_json, tg_table_name),
    private.activity_fields(new_json, tg_table_name),
    case when tg_op = 'UPDATE' then (
      select coalesce(array_agg(k order by k), '{}')
      from jsonb_object_keys(new_json) as k
      where k not in ('updated_at', 'search') and (old_json -> k) is distinct from (new_json -> k)
    ) end
  );
  return coalesce(new, old);
end;
$$;

-- Lines kept before: the changed columns worked out, then trimmed.
update core.activity_log l
set changed = case when l.operation = 'UPDATE' then (
      select coalesce(array_agg(k order by k), '{}')
      from jsonb_object_keys(coalesce(l.new_row, '{}'::jsonb)) as k
      where k not in ('updated_at', 'search') and (l.old_row -> k) is distinct from (l.new_row -> k)
    ) end,
    old_row = private.activity_fields(l.old_row, l.table_name),
    new_row = private.activity_fields(l.new_row, l.table_name);

-- The record's history reads the changed columns.
create or replace function private.record_history(record_table text, record_id text)
returns table (operation text, actor_id uuid, occurred_at timestamptz, changed text[])
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_staff((select auth.uid())))
    or not (record_table = any (private.history_tables())) then
    return;
  end if;
  return query
    select l.operation, l.actor_id, l.occurred_at, coalesce(l.changed, '{}'::text[])
    from core.activity_log l
    where l.table_schema = split_part(record_table, '.', 1)
      and l.table_name = split_part(record_table, '.', 2)
      and l.row_id = record_id
    order by l.id desc
    limit 100;
end;
$$;

-- Twelve months, then gone.
create function private.purge_activity_log()
returns integer
language sql
security definer
set search_path = ''
as $$
  with gone as (
    delete from core.activity_log where occurred_at < now() - interval '12 months' returning 1
  )
  select count(*)::integer from gone;
$$;

revoke all on function private.purge_activity_log() from public, anon, authenticated;

select cron.schedule('sal-activity-log', '55 5 * * *', $$ select private.purge_activity_log() $$);
