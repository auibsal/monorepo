-- Correcting a member's name (decisions.md: names as on their papers).
--
-- A member writes their own four-part names; an officer who manages
-- members may also correct them to the official names, from the member's
-- page in the Diwan. All eight parts are required. The activity log keeps
-- who corrected whose name and which parts changed, never the names.

create function private.correct_member_name(
  member uuid,
  first_en text, father_en text, grandfather_en text, last_en text,
  first_ar text, father_ar text, grandfather_ar text, last_ar text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  parts text[] := array[first_en, father_en, grandfather_en, last_en,
                        first_ar, father_ar, grandfather_ar, last_ar];
  part text;
  before core.profiles;
  after core.profiles;
begin
  if not private.has_permission('members.manage') then
    raise exception 'Only an officer who manages members corrects a name'
      using errcode = '42501';
  end if;
  foreach part in array parts loop
    if part is null or btrim(part) = '' then
      raise exception 'name_parts_required' using errcode = '22023',
        hint = 'All four parts, in English and in Arabic.';
    end if;
    if char_length(btrim(part)) > 60 then
      raise exception 'name_part_too_long' using errcode = '22001';
    end if;
  end loop;

  select * into before from core.profiles where id = member for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  update core.profiles
  set first_name_en = btrim(first_en),
      father_name_en = btrim(father_en),
      grandfather_name_en = btrim(grandfather_en),
      last_name_en = btrim(last_en),
      first_name_ar = btrim(first_ar),
      father_name_ar = btrim(father_ar),
      grandfather_name_ar = btrim(grandfather_ar),
      last_name_ar = btrim(last_ar)
  where id = member
  returning * into after;

  insert into core.activity_log
    (table_schema, table_name, operation, row_id, actor_id, old_row, new_row, changed)
  values (
    'core', 'profiles', 'UPDATE', member::text, auth.uid(),
    jsonb_build_object('user_id', member),
    jsonb_build_object('user_id', member),
    (
      select coalesce(array_agg(k order by k), '{}')
      from jsonb_each(to_jsonb(after)) as a(k, v)
      where k like '%\_name\_%' escape '\'
        and k not like 'full\_name%' escape '\'
        and (to_jsonb(before) -> k) is distinct from v
    )
  );
end;
$$;

revoke all on function private.correct_member_name(uuid, text, text, text, text, text, text, text, text)
  from public, anon;
grant execute on function private.correct_member_name(uuid, text, text, text, text, text, text, text, text)
  to authenticated;

create function membership.correct_name(
  member uuid,
  first_en text, father_en text, grandfather_en text, last_en text,
  first_ar text, father_ar text, grandfather_ar text, last_ar text
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.correct_member_name(member, first_en, father_en, grandfather_en, last_en,
    first_ar, father_ar, grandfather_ar, last_ar)
$$;

revoke all on function membership.correct_name(uuid, text, text, text, text, text, text, text, text)
  from public, anon;
grant execute on function membership.correct_name(uuid, text, text, text, text, text, text, text, text)
  to authenticated;

comment on function membership.correct_name(uuid, text, text, text, text, text, text, text, text) is
  'An officer who manages members sets a member''s four-part names, in English and in Arabic, to the names on their papers.';
