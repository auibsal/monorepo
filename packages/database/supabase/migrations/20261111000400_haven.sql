-- Haven, Qirtas's pilot Edition (decisions §14, §17): «ملاذ», on dreams
-- and memories. Write for Qirtas takes Letters and Gallery for now, for
-- Haven's call. The Editor-in-Chief sets the dates, so the call names no
-- deadline yet.

update journal.issues
set slug = 'haven',
    title_en = 'Haven',
    title_ar = 'ملاذ',
    theme_en = 'Dreams and memories',
    theme_ar = 'الأحلام والذكريات'
where slug = 'edition-1' and status = 'draft';

-- Haven's call, beside the standing call (which stays, for the sections
-- that reopen later): Letters and Gallery, read blind, no deadline yet.
insert into journal.calls (issue_id, title_en, title_ar, theme_en, theme_ar, opens_at, closes_at,
  max_per_person, is_published, desks)
select i.id, 'Haven', 'ملاذ',
  'A poem, a short story, a creative essay or an artwork, about a memory, a dream or both.',
  'قصيدة أو قصة قصيرة أو مقالة إبداعية أو عمل فني، عن ذكرى أو حلم أو كليهما.',
  now(), '2100-01-01T00:00:00Z', 6, true, array['letters', 'gallery']::journal.desk[]
from journal.issues i
where i.slug = 'haven'
  and not exists (select 1 from journal.calls c where c.issue_id = i.id);
