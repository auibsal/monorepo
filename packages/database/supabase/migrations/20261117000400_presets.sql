-- Presets (decisions.md, The site: "Presets"). Each format in the Events
-- Manual (SAL-EVT-01, section 7, "Ways to run an event") is a preset that
-- fills an event's duration, access, Good to know, shifts, run of show,
-- the promo kit's layout and its checklist; staff change anything after.
-- Openings, Edition calls, announcements and letters start from presets
-- the same way. Presets are data: the seat that owns each kind edits them
-- in the Diwan (events: the Director of Events, events.manage).

create table core.presets (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('event', 'opening', 'call', 'announcement', 'letter')),
  key text not null check (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title_en text not null check (char_length(title_en) between 1 and 200),
  title_ar text not null check (char_length(title_ar) between 1 and 200),
  fields jsonb not null default '{}'::jsonb,
  sort integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (kind, key)
);
create index presets_updated_by_idx on core.presets (updated_by);

-- Who keeps each kind of preset.
create function private.preset_keeper(kind text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case kind
    when 'event' then private.has_permission_anywhere('events.manage')
    when 'opening' then private.has_permission_anywhere('members.manage')
    when 'call' then private.has_permission_anywhere('journal.manage')
    when 'announcement' then private.has_permission_anywhere('content.manage')
    when 'letter' then private.has_permission_anywhere('members.manage')
    else false
  end;
$$;
revoke all on function private.preset_keeper(text) from public, anon;
grant execute on function private.preset_keeper(text) to authenticated;

alter table core.presets enable row level security;
create policy "No third-party apps" on core.presets
  as restrictive for all to authenticated
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));
create policy "Staff read the presets" on core.presets
  for select to authenticated
  using ((select private.i_am_staff()));
create policy "Each kind's keeper adds presets" on core.presets
  for insert to authenticated
  with check (private.preset_keeper(kind));
create policy "Each kind's keeper changes presets" on core.presets
  for update to authenticated
  using (private.preset_keeper(kind))
  with check (private.preset_keeper(kind));
create policy "Each kind's keeper removes presets" on core.presets
  for delete to authenticated
  using (private.preset_keeper(kind));

grant select, insert, update (title_en, title_ar, fields, sort, updated_at), delete
  on core.presets to authenticated;
grant all on core.presets to service_role;

create trigger log_activity
  after insert or update or delete on core.presets
  for each row execute function private.log_activity();

-- ── An event's run of show and its checklist ───────────────────────────
alter table events.events
  add column run_of_show jsonb not null default '[]'::jsonb
    check (jsonb_typeof(run_of_show) = 'array'),
  add column promo_layout text check (promo_layout in ('standard', 'guest', 'workshop', 'performance', 'trip', 'meeting')),
  add column preset_key text;
grant insert (run_of_show, promo_layout, preset_key),
  update (run_of_show, promo_layout)
  on events.events to authenticated;

create table events.checklist_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events.events (id) on delete cascade,
  phase text not null check (phase in ('before', 'night', 'after')),
  -- Where the item comes from: the Events Manual, the ADA National
  -- Network's accessible-event checklist, or the green-event checklist.
  source text not null default 'manual' check (source in ('manual', 'access', 'green', 'own')),
  label_en text not null check (char_length(label_en) between 1 and 300),
  label_ar text not null check (char_length(label_ar) between 1 and 300),
  sort integer not null default 0,
  done_at timestamptz,
  done_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index checklist_items_event_id_idx on events.checklist_items (event_id, phase, sort);
create index checklist_items_done_by_idx on events.checklist_items (done_by);

alter table events.checklist_items enable row level security;
create policy "No third-party apps" on events.checklist_items
  as restrictive for all to authenticated
  using ((select private.client_allows('events')))
  with check ((select private.client_allows('events')));
create policy "The event's managers read its checklist" on events.checklist_items
  for select to authenticated
  using ((select private.manages_event(event_id)));
