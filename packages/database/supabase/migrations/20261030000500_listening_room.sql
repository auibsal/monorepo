-- The brand and the names (owner, Oct 30, 2026; claude/decisions.md):
--
-- * Six programs, in this order: Second Chapter, Typewriter Tour, the
--   Salon, Book Circle, Open Pages and the Listening Room (new). The Company
--   is the Society's theater company, not a program; its row stays live
--   (its page, its calendar and its roles read it) and the site leaves it
--   out of every list of programs (`programmes.notPrograms`).
-- * The Tuesday series meet every fourth week. The Listening Room takes the
--   Salon's March 16 and May 11 dates.
-- * Arabic names (needs-native-review): the Salon «الصالون», the Artistic
--   Director «المدير الفني», the Editor of Qirtas «محرّر قرطاس».
-- * The Qirtas Prizes' own names are proposed: the public pages show only
--   "the Qirtas Prizes" until the owner confirms them.

-- ── The programs ────────────────────────────────────────────────────────────

insert into core.programmes (slug, kind, name_en, name_ar, summary_en, summary_ar,
  rhythm_en, rhythm_ar, sort, is_active)
values ('listening-room', 'format', 'Listening Room', 'غرفة الاستماع',
  'An album or recording played in full, then talked about: music, spoken word, recorded poetry. Once a term, a live set by student musicians.',
  'ألبوم أو تسجيل يُستمع إليه كاملًا، ثم يُتحدَّث عنه: موسيقى وكلمة منطوقة وشعر مسجَّل. ومرة كل فصل، عزف حي لموسيقيين من الطلبة.',
  'Tuesdays, every fourth week, 4:00–5:30 PM.',
  'أيام الثلاثاء، كل أربعة أسابيع، من 4:00 إلى 5:30 مساءً.',
  90, true)
on conflict (slug) do nothing;

update core.programmes set
  rhythm_en = 'Tuesdays, every fourth week, 4:00–5:30 PM.',
  rhythm_ar = 'أيام الثلاثاء، كل أربعة أسابيع، من 4:00 إلى 5:30 مساءً.'
where slug in ('salon', 'book-circle', 'open-pages');

update core.programmes set name_ar = 'الصالون' where slug = 'salon';

-- The order the site lists them in; the Company after the six.
update core.programmes p set sort = v.sort
from (values
  ('second-chapter', 30), ('typewriter-tour', 40), ('salon', 50),
  ('book-circle', 60), ('open-pages', 70), ('listening-room', 80), ('company', 100)
) as v (slug, sort)
where p.slug = v.slug;

-- The Listening Room's first two sessions, which were the Salon's.
update events.events e set
  programme_id = (select id from core.programmes where slug = 'listening-room'),
  slug = replace(e.slug, 'salon-', 'listening-room-'),
  title_en = 'Listening Room',
  title_ar = 'غرفة الاستماع'
where e.slug in ('salon-2027-03-16', 'salon-2027-05-11');

-- ── The Council ─────────────────────────────────────────────────────────────

-- The Company's lead is titled Artistic Director in both languages.
update access.role_assignments set title_ar = 'المدير الفني'
where title_en = 'Artistic Director';

-- ── The Qirtas Prizes ───────────────────────────────────────────────────────

insert into core.settings (key, value, is_public)
values ('journal.prize_names_public', 'false'::jsonb, true)
on conflict (key) do nothing;

-- ── Voices is «آراء» in Arabic (NAMES.md) ───────────────────────────────────

update access.roles set name_ar = 'محرّر آراء' where key = 'voices_editor';
update programmes.openings set title_ar = 'محرّر آراء' where title_en = 'Voices Editor';
update journal.prizes set for_ar = 'النقد والرأي، في قسم آراء.' where key = 'jahiz';

-- ── The Tuesday sessions' summaries ─────────────────────────────────────────

update events.events e set
  summary_en = 'A guest, three readings, tea and conversation.',
  summary_ar = 'ضيف وثلاث قراءات وشاي وحديث.'
where e.summary_en = 'A guest, three readings, tea and conversation, every third Tuesday.'
  and e.programme_id = (select id from core.programmes where slug = 'salon');

update events.events e set
  summary_en = p.summary_en,
  summary_ar = p.summary_ar
from core.programmes p
where p.slug = 'listening-room' and e.programme_id = p.id
  and e.summary_en = 'A guest, three readings, tea and conversation, every third Tuesday.';
