-- Qirtas's themed collections are Editions again (decisions.md, Retired
-- names: "Qirtas's issues", "Issue 1" and "pilot issue" are retired; Haven
-- is the pilot). Only the Sunday Paper keeps issues. The table keeps its
-- name (journal.issues); its words change.

comment on column journal.issues.pilot is
  'The pilot (Haven, fall 2026) carries no number; Edition 1 is the first numbered Edition (decisions.md, Qirtas).';

-- Haven's call, still a draft: the Edition's words, the submit address and
-- Qirtas's line as the glossary gives it.
update core.announcements
set title_en = 'Haven: write for Qirtas’s pilot Edition',
    title_ar = '«ملاذ»: اكتب للإصدار التجريبي من قرطاس',
    body_en = replace(replace(body_en,
      'the first issue of Qirtas', 'Haven, the pilot Edition of Qirtas'),
      'auibsal.org/qirtas/write', 'auibsal.org/qirtas/submit'),
    body_ar = replace(replace(replace(body_ar,
      'العدد الأول من «قرطاس»', '«ملاذ»، الإصدار التجريبي من قرطاس'),
      'صحيفة الجامعة للأخبار والآداب والفنون', 'صحيفة الجامعة الأمريكية للأخبار والآداب والفن'),
      'auibsal.org/ar/qirtas/write', 'auibsal.org/ar/qirtas/submit'),
    link_path = '/qirtas/submit'
where sent_at is null and link_path = '/qirtas/write';
