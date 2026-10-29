-- Six programs, no groupings (owner, Oct 29, 2026): Second Chapter, the
-- Typewriter Tour, the Company, the Salon, Book Circle and Open Pages. The
-- flagships, the Evenings and the Specials are gone; each program shows its
-- rhythm in one plain line (core.programmes.rhythm_en/_ar).
--
-- 1. The Majlis becomes the Salon (slug salon).
-- 2. Three programs fold into their parents, as Open Stage folded into the
--    Company (20261027000000): Munazara into the Salon, Mutanabbi Friday
--    into Book Circle, Bad Poetry Night into Open Pages. Everything that
--    named them now names the parent (events, openings, rotas, service
--    records and the rest); their sessions become ordinary events of the
--    parent with plain titles; then the programs and their repeat rules are
--    removed and the names retired. Roles held for them end.
-- 3. Next Stop leaves the programs: it is Qirtas's video show now. Its row
--    stays, unpublished, so its episodes, reels and care requests keep
--    their place.
-- 4. The Tuesday series, 4:00–5:30 PM, this year (the room is still to be
--    named: TODO(content), listed in PROGRESS.md).

-- ── The rhythm line ─────────────────────────────────────────────────────────

alter table core.programmes
  add column rhythm_en text check (char_length(rhythm_en) <= 200),
  add column rhythm_ar text check (char_length(rhythm_ar) <= 200);

comment on column core.programmes.rhythm_en is
  'When the program meets, in one plain line (the Salon: "Every third Tuesday, 4:00–5:30 PM.").';

-- ── 1. The Salon ────────────────────────────────────────────────────────────

update core.programmes set
  slug = 'salon',
  name_en = 'The Salon',
  name_ar = 'الصالون الأدبي',
  summary_en = 'A guest, three readings, tea and conversation, every third Tuesday.',
  summary_ar = 'ضيف وثلاث قراءات وشاي وحديث، كل ثالث ثلاثاء.'
where slug = 'majlis';

-- ── 2. Folds ────────────────────────────────────────────────────────────────

do $$
declare
  fold record;
  child uuid;
  parent uuid;
  ref record;
begin
  for fold in
    select * from (values
      ('munazara', 'salon', 'Munazara', 'المناظرة', 'A literary debate', 'مناظرة أدبية'),
      ('mutanabbi-friday', 'book-circle', 'Mutanabbi Friday', 'جمعة المتنبي', 'Al-Mutanabbi Street', 'شارع المتنبي'),
      ('bad-poetry-night', 'open-pages', 'Bad Poetry Night', 'ليلة الشعر الرديء', 'The worst poem', 'أسوأ قصيدة')
    ) as f (child_slug, parent_slug, old_en, old_ar, plain_en, plain_ar)
  loop
    child := (select id from core.programmes where slug = fold.child_slug);
    parent := (select id from core.programmes where slug = fold.parent_slug);
    if child is null or parent is null then
      continue;
    end if;

    -- Its repeat rule goes first (one per program; the parent keeps its own).
    delete from events.series_rules where programme_id = child;

    -- Its sessions become ordinary events of the parent, with plain titles.
    update events.events set
      title_en = regexp_replace(title_en, fold.old_en, fold.plain_en, 'gi'),
      title_ar = replace(coalesce(title_ar, ''), fold.old_ar, fold.plain_ar)
    where programme_id = child;

    -- Every row that names it now names the parent.
    for ref in
      select c.conrelid::regclass as tbl, a.attname as col
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
      where c.contype = 'f'
        and c.confrelid = 'core.programmes'::regclass
        and array_length(c.conkey, 1) = 1
    loop
      execute format('update %s set %I = $1 where %I = $2', ref.tbl, ref.col, ref.col)
        using parent, child;
    end loop;

    -- Roles held for it end (they are not carried to the parent).
    update access.role_assignments set ends_at = now()
    where scope_type = 'programme' and scope_id = child
      and (ends_at is null or ends_at > now());

    delete from core.programmes where id = child;
  end loop;
end;
$$;

-- ── 3. Next Stop, Qirtas's video show ───────────────────────────────────────

delete from events.series_rules
where programme_id = (select id from core.programmes where slug = 'next-stop');

update core.programmes set
  is_active = false,
  summary_en = 'Qirtas''s video show about campus. Be a guest, or join the crew.',
  summary_ar = 'برنامج قرطاس المرئي عن الحرم الجامعي. كن ضيفًا، أو انضم إلى الفريق.'
where slug = 'next-stop';

-- ── Six programs, each with its rhythm ──────────────────────────────────────

