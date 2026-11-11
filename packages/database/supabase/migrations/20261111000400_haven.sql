-- Haven, Qirtas's pilot Edition (decisions §14, §17): «ملاذ», on dreams
-- and memories. Write for Qirtas takes Letters and Gallery for now, as
-- Haven's call; the open all-year call becomes it. The Editor-in-Chief
-- sets the dates, so the call names no deadline yet.

update journal.issues
set slug = 'haven',
    title_en = 'Haven',
    title_ar = 'ملاذ',
    theme_en = 'Dreams and memories',
    theme_ar = 'الأحلام والذكريات'
where slug = 'edition-1' and status = 'draft';

update journal.calls c
set issue_id = (select i.id from journal.issues i where i.slug = 'haven'),
    title_en = 'Haven',
    title_ar = 'ملاذ',
    theme_en = 'A poem, a short story, a creative essay or an artwork, about a memory, a dream or both.',
    theme_ar = 'قصيدة أو قصة قصيرة أو مقالة إبداعية أو عمل فني، عن ذكرى أو حلم أو كليهما.',
    desks = array['letters', 'gallery']::journal.desk[]
where c.title_en = 'Qirtas, all year';
