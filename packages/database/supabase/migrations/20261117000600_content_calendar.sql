-- The content calendar (decisions.md, Posting; The days the Society
-- marks). Diwan → Media → Channels keeps one calendar of posts: each with
-- its date, channel and status, images from the media library, captions in
-- both languages and alt text. Media marks a post posted with its link,
-- and the Desk shows what is due this week. Telegram posts stay automatic;
-- nothing posts to Instagram or LinkedIn directly.
--
-- The days the Society marks are data (content.days_marked, decisions.md's
-- one table). Each year content.plan_year() fills the calendar from them:
-- tier 1 a draft event, tier 2 a post (and, in Qirtas, an assignment),
-- tier 3 a post, greetings a post from their fixed design. A day in finals
-- week, on a Friday or in the summer drops to a post; at most two tier-2 or
-- tier-3 days a month, the rest waiting for the owner to choose. Each
-- entry shows its owner and a reminder to confirm the year's date.

create table content.days_marked (
  key text primary key check (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_en text not null,
  name_ar text not null,
  -- fixed: month and day; nth: the nth weekday of the month (nth -1 is
  -- the last full week); month: the whole month; approx: a part of the
  -- month the setter announces; moon and auib: dates from AUIB's calendar.
  rule text not null check (rule in ('fixed', 'nth', 'month', 'approx', 'moon', 'auib')),
  month integer check (month between 1 and 12),
  day integer check (day between 1 and 31),
  nth integer,
  weekday integer check (weekday between 0 and 6),
  approx_en text,
  approx_ar text,
  set_by text,
  tier text not null check (tier in ('1', '2', '3', 'greeting')),
  with_student_life boolean not null default false,
  owner_role text not null references access.roles (key),
  sort integer not null default 0
);

create index days_marked_owner_role_idx on content.days_marked (owner_role);

alter table content.days_marked enable row level security;
create policy "No third-party apps" on content.days_marked
  as restrictive for all to authenticated
  using ((select private.client_allows('content')))
  with check ((select private.client_allows('content')));
create policy "Staff read the days marked" on content.days_marked
  for select to authenticated using ((select private.i_am_staff()));
grant select on content.days_marked to authenticated;
grant all on content.days_marked to service_role;

insert into content.days_marked
  (key, name_en, name_ar, rule, month, day, nth, weekday, approx_en, approx_ar, set_by, tier, with_student_life, owner_role, sort) values
('data-privacy-day', 'Data Privacy Day', 'يوم خصوصية البيانات', 'fixed', 1, 28, null, null, null, null, 'National Cybersecurity Alliance', '3', false, 'media_director', 1),
('world-read-aloud-day', 'World Read Aloud Day', 'اليوم العالمي للقراءة بصوت عالٍ', 'approx', 2, null, null, null, 'early February', 'مطلع شباط', 'LitWorld', '1', false, 'events_director', 2),
('international-mother-language-day', 'International Mother Language Day', 'اليوم الدولي للغة الأم', 'fixed', 2, 21, null, null, null, null, 'UNESCO', '1', false, 'events_director', 3),
('student-press-freedom-day', 'Student Press Freedom Day', 'يوم حرية الصحافة الطلابية', 'approx', 2, null, null, null, 'late February', 'أواخر شباط', 'Student Press Law Center', '2', false, 'eic', 4),
('sunshine-week', 'Sunshine Week', 'أسبوع الشفافية', 'approx', 3, null, null, null, 'mid-March', 'منتصف آذار', 'News Leaders Association', '2', false, 'eic', 5),
('world-poetry-day', 'World Poetry Day', 'اليوم العالمي للشعر', 'fixed', 3, 21, null, null, null, null, 'UNESCO', '1', false, 'eic', 6),
('world-theatre-day', 'World Theatre Day', 'اليوم العالمي للمسرح', 'fixed', 3, 27, null, null, null, null, 'International Theatre Institute', '1', false, 'artistic_director', 7),
('earth-hour', 'Earth Hour', 'ساعة الأرض', 'approx', 3, null, null, null, 'late March', 'أواخر آذار', 'WWF', '1', false, 'events_director', 8),
('national-poetry-month', 'National Poetry Month, with Poem in Your Pocket Day', 'شهر الشعر، مع يوم «قصيدة في جيبك»', 'month', 4, null, null, null, null, null, 'Academy of American Poets', '2', false, 'eic', 9),
('its-on-us-week', 'It’s On Us week of action', 'أسبوع «إنها مسؤوليتنا»', 'approx', 4, null, null, null, 'April', 'نيسان', 'It’s On Us', '1', true, 'membership_director', 10),
('earth-day', 'Earth Day', 'يوم الأرض', 'fixed', 4, 22, null, null, null, null, 'EarthDay.org', '1', false, 'events_director', 11),
('world-book-day', 'World Book and Copyright Day', 'اليوم العالمي للكتاب وحقوق المؤلف', 'fixed', 4, 23, null, null, null, null, 'UNESCO', '1', false, 'events_director', 12),
('spj-ethics-week', 'SPJ Ethics Week', 'أسبوع أخلاقيات الصحافة', 'approx', 4, null, null, null, 'late April', 'أواخر نيسان', 'Society of Professional Journalists', '2', false, 'eic', 13),
('world-press-freedom-day', 'World Press Freedom Day', 'اليوم العالمي لحرية الصحافة', 'fixed', 5, 3, null, null, null, null, 'UNESCO', '2', false, 'eic', 14),
('global-accessibility-awareness-day', 'Global Accessibility Awareness Day', 'اليوم العالمي للتوعية بإمكانية الوصول', 'nth', 5, null, 3, 4, null, null, 'GAAD Foundation', '3', false, 'media_director', 15),
('world-photography-day', 'World Photography Day', 'اليوم العالمي للتصوير', 'fixed', 8, 19, null, null, null, null, 'World Photography Day', '3', false, 'media_director', 16),
('international-literacy-day', 'International Literacy Day', 'اليوم الدولي لمحو الأمية', 'fixed', 9, 8, null, null, null, null, 'UNESCO', '2', false, 'eic', 17),
('world-cleanup-day', 'World Cleanup Day', 'اليوم العالمي للتنظيف', 'nth', 9, null, 3, 6, null, null, 'Let’s Do It World', '1', true, 'events_director', 18),
('hazing-prevention-week', 'National Hazing Prevention Week', 'أسبوع الوقاية من التنمّر في الاستقبال', 'nth', 9, null, -1, 0, null, null, 'HazingPrevention.Org', '1', true, 'membership_director', 19),
('banned-books-week', 'Banned Books Week', 'أسبوع الكتب المحظورة', 'approx', 9, null, null, null, 'late September', 'أواخر أيلول', 'the Banned Books Week Coalition', '1', false, 'events_director', 20),
('international-translation-day', 'International Translation Day', 'اليوم الدولي للترجمة', 'fixed', 9, 30, null, null, null, null, 'the United Nations', '2', false, 'eic', 21),
('cybersecurity-awareness-month', 'Cybersecurity Awareness Month', 'شهر التوعية بالأمن السيبراني', 'month', 10, null, null, null, null, null, 'CISA and the National Cybersecurity Alliance', '3', false, 'media_director', 22),
('world-mental-health-day', 'World Mental Health Day', 'اليوم العالمي للصحة النفسية', 'fixed', 10, 10, null, null, null, null, 'WHO', '3', false, 'media_director', 23),
('national-day-on-writing', 'National Day on Writing', 'اليوم الوطني للكتابة', 'fixed', 10, 20, null, null, null, null, 'National Council of Teachers of English', '1', false, 'eic', 24),
('free-speech-week', 'Free Speech Week', 'أسبوع حرية التعبير', 'nth', 10, null, 3, 0, null, null, 'Free Speech Week', '2', false, 'eic', 25),
('day-of-persons-with-disabilities', 'International Day of Persons with Disabilities', 'اليوم الدولي للأشخاص ذوي الإعاقة', 'fixed', 12, 3, null, null, null, null, 'the United Nations', '3', false, 'media_director', 26),
('international-volunteer-day', 'International Volunteer Day', 'اليوم الدولي للمتطوعين', 'fixed', 12, 5, null, null, null, null, 'the United Nations', '3', false, 'membership_director', 27),
('arabic-language-day', 'Arabic Language Day', 'اليوم العالمي للغة العربية', 'fixed', 12, 18, null, null, null, null, 'UNESCO', '1', false, 'events_director', 28),
('nowruz', 'Nowruz', 'نوروز', 'fixed', 3, 21, null, null, null, null, null, 'greeting', false, 'media_director', 29),
('eids', 'Eid al-Fitr and Eid al-Adha', 'عيد الفطر وعيد الأضحى', 'moon', null, null, null, null, null, null, null, 'greeting', false, 'media_director', 30),
('christmas', 'Christmas', 'عيد الميلاد', 'fixed', 12, 25, null, null, null, null, null, 'greeting', false, 'media_director', 31),
('auib-occasions', 'AUIB’s own occasions: the first day of each semester, finals, commencement', 'مناسبات الجامعة: أول يوم في كل فصل، والامتحانات النهائية، وحفل التخرج', 'auib', null, null, null, null, null, null, 'AUIB', 'greeting', false, 'media_director', 32);

-- The day a rule falls on in a year; null where it isn't known ahead
-- (an announced part of the month, the moon, AUIB's own dates).
create function private.day_marked_on(d content.days_marked, year integer)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  first date;
  last date;
  result date;
begin
  if d.rule = 'fixed' then
    return make_date(year, d.month, d.day);
  elsif d.rule = 'month' then
    return make_date(year, d.month, 1);
  elsif d.rule = 'nth' and d.nth > 0 then
    first := make_date(year, d.month, 1);
    result := first + ((d.weekday - extract(dow from first)::integer + 7) % 7);
    return result + (d.nth - 1) * 7;
  elsif d.rule = 'nth' and d.nth = -1 then
    -- The last full week (Sunday to Saturday) of the month: its Sunday.
    last := (make_date(year, d.month, 1) + interval '1 month - 1 day')::date;
    result := last - ((extract(dow from last)::integer + 1) % 7);
    return result - 6;
  end if;
  return null;
end;
$$;

create table content.calendar_entries (
  id uuid primary key default gen_random_uuid(),
  publish_on date not null,
  channel text not null default 'instagram'
    check (channel in ('instagram', 'linkedin', 'telegram', 'website')),
  status text not null default 'planned'
    check (status in ('choose', 'planned', 'ready', 'posted', 'skipped')),
  title_en text not null check (char_length(title_en) between 1 and 200),
  title_ar text not null check (char_length(title_ar) between 1 and 200),
  caption_en text check (char_length(caption_en) <= 2200),
  caption_ar text check (char_length(caption_ar) <= 2200),
  alt_en text check (char_length(alt_en) <= 500),
  alt_ar text check (char_length(alt_ar) <= 500),
  media_item_id uuid references content.media_items (id) on delete set null,
  event_id uuid references events.events (id) on delete set null,
  day_key text references content.days_marked (key) on delete set null,
  year integer,
  -- Tier 1's event, tier 2's post and piece, tier 3's post, a greeting.
  kind text not null default 'post' check (kind in ('post', 'event', 'greeting')),
  owner_role text references access.roles (key),
  -- The setter announces the date each year: confirm it before posting.
  confirm_date boolean not null default false,
  note text check (char_length(note) <= 500),
  post_url text check (post_url ~ '^https://'),
  posted_at timestamptz,
  posted_by uuid references auth.users (id) on delete set null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (day_key, year, channel)
);
create index calendar_entries_publish_on_idx on content.calendar_entries (publish_on);
create index calendar_entries_media_item_id_idx on content.calendar_entries (media_item_id);
create index calendar_entries_event_id_idx on content.calendar_entries (event_id);
create index calendar_entries_owner_role_idx on content.calendar_entries (owner_role);
create index calendar_entries_posted_by_idx on content.calendar_entries (posted_by);
create index calendar_entries_created_by_idx on content.calendar_entries (created_by);

alter table content.calendar_entries enable row level security;
create policy "No third-party apps" on content.calendar_entries
  as restrictive for all to authenticated
  using ((select private.client_allows('content')))
  with check ((select private.client_allows('content')));
create policy "Staff read the calendar" on content.calendar_entries
  for select to authenticated using ((select private.i_am_staff()));
create policy "Media adds to the calendar" on content.calendar_entries
  for insert to authenticated
  with check ((select private.has_permission_anywhere('content.manage')));
create policy "Media keeps the calendar" on content.calendar_entries
  for update to authenticated
  using ((select private.has_permission_anywhere('content.manage')))
  with check ((select private.has_permission_anywhere('content.manage')));
create policy "Media removes calendar entries" on content.calendar_entries
  for delete to authenticated
  using ((select private.has_permission_anywhere('content.manage')));
grant select, insert, update, delete on content.calendar_entries to authenticated;
grant all on content.calendar_entries to service_role;

create trigger log_activity
  after insert or update or delete on content.calendar_entries
  for each row execute function private.log_activity();

-- Whether a day falls in finals week (the semester's last seven days), on
-- a Friday, or in the summer (outside every semester).
create function private.drops_to_post(on_day date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select extract(dow from on_day) = 5
    or exists (select 1 from core.semesters s
               where on_day between s.ends_on - 6 and s.ends_on)
    or not exists (select 1 from core.semesters s
                   where on_day between s.starts_on and s.ends_on);
$$;

-- Fills a year's calendar from the days marked. Run again, it adds only
-- what is missing.
create function private.plan_year(year integer)
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
  end loop;
  return added;
end;
$$;
revoke all on function private.plan_year(integer) from public, anon;
revoke all on function private.drops_to_post(date) from public, anon;
revoke all on function private.day_marked_on(content.days_marked, integer) from public, anon;

create function content.plan_year(year integer)
returns integer language sql security invoker set search_path = ''
as $$ select private.plan_year(year) $$;
revoke all on function content.plan_year(integer) from public, anon;
grant execute on function private.plan_year(integer), content.plan_year(integer),
  private.drops_to_post(date), private.day_marked_on(content.days_marked, integer)
  to authenticated;

select private.build_api();