create policy "The event's managers add to its checklist" on events.checklist_items
  for insert to authenticated
  with check ((select private.manages_event(event_id)));
create policy "The event's managers tick its checklist" on events.checklist_items
  for update to authenticated
  using ((select private.manages_event(event_id)))
  with check ((select private.manages_event(event_id)));
create policy "The event's managers remove checklist items" on events.checklist_items
  for delete to authenticated
  using ((select private.manages_event(event_id)));
grant select, insert, delete, update (done_at, done_by, label_en, label_ar, sort)
  on events.checklist_items to authenticated;
grant all on events.checklist_items to service_role;

-- ── Applying a preset to a new event ───────────────────────────────────
-- Fills what the event leaves empty: the end from the duration, access,
-- Good to know, the run of show, the promo layout, the shifts and the
-- checklist. Staff change anything after.
create function private.apply_event_preset(event uuid, preset text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p jsonb;
  e events.events;
  item jsonb;
  n integer := 0;
begin
  select * into e from events.events where id = event;
  if not found or not private.leads_event('events.manage', e.id, e.program_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select fields into p from core.presets where kind = 'event' and key = preset;
  if p is null then
    raise exception 'no_preset' using errcode = 'P0002';
  end if;
  update events.events set
    ends_at = coalesce(ends_at, starts_at + make_interval(mins => (p->>'duration_minutes')::integer)),
    entry = coalesce(p->>'entry', entry),
    classes = coalesce(
      (select array_agg(c) from jsonb_array_elements_text(p->'classes') c), classes),
    seating = coalesce(seating, p->>'seating'),
    format = coalesce(format, p->>'format'),
    run_of_show = case when run_of_show = '[]'::jsonb then coalesce(p->'run_of_show', '[]'::jsonb) else run_of_show end,
    promo_layout = coalesce(promo_layout, p->>'promo_layout'),
    preset_key = preset
  where id = event;
  select * into e from events.events where id = event;
  for item in select * from jsonb_array_elements(coalesce(p->'shifts', '[]'::jsonb)) loop
    insert into programs.shifts (event_id, role_en, role_ar, starts_at, ends_at, capacity)
    values (event, item->>'en', item->>'ar',
      e.starts_at - interval '30 minutes', coalesce(e.ends_at, e.starts_at + interval '90 minutes'),
      coalesce((item->>'capacity')::integer, 1));
  end loop;
  for item in select * from jsonb_array_elements(coalesce(p->'checklist', '[]'::jsonb)) loop
    n := n + 1;
    insert into events.checklist_items (event_id, phase, source, label_en, label_ar, sort)
    values (event, item->>'phase', coalesce(item->>'source', 'manual'), item->>'en', item->>'ar', n);
  end loop;
  -- Every event's checklist carries the accessible-event and green-event
  -- checklists, whatever its preset (decisions.md, Frameworks followed).
  for item in select * from jsonb_array_elements(private.standard_checklist()) loop
    n := n + 1;
    insert into events.checklist_items (event_id, phase, source, label_en, label_ar, sort)
    values (event, item->>'phase', item->>'source', item->>'en', item->>'ar', n);
  end loop;
end;
$$;
revoke all on function private.apply_event_preset(uuid, text) from public, anon;

-- The checklist every event carries: the Events Manual's before / on the
-- night / after (SAL-EVT-01, section 9), the ADA National Network's
-- "Planning Guide for Making Temporary Events Accessible", and the green-
-- event practice of the University of Illinois's Certified Green Event
-- program, Duke's Green Event Certification and UC Berkeley's ASUC Green
-- Events program.
create function private.standard_checklist()
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_array(
    jsonb_build_object('phase', 'before', 'source', 'manual', 'en', 'Lead and room confirmed before publishing', 'ar', 'تأكيد القائد والقاعة قبل النشر'),
    jsonb_build_object('phase', 'before', 'source', 'manual', 'en', 'Good to know filled: who can come, language, access and the accommodation date, food and its allergens, any content note, photos', 'ar', 'ملء «معلومات مفيدة»: من يحضر، واللغة، وسهولة الوصول وموعد طلب التسهيلات، والطعام ومسبّبات الحساسية، وأي تنبيه للمحتوى، والتصوير'),
    jsonb_build_object('phase', 'before', 'source', 'manual', 'en', 'Needs list ready two weeks ahead, for the Secretary to send', 'ar', 'قائمة الاحتياجات جاهزة قبل أسبوعين ليرسلها أمين السر'),
    jsonb_build_object('phase', 'before', 'source', 'manual', 'en', 'Coverage requested from Media; promotion scheduled', 'ar', 'طلب التغطية من الإعلام وجدولة الترويج'),
    jsonb_build_object('phase', 'before', 'source', 'manual', 'en', 'Volunteer shifts posted; volunteers briefed; run sheet written', 'ar', 'نشر نوبات المتطوعين وإطلاعهم وكتابة جدول السير'),
    jsonb_build_object('phase', 'before', 'source', 'access', 'en', 'Step-free route from the gate to the room, its entrance and a restroom checked', 'ar', 'التحقق من طريق خالٍ من الدرج من البوابة إلى القاعة ومدخلها ودورة مياه'),
    jsonb_build_object('phase', 'before', 'source', 'access', 'en', 'Seats kept for wheelchair users and their companions, with clear sightlines', 'ar', 'مقاعد محجوزة لمستخدمي الكراسي المتحركة ومرافقيهم مع رؤية واضحة'),
    jsonb_build_object('phase', 'before', 'source', 'access', 'en', 'The announcement says how to ask for an accommodation, and by when', 'ar', 'يذكر الإعلان كيفية طلب التسهيلات وموعده'),
    jsonb_build_object('phase', 'before', 'source', 'access', 'en', 'Slides and handouts in large print or online; videos captioned', 'ar', 'الشرائح والمطبوعات بخط كبير أو على الإنترنت، والفيديوهات مترجمة نصيًا'),
    jsonb_build_object('phase', 'before', 'source', 'green', 'en', 'Print only to the confirmed need; tickets, forms and programs on the site', 'ar', 'لا طباعة إلا بقدر الحاجة المؤكدة، والتذاكر والاستمارات والبرامج على الموقع'),
    jsonb_build_object('phase', 'before', 'source', 'green', 'en', 'No single-use decorations or plastics; reusable cups and water asked for', 'ar', 'لا زينة ولا بلاستيك لمرة واحدة، وطلب أكواب قابلة لإعادة الاستعمال وماء'),
    jsonb_build_object('phase', 'before', 'source', 'green', 'en', 'Food ordered to the RSVP count, with leftovers planned for', 'ar', 'طلب الطعام بعدد الحجوزات مع خطة لما يتبقى'),
    jsonb_build_object('phase', 'night', 'source', 'manual', 'en', 'Room set 30 minutes before doors', 'ar', 'تجهيز القاعة قبل فتح الأبواب بثلاثين دقيقة'),
    jsonb_build_object('phase', 'night', 'source', 'manual', 'en', 'Check-in at the door, by card QR code or by name', 'ar', 'التسجيل عند الباب برمز البطاقة أو بالاسم'),
    jsonb_build_object('phase', 'night', 'source', 'manual', 'en', 'Photographs only with consent; camera-shy stickers at the door', 'ar', 'التصوير بالموافقة فقط، وملصقات «لا تصوّرني» عند الباب'),
    jsonb_build_object('phase', 'night', 'source', 'access', 'en', 'Aisles and exits clear; the speaker uses the microphone', 'ar', 'الممرات والمخارج خالية، والمتحدث يستعمل الميكروفون'),
    jsonb_build_object('phase', 'night', 'source', 'green', 'en', 'Recycling and food-waste bins set out and labeled', 'ar', 'حاويات إعادة التدوير وبقايا الطعام موضوعة ومعلّمة'),
    jsonb_build_object('phase', 'night', 'source', 'manual', 'en', 'Room reset and kit returned', 'ar', 'إعادة القاعة وإرجاع المعدات'),
    jsonb_build_object('phase', 'after', 'source', 'manual', 'en', 'Thank-yous within two days', 'ar', 'رسائل الشكر خلال يومين'),
    jsonb_build_object('phase', 'after', 'source', 'manual', 'en', 'Debrief within a week', 'ar', 'المراجعة بعد الفعالية خلال أسبوع'),
    jsonb_build_object('phase', 'after', 'source', 'manual', 'en', 'Links added within a week: photos, recordings, the Qirtas piece, minutes, the debrief', 'ar', 'إضافة الروابط خلال أسبوع: الصور والتسجيلات ومادة قرطاس والمحضر والمراجعة'),
    jsonb_build_object('phase', 'after', 'source', 'green', 'en', 'Leftover food shared; what was recycled noted in the debrief', 'ar', 'توزيع ما تبقى من الطعام وتدوين ما أُعيد تدويره في المراجعة'),
    jsonb_build_object('phase', 'after', 'source', 'manual', 'en', 'Any incident reported within 24 hours, from the event’s page', 'ar', 'الإبلاغ عن أي حادث خلال 24 ساعة من صفحة الفعالية')
  );
$$;

create function events.apply_event_preset(event uuid, preset text)
returns void language sql security invoker set search_path = ''
as $$ select private.apply_event_preset(event, preset) $$;
revoke all on function events.apply_event_preset(uuid, text) from public, anon;
grant execute on function private.apply_event_preset(uuid, text),
  events.apply_event_preset(uuid, text) to authenticated;
revoke all on function private.standard_checklist() from public, anon;
grant execute on function private.standard_checklist() to authenticated;

-- ── The Events Manual's formats ────────────────────────────────────────
-- Events run Tuesday 2:30–4:00 p.m. (90 minutes); general meetings 45
-- (SAL-EVT-01, section 3.2). Runs of show from section 7.
insert into core.presets (kind, key, title_en, title_ar, sort, fields) values
('event', 'reading-with-a-guest', 'A reading with a guest', 'قراءة مع ضيف', 1, $j${
  "duration_minutes": 90, "entry": "rsvp", "seating": "seated", "promo_layout": "guest",
  "run_of_show": [
    {"en": "Welcome", "ar": "الترحيب", "minutes": 3},
    {"en": "The guest reads and says why", "ar": "يقرأ الضيف ويشرح سبب اختياره", "minutes": 15},
    {"en": "Three students read, five minutes each", "ar": "ثلاثة طلاب يقرؤون، خمس دقائق لكل منهم", "minutes": 15},
    {"en": "Tea", "ar": "استراحة الشاي", "minutes": 10},
    {"en": "Conversation, opened by the host", "ar": "حوار يفتتحه المضيف", "minutes": 30},
    {"en": "Notices and thanks", "ar": "الإعلانات والشكر", "minutes": 5}
  ],
  "shifts": [{"en": "Check-in", "ar": "التسجيل"}, {"en": "Ushers", "ar": "المرشدون", "capacity": 2}],
  "checklist": [
    {"phase": "before", "en": "Guest invited four weeks ahead and confirmed a week ahead", "ar": "دعوة الضيف قبل أربعة أسابيع وتأكيدها قبل أسبوع"},
    {"phase": "before", "en": "Three student readers signed up, one place kept for a first-time reader", "ar": "تسجيل ثلاثة قرّاء من الطلاب مع مكان لقارئ لأول مرة"},
    {"phase": "night", "en": "Chairs in a horseshoe, no podium; the guest met at the gate", "ar": "الكراسي على شكل حدوة بلا منصة، واستقبال الضيف عند البوابة"}
  ]}$j$::jsonb),
('event', 'book-discussion', 'A book discussion', 'نقاش كتاب', 2, $j${
  "duration_minutes": 90, "entry": "rsvp", "seating": "seated", "promo_layout": "standard",
  "run_of_show": [
    {"en": "One sentence each about the book", "ar": "جملة واحدة من كل مشارك عن الكتاب", "minutes": 10},
    {"en": "Context", "ar": "السياق", "minutes": 5},
    {"en": "Small groups of four with question cards", "ar": "مجموعات صغيرة من أربعة مع بطاقات الأسئلة", "minutes": 35},
    {"en": "The whole circle", "ar": "الحلقة كاملة", "minutes": 30},
    {"en": "The next book chosen", "ar": "اختيار الكتاب التالي", "minutes": 10}
  ],
  "shifts": [{"en": "Check-in", "ar": "التسجيل"}],
  "checklist": [
    {"phase": "before", "en": "Question cards ready; the book announced well ahead", "ar": "بطاقات الأسئلة جاهزة والإعلان عن الكتاب مبكرًا"},
    {"phase": "night", "en": "One circle of chairs, two if more than 20 come", "ar": "حلقة واحدة من الكراسي، واثنتان إن حضر أكثر من 20"}
  ]}$j$::jsonb),
('event', 'writing-workshop', 'A writing workshop', 'ورشة كتابة', 3, $j${
  "duration_minutes": 90, "entry": "rsvp", "seating": "seated", "promo_layout": "workshop",
  "run_of_show": [
    {"en": "A prompt and a short model passage", "ar": "موضوع للكتابة ونص نموذجي قصير", "minutes": 10},
    {"en": "One craft move", "ar": "تقنية كتابة واحدة", "minutes": 10},
    {"en": "Quiet writing, phones away", "ar": "كتابة بهدوء، والهواتف جانبًا", "minutes": 25},
    {"en": "Pairs: one thing that worked, one question", "ar": "أزواج: شيء نجح وسؤال واحد", "minutes": 15},
    {"en": "Volunteers read; the leader responds", "ar": "يقرأ المتطوعون ويعلّق المشرف", "minutes": 20},
    {"en": "Next steps", "ar": "الخطوات التالية", "minutes": 10}
  ],
  "shifts": [{"en": "Check-in", "ar": "التسجيل"}],
  "checklist": [
    {"phase": "night", "en": "Nobody has to read; nothing photographed, quoted or posted without the writer’s permission", "ar": "لا أحد مُلزَم بالقراءة، ولا تصوير ولا اقتباس ولا نشر دون إذن الكاتب"}
  ]}$j$::jsonb),
('event', 'listening-session', 'A listening session', 'جلسة استماع', 4, $j${
  "duration_minutes": 90, "entry": "rsvp", "seating": "seated", "promo_layout": "standard",
  "run_of_show": [
    {"en": "Introduction by the host or a guest", "ar": "تقديم من المضيف أو ضيف", "minutes": 5},
    {"en": "Listening together", "ar": "الاستماع معًا", "minutes": 45},
    {"en": "Talk", "ar": "النقاش", "minutes": 40}
  ],
  "shifts": [{"en": "Check-in", "ar": "التسجيل"}, {"en": "Sound", "ar": "الصوت"}],
  "checklist": [
    {"phase": "before", "en": "Content notes in the announcement", "ar": "تنبيهات المحتوى في الإعلان"},
    {"phase": "night", "en": "Sound checked before doors; phones away while listening", "ar": "فحص الصوت قبل فتح الأبواب، والهواتف جانبًا أثناء الاستماع"}
  ]}$j$::jsonb),
('event', 'screening', 'A screening', 'عرض فيلم', 5, $j${
  "duration_minutes": 90, "entry": "rsvp", "seating": "seated", "format": "screening", "promo_layout": "standard",
  "run_of_show": [],
  "shifts": [{"en": "Check-in", "ar": "التسجيل"}],
  "checklist": [
    {"phase": "before", "en": "The right to screen confirmed; captions ready", "ar": "التأكد من حق العرض وجاهزية الترجمة النصية"}
  ]}$j$::jsonb),
('event', 'debate', 'A debate', 'مناظرة', 6, $j${
  "duration_minutes": 90, "entry": "rsvp", "seating": "seated", "promo_layout": "standard",
  "run_of_show": [
    {"en": "The room votes on the motion", "ar": "تصويت القاعة على المقترح", "minutes": 5},
    {"en": "Timed speeches, both sides", "ar": "كلمات محددة الوقت للجانبين", "minutes": 40},
    {"en": "One-minute contributions from the floor", "ar": "مداخلات من الحضور لدقيقة واحدة", "minutes": 30},
    {"en": "The room votes again", "ar": "تصويت القاعة مجددًا", "minutes": 10}
  ],
  "shifts": [{"en": "Check-in", "ar": "التسجيل"}, {"en": "Timekeeper", "ar": "ضابط الوقت"}],
  "checklist": [
    {"phase": "before", "en": "A motion on books, writing, art or campus life; no party politics, religion, sect or ethnicity", "ar": "مقترح عن الكتب أو الكتابة أو الفن أو الحياة الجامعية، بلا سياسة حزبية ولا دين ولا طائفة ولا عرق"}
  ]}$j$::jsonb),
('event', 'trip', 'A trip', 'رحلة', 7, $j${
  "duration_minutes": 240, "entry": "rsvp", "promo_layout": "trip",
  "run_of_show": [],
  "shifts": [{"en": "Group leads", "ar": "قادة المجموعات", "capacity": 4}, {"en": "First aid", "ar": "الإسعافات الأولية"}],
  "checklist": [
    {"phase": "before", "en": "Student Life’s written approval eight weeks ahead, recorded on the event", "ar": "موافقة شؤون الطلبة الكتابية قبل ثمانية أسابيع، مسجلة على الفعالية"},
    {"phase": "before", "en": "Trip consent at RSVP; shared transport requested from Student Life", "ar": "موافقة الرحلة عند الحجز وطلب النقل المشترك من شؤون الطلبة"},
    {"phase": "night", "en": "Groups of up to eight with a lead each; head counts at every stop", "ar": "مجموعات حتى ثمانية لكل منها قائد، والعدّ عند كل محطة"}
  ]}$j$::jsonb),
('event', 'performance', 'A performance', 'عرض أدائي', 8, $j${
  "duration_minutes": 90, "entry": "rsvp", "seating": "seated", "format": "performance", "promo_layout": "performance",
  "run_of_show": [],
  "shifts": [{"en": "Stage manager", "ar": "مدير المسرح"}, {"en": "Front of house", "ar": "استقبال الجمهور"}, {"en": "Check-in", "ar": "التسجيل"}],
  "checklist": [
    {"phase": "before", "en": "Run of show to the minute", "ar": "جدول العرض بالدقيقة"},
    {"phase": "night", "en": "Front of house: doors, check-in, seating, accessibility and the audience’s safety", "ar": "استقبال الجمهور: الأبواب والتسجيل والمقاعد وسهولة الوصول وسلامة الحضور"}
  ]}$j$::jsonb),
('event', 'meeting', 'A meeting', 'اجتماع', 9, $j${
  "duration_minutes": 45, "entry": "rsvp", "classes": ["member", "associate", "honorary"], "seating": "seated", "promo_layout": "meeting",
  "run_of_show": [],
  "shifts": [{"en": "Check-in", "ar": "التسجيل"}],
  "checklist": [
    {"phase": "before", "en": "Agenda sent; the voting point set up where there is a vote", "ar": "إرسال جدول الأعمال وتجهيز نقطة التصويت إن وُجد تصويت"},
    {"phase": "after", "en": "Minutes drafted within seven days", "ar": "صياغة المحضر خلال سبعة أيام"}
  ]}$j$::jsonb);

select private.build_api();
