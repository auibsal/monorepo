-- Presets for every kind (decisions.md, The site: "Presets"): openings,
-- Edition calls, announcements and letters each start from one, as events
-- do. Data, kept in the Diwan by the seat that owns the kind; these are
-- the first, to be changed there.
insert into core.presets (kind, key, title_en, title_ar, fields, sort) values
  ('opening', 'event-team', 'On the team for this event', 'في فريق هذه الفعالية',
    jsonb_build_object(
      'body_en', 'Help run the event: check-in, ushering or setting up. Pick a shift on the event’s page.',
      'body_ar', 'ساعد في إدارة الفعالية: التسجيل أو الإرشاد أو التجهيز. اختر نوبتك من صفحة الفعالية.'), 1),
  ('opening', 'qalam-mentor', 'Qalam mentor', 'مرشد «قلم»',
    jsonb_build_object(
      'body_en', 'Mentor a class of Qalam students through the semester, with the Qalam lead.',
      'body_ar', 'أرشد صفًا من طلبة «قلم» طوال الفصل الدراسي، مع مسؤول «قلم».'), 2),
  ('call', 'edition-call', 'Edition call', 'دعوة الإصدار',
    jsonb_build_object(
      'body_en', 'Send poems, prose and images on this Edition’s theme.',
      'body_ar', 'أرسل قصائد ونثرًا وصورًا في موضوع هذا الإصدار.'), 1),
  ('announcement', 'general-meeting', 'General meeting', 'اجتماع عام',
    jsonb_build_object(
      'body_en', 'Every member is invited to the general meeting. The agenda is on the meeting’s page.',
      'body_ar', 'كل الأعضاء مدعوون إلى الاجتماع العام. جدول الأعمال في صفحة الاجتماع.'), 1),
  ('announcement', 'roles-open', 'Roles are open', 'أدوار مفتوحة',
    jsonb_build_object(
      'body_en', 'New roles are open in the Society. See them on Get involved.',
      'body_ar', 'في الجمعية أدوار جديدة مفتوحة. تجدها في صفحة «شارك معنا».'), 2),
  ('letter', 'thanks', 'Thank you', 'شكرًا',
    jsonb_build_object(
      'body_en', 'Thank you for your service to the AUIB Society of Arts and Letters this year.',
      'body_ar', 'شكرًا على خدمتك لجمعية الفنون والآداب في الجامعة الأمريكية هذا العام.'), 1)
on conflict (kind, key) do nothing;
