-- Every event's address is its Notion Slug (owner, Nov 7, 2026). The events
-- made before the standard event still carried the retired names in their
-- addresses and titles (salon-, open-pages-, book-circle-,
-- listening-room-), the Founding Meeting among them. Before launch, so the
-- old addresses are simply gone: no redirects.
--
-- In production the Notion sync has already given each event its Slug, its
-- title and its text (written in Notion in both languages), so the renames
-- match nothing there; they keep every other database (local, CI, staging)
-- the same as production. The two fall pilots go back to draft everywhere.

create temporary table event_addresses (
  old_slug text primary key,
  new_slug text not null,
  title_en text not null,
  title_ar text not null,
  summary_en text not null,
  summary_ar text not null,
  body_en text not null,
  body_ar text not null
) on commit drop;

insert into event_addresses values
  ('open-pages-2026-11-17', 'writing-workshop-2026-11-17', 'Writing workshop', 'ورشة كتابة',
   'A writing workshop with editors on hand.', 'ورشة كتابة بحضور المحررين.',
   '<p>Bring a piece you’re working on, or start one here, with editors on hand to read and help.</p>',
   '<p>أحضِر نصًّا تعمل عليه أو ابدأ نصًّا جديدًا هنا، ومعك محررون يقرؤون ويساعدون.</p>'),
  ('open-pages-2027-03-02', 'writing-workshop-2027-03-02', 'Writing workshop', 'ورشة كتابة',
   'A writing workshop with editors on hand.', 'ورشة كتابة بحضور المحررين.',
   '<p>Bring a piece you’re working on, or start one here, with editors on hand to read and help.</p>',
   '<p>أحضِر نصًّا تعمل عليه أو ابدأ نصًّا جديدًا هنا، ومعك محررون يقرؤون ويساعدون.</p>'),
  ('open-pages-2027-05-04', 'writing-workshop-2027-05-04', 'Writing workshop', 'ورشة كتابة',
   'A writing workshop with editors on hand.', 'ورشة كتابة بحضور المحررين.',
   '<p>Bring a piece you’re working on, or start one here, with editors on hand to read and help.</p>',
   '<p>أحضِر نصًّا تعمل عليه أو ابدأ نصًّا جديدًا هنا، ومعك محررون يقرؤون ويساعدون.</p>'),
  ('salon-2026-12-01', 'reading-with-a-guest-2026-12-01', 'Reading with a guest', 'قراءة مع ضيف',
   'A guest, three readings, tea and conversation.', 'ضيف وثلاث قراءات وشاي وحديث.',
   '<p>A guest joins us for an afternoon of three readings, followed by tea and conversation.</p>',
   '<p>يحلّ علينا ضيف في عصرية من ثلاث قراءات، يعقبها شاي وحديث.</p>'),
  ('salon-2027-02-16', 'reading-with-a-guest-2027-02-16', 'Reading with a guest', 'قراءة مع ضيف',
   'A guest, three readings, tea and conversation.', 'ضيف وثلاث قراءات وشاي وحديث.',
   '<p>A guest joins us for an afternoon of three readings, followed by tea and conversation.</p>',
   '<p>يحلّ علينا ضيف في عصرية من ثلاث قراءات، يعقبها شاي وحديث.</p>'),
  ('salon-2027-04-06', 'reading-with-a-guest-2027-04-06', 'Reading with a guest', 'قراءة مع ضيف',
   'A guest, three readings, tea and conversation.', 'ضيف وثلاث قراءات وشاي وحديث.',
   '<p>A guest joins us for an afternoon of three readings, followed by tea and conversation.</p>',
   '<p>يحلّ علينا ضيف في عصرية من ثلاث قراءات، يعقبها شاي وحديث.</p>'),
  ('book-circle-2027-02-23', 'book-discussion-2027-02-23', 'Book discussion', 'نقاش كتاب',
   'One book, read ahead and talked over together.', 'كتاب واحد نقرؤه مسبقًا ثم نتحدث عنه معًا.',
   '<p>We read one book ahead of time and talk it over together, with books in Arabic and English in turn.</p>',
   '<p>نقرأ كتابًا واحدًا مسبقًا ثم نتحدث عنه معًا، والكتب بالعربية والإنجليزية بالتناوب.</p>'),
  ('book-circle-2027-03-23', 'book-discussion-2027-03-23', 'Book discussion', 'نقاش كتاب',
   'One book, read ahead and talked over together.', 'كتاب واحد نقرؤه مسبقًا ثم نتحدث عنه معًا.',
   '<p>We read one book ahead of time and talk it over together, with books in Arabic and English in turn.</p>',
   '<p>نقرأ كتابًا واحدًا مسبقًا ثم نتحدث عنه معًا، والكتب بالعربية والإنجليزية بالتناوب.</p>'),
  ('book-circle-2027-04-27', 'book-discussion-2027-04-27', 'Book discussion', 'نقاش كتاب',
   'One book, read ahead and talked over together.', 'كتاب واحد نقرؤه مسبقًا ثم نتحدث عنه معًا.',
   '<p>We read one book ahead of time and talk it over together, with books in Arabic and English in turn.</p>',
   '<p>نقرأ كتابًا واحدًا مسبقًا ثم نتحدث عنه معًا، والكتب بالعربية والإنجليزية بالتناوب.</p>'),
  ('listening-room-2027-03-16', 'listening-session-2027-03-16', 'Listening session', 'جلسة استماع',
   'An album or recording played in full, then talked about.', 'ألبوم أو تسجيل يُستمع إليه كاملًا، ثم يُتحدَّث عنه.',
   '<p>An album or recording played in full, then talked about: music, spoken word or recorded poetry.</p>',
   '<p>ألبوم أو تسجيل يُستمع إليه كاملًا، ثم يُتحدَّث عنه: موسيقى أو كلمة منطوقة أو شعر مسجَّل.</p>'),
  ('listening-room-2027-05-11', 'listening-session-2027-05-11', 'Listening session', 'جلسة استماع',
   'An album or recording played in full, then talked about.', 'ألبوم أو تسجيل يُستمع إليه كاملًا، ثم يُتحدَّث عنه.',
   '<p>An album or recording played in full, then talked about: music, spoken word or recorded poetry.</p>',
   '<p>ألبوم أو تسجيل يُستمع إليه كاملًا، ثم يُتحدَّث عنه: موسيقى أو كلمة منطوقة أو شعر مسجَّل.</p>'),
  ('open-pages-2027-03-30', 'founding-meeting-2027-03-30', 'Founding Meeting', 'الاجتماع التأسيسي',
   'The Society’s Founding Meeting. Members adopt the founding documents and receive the founding team’s report.',
   'الاجتماع التأسيسي للجمعية. يعتمد فيه الأعضاء الوثائق التأسيسية ويتسلّمون تقرير الفريق المؤسِّس.',
   '<p>Members meet to adopt the Society’s founding documents and to receive the founding team’s report.</p><p>Book a place to attend.</p>',
   '<p>يجتمع الأعضاء لاعتماد الوثائق التأسيسية للجمعية وتسلّم تقرير الفريق المؤسِّس.</p><p>احجز مكانك للحضور.</p>'),
  ('book-circle-2027-04-23', 'trip-to-al-mutanabbi-street-2027-04-23', 'Trip to al-Mutanabbi Street', 'رحلة إلى شارع المتنبي',
   'A morning among the secondhand bookstalls of al-Mutanabbi Street, Baghdad’s book market, for Earth Day. Backup date: Friday, April 30, 2027.',
   'صباح بين بسطات الكتب المستعملة في شارع المتنبي، سوق الكتب في بغداد، في يوم الأرض. الموعد البديل: الجمعة، 30 نيسان 2027.',
   '<p>A morning among the secondhand bookstalls of al-Mutanabbi Street, Baghdad’s book market, for Earth Day. If the day can’t go ahead, the backup date is Friday, April 30, 2027.</p><p>The trip is off campus: book a place, and give your consent for the trip on the site before the day.</p>',
   '<p>صباح بين بسطات الكتب المستعملة في شارع المتنبي، سوق الكتب في بغداد، في يوم الأرض. وإن تعذّر الموعد، فالموعد البديل الجمعة، 30 نيسان 2027.</p><p>الرحلة خارج الحرم الجامعي: احجز مكانك، وقدّم موافقتك على الرحلة عبر الموقع قبل يومها.</p>');

update events.events e
set slug = a.new_slug,
  title_en = a.title_en,
  title_ar = a.title_ar,
  summary_en = a.summary_en,
  summary_ar = a.summary_ar,
  body_en = a.body_en,
  body_ar = a.body_ar
from event_addresses a
where e.slug = a.old_slug;

-- The fall pilots wait, as drafts, until Student Life confirms the room
-- (owner, Nov 7, 2026); in Notion they are back to Planning.
update events.events
set status = 'draft'
where slug in ('writing-workshop-2026-11-17', 'reading-with-a-guest-2026-12-01');

-- The Founding Meeting is for members and takes RSVPs; the trip is off
-- campus, with its venue.
update events.events
set entry = 'rsvp', rsvp_enabled = true, members_only = true
where slug = 'founding-meeting-2027-03-30';

update events.events
set venue_en = 'al-Mutanabbi Street, Baghdad', venue_ar = 'شارع المتنبي، بغداد', off_campus = true
where slug = 'trip-to-al-mutanabbi-street-2027-04-23';
