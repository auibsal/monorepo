-- The days the Society marks: a tier-2 day is "a post and a Qirtas piece"
-- (decisions.md, The days the Society marks), so planning the year also
-- pitches its piece on Voices' board.

create or replace function private.plan_year(year integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  d content.days_marked;
  on_day date;
  tier text;
  added integer := 0;
  n integer;
  slug text;
  event_id uuid;
  month_count integer;
begin
  if not private.has_permission_anywhere('content.manage') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  for d in select * from content.days_marked order by sort loop
    on_day := coalesce(private.day_marked_on(d, plan_year.year),
      case when d.month is not null then make_date(plan_year.year, d.month, 1) end);
    if on_day is null then
      -- The moon's and AUIB's dates: an entry to date when AUIB sets them.
      on_day := make_date(plan_year.year, 1, 1);
    end if;
    tier := d.tier;
    if tier = '1' and private.drops_to_post(on_day) then
      tier := '3';
    end if;
    -- At most two tier-2 or tier-3 days a month; the rest wait for the
    -- owner to choose.
    select count(*) into month_count from content.calendar_entries c
    join content.days_marked m on m.key = c.day_key
    where c.year = plan_year.year and c.kind = 'post' and c.status <> 'skipped'
      and m.tier in ('2', '3')
      and date_trunc('month', c.publish_on) = date_trunc('month', on_day);
    event_id := null;
    if tier = '1' then
      slug := trim(both '-' from regexp_replace(lower(d.name_en), '[^a-z0-9]+', '-', 'g'))
        || '-' || to_char(on_day, 'YYYY-MM-DD');
      select e.id into event_id from events.events e where e.slug = slug;
      if event_id is null then
        insert into events.events (slug, title_en, title_ar, starts_at, status)
        values (slug, d.name_en, d.name_ar,
          (on_day + time '14:30') at time zone 'Asia/Baghdad', 'draft')
        returning id into event_id;
      end if;
    end if;
    insert into content.calendar_entries
      (publish_on, channel, status, title_en, title_ar, event_id, day_key, year, kind,
       owner_role, confirm_date)
    values (
      on_day, 'instagram',
      case when d.tier in ('2', '3') and month_count >= 2 then 'choose' else 'planned' end,
      d.name_en, d.name_ar, event_id, d.key, plan_year.year,
      case when tier = '1' then 'event' when tier = 'greeting' then 'greeting' else 'post' end,
      d.owner_role,
      d.rule in ('approx', 'moon', 'auib', 'nth', 'month'))
    on conflict (day_key, year, channel) do nothing;
    get diagnostics n = row_count;
    added := added + n;
    -- A tier-2 day is also a Qirtas piece: a pitch on Voices' board, due
    -- two days before, for the Editor-in-Chief to assign.
    if n > 0 and tier = '2' and not (month_count >= 2) then
      insert into journal.story_assignments (desk, slug, angle, kind, due_on, status, created_by)
      values ('voices',
        trim(both '-' from regexp_replace(lower(d.name_en), '[^a-z0-9]+', '-', 'g'))
          || '-' || plan_year.year,
        'A piece for ' || d.name_en || ', ' || to_char(on_day, 'FMMonth FMDD') || '.',
        'writing', on_day - 2, 'pitched', auth.uid());
    end if;
  end loop;
  return added;
end;
$$;
