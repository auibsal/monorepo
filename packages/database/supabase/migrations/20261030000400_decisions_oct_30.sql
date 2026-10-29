-- The decisions of Oct 30, 2026, for the programs: each program's rhythm
-- in one plain line, and the once-a-term items in its summary. Open Pages
-- on March 30 is the worst-poem contest; Book Circle's Friday on
-- al-Mutanabbi Street is April 9, with April 23 as the second date (both
-- drafts until Student Life approves the trip in writing).

update core.programmes set
  rhythm_en = 'Every November: a book drive, then the fair.',
  rhythm_ar = 'كل تشرين الثاني: جمع الكتب، ثم المعرض.'
where slug = 'second-chapter';

update core.programmes set
  rhythm_en = 'Every March, after Eid.',
  rhythm_ar = 'كل آذار، بعد العيد.'
where slug = 'typewriter-tour';

update core.programmes set
  rhythm_en = 'Its own open nights, auditions and productions.',
  rhythm_ar = 'أمسياتها المفتوحة وتجارب الأداء والعروض.'
where slug = 'company';

update core.programmes set
  rhythm_en = 'Tuesdays, every third week, 4:00–5:30 PM.',
  rhythm_ar = 'أيام الثلاثاء، كل ثلاثة أسابيع، من 4:00 إلى 5:30 مساءً.',
  summary_en = 'A guest, three readings, tea and conversation. Once a term, from fall 2027, a debate.',
  summary_ar = 'ضيف وثلاث قراءات وشاي وحديث. ومرة كل فصل، ابتداءً من خريف 2027، مناظرة.'
where slug = 'salon';

update core.programmes set
  rhythm_en = 'Tuesdays, every third week, 4:00–5:30 PM.',
  rhythm_ar = 'أيام الثلاثاء، كل ثلاثة أسابيع، من 4:00 إلى 5:30 مساءً.',
  summary_en = 'One book a month, Arabic and English in turn. Once a term, a Friday morning on al-Mutanabbi Street.',
  summary_ar = 'كتاب كل شهر، بالعربية والإنجليزية بالتناوب. ومرة كل فصل، صباح جمعة في شارع المتنبي.'
where slug = 'book-circle';

update core.programmes set
  rhythm_en = 'Tuesdays, every third week, 4:00–5:30 PM.',
  rhythm_ar = 'أيام الثلاثاء، كل ثلاثة أسابيع، من 4:00 إلى 5:30 مساءً.',
  summary_en = 'A writing workshop, with editors on hand. Once a term, a worst-poem contest.',
  summary_ar = 'ورشة كتابة، والمحررون حاضرون. ومرة كل فصل، مسابقة أسوأ قصيدة.'
where slug = 'open-pages';

update events.events set
  title_en = 'Open Pages: the worst-poem contest',
  title_ar = 'صفحات مفتوحة: مسابقة أسوأ قصيدة'
where slug = 'open-pages-2027-03-30';

-- The second date for the Friday, a draft like the first.
insert into events.events (slug, programme_id, title_en, title_ar, starts_at, ends_at,
  members_only, capacity, entry, status)
select 'book-circle-2027-04-23', e.programme_id, e.title_en, e.title_ar,
  e.starts_at + interval '14 days', e.ends_at + interval '14 days',
  e.members_only, e.capacity, e.entry, 'draft'
from events.events e
where e.slug = 'book-circle-2027-04-09'
on conflict (slug) do nothing;

-- The worst-poem contest runs to 6:00 PM.
update events.events set
  ends_at = (date '2027-03-30' + time '18:00') at time zone 'Asia/Baghdad'
where slug = 'open-pages-2027-03-30';

-- ── The Qirtas Prizes: what each is for, and whom it is named for ──────────

alter table journal.prizes
  add column for_en text,
  add column for_ar text,
  add column named_for_en text,
  add column named_for_ar text;

update journal.prizes p set
  for_en = v.for_en, for_ar = v.for_ar, named_for_en = v.named_en, named_for_ar = v.named_ar
from (values
  ('mutanabbi',
    'The best body of work published in Qirtas in the year, in any section. The winner''s work is printed as a chapbook of 48 copies and launched in public.',
    'أفضل مجموعة أعمال نُشرت في قرطاس خلال العام، في أي قسم. وتُطبع أعمال الفائز في كتيّب من 48 نسخة يُطلق في أمسية عامة.',
    'Named for al-Mutanabbi, whose line gives the Society its motto.',
    'سُمّيت باسم المتنبي، الذي منح بيتُه الجمعيةَ شعارها.'),
  ('tabari', 'Reporting, in News.', 'التقارير، في قسم الأخبار.',
    'Named for al-Tabari, Baghdad''s great chronicler.',
    'سُمّيت باسم الطبري، مؤرخ بغداد الكبير.'),
  ('jahiz', 'Criticism and opinion, in Voices.', 'النقد والرأي، في قسم الأصوات.',
    'Named for al-Jahiz, master of the essay.',
    'سُمّيت باسم الجاحظ، سيد النثر.'),
  ('nazik', 'Poetry and prose, in Letters.', 'الشعر والنثر، في قسم الآداب.',
    'Named for Nazik al-Malaika, the Baghdad-born pioneer of free verse.',
    'سُمّيت باسم نازك الملائكة، ابنة بغداد ورائدة الشعر الحر.'),
  ('wasiti', 'Art and photography, in Gallery.', 'الفن والتصوير، في المعرض.',
    'Named for Yahya al-Wasiti, the Baghdad painter of the Maqamat.',
    'سُمّيت باسم يحيى الواسطي، رسّام المقامات البغدادي.'),
  ('ibn_al_haytham', 'Film and video, in Video.', 'الأفلام والفيديو، في قسم المرئيات.',
    'Named for Ibn al-Haytham, who explained the camera obscura.',
    'سُمّيت باسم ابن الهيثم، الذي شرح الحجرة المظلمة.')
) as v (key, for_en, for_ar, named_en, named_ar)
where p.key = v.key;