update core.programmes p set
  summary_en = v.summary_en,
  summary_ar = v.summary_ar,
  rhythm_en = v.rhythm_en,
  rhythm_ar = v.rhythm_ar,
  sort = v.sort
from (values
  ('second-chapter',
    'Donate books, volunteer at the fair, keep a child warm, with our charity partner.',
    'تبرّع بالكتب، وتطوّع في المعرض، وأدفئ طفلًا، مع شريكنا الخيري.',
    'Every fall.', 'كل خريف.', 30),
  ('typewriter-tour',
    'Six words, one typewriter, the whole campus.',
    'ست كلمات، وآلة كاتبة واحدة، والحرم الجامعي كله.',
    'Every spring.', 'كل ربيع.', 40),
  ('company',
    'The Society''s theater company, cast from open auditions.',
    'فرقة الجمعية المسرحية، يُختار ممثلوها من تجارب أداء مفتوحة.',
    'One staged production a semester.', 'عمل مسرحي واحد كل فصل.', 50),
  ('salon',
    'A guest, three readings, tea and conversation, every third Tuesday.',
    'ضيف وثلاث قراءات وشاي وحديث، كل ثالث ثلاثاء.',
    'Every third Tuesday, 4:00–5:30 PM.', 'كل ثالث ثلاثاء، من 4:00 إلى 5:30 مساءً.', 60),
  ('book-circle',
    'One book a month, Arabic and English in turn.',
    'كتاب واحد كل شهر، بالعربية والإنجليزية بالتناوب.',
    'A Tuesday a month, 4:00–5:30 PM, and a Friday on al-Mutanabbi Street.',
    'ثلاثاء كل شهر، من 4:00 إلى 5:30 مساءً، وجمعة في شارع المتنبي.', 70),
  ('open-pages',
    'Writing workshops with editors on hand.',
    'ورش كتابة بحضور المحررين.',
    'A Tuesday a month, 4:00–5:30 PM.', 'ثلاثاء كل شهر، من 4:00 إلى 5:30 مساءً.', 80)
) as v (slug, summary_en, summary_ar, rhythm_en, rhythm_ar, sort)
where p.slug = v.slug;

-- ── 4. The Tuesday series, 4:00–5:30 PM (Baghdad) ──────────────────────────

insert into events.events (
  slug, programme_id, title_en, title_ar, summary_en, summary_ar,
  starts_at, ends_at, entry, status, published_at
)
select
  p.slug || '-' || s.day::text, p.id, p.name_en, p.name_ar, p.summary_en, p.summary_ar,
  (s.day + time '16:00') at time zone 'Asia/Baghdad',
  (s.day + s.ends) at time zone 'Asia/Baghdad',
  'open', 'published', now()
from (values
  ('open-pages', date '2026-11-17', time '17:30'),
  ('open-pages', date '2027-03-02', time '17:30'),
  ('open-pages', date '2027-03-30', time '18:00'),
  ('open-pages', date '2027-05-04', time '17:30'),
  ('salon', date '2026-12-01', time '17:30'),
  ('salon', date '2027-02-16', time '17:30'),
  ('salon', date '2027-03-16', time '17:30'),
  ('salon', date '2027-04-06', time '17:30'),
  ('salon', date '2027-05-11', time '17:30'),
  ('book-circle', date '2027-02-23', time '17:30'),
  ('book-circle', date '2027-03-23', time '17:30'),
  ('book-circle', date '2027-04-27', time '17:30')
) as s (programme, day, ends)
join core.programmes p on p.slug = s.programme
on conflict (slug) do nothing;

-- Book Circle's Friday on al-Mutanabbi Street, April 9: a draft until its
-- time is set (TODO(content), listed in PROGRESS.md); the trip needs the
-- University's approval.
insert into events.events (
  slug, programme_id, title_en, title_ar, summary_en, summary_ar,
  venue_en, venue_ar, starts_at, ends_at, entry, status
)
select
  'book-circle-2027-04-09', p.id,
  'Book Circle on al-Mutanabbi Street', 'حلقة الكتاب في شارع المتنبي',
  'A trip to Baghdad''s book street (with approval).',
  'رحلة إلى شارع الكتب في بغداد (بعد الموافقة).',
  'Al-Mutanabbi Street, Baghdad', 'شارع المتنبي، بغداد',
  (date '2027-04-09' + time '10:00') at time zone 'Asia/Baghdad',
  (date '2027-04-09' + time '14:00') at time zone 'Asia/Baghdad',
  'rsvp', 'draft'
from core.programmes p where p.slug = 'book-circle'
on conflict (slug) do nothing;
