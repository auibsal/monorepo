-- The v6 names (owner, Oct 24, 2026; NAMES.md in the v6 handoff). What
-- people see changes; slugs, keys, schemas and functions keep their code
-- names (waraq, journal, nexus, side-quest). New Arabic is
-- needs-native-review (PROGRESS.md).

-- ── Programs ────────────────────────────────────────────────────────────────
-- Five flagships, one evening a week in a four-week cycle (the Majlis, Book
-- Circle, Open Pages, Open Stage), and three specials a term. The sort
-- order follows that structure.

update core.programmes set
  name_en = 'Qirtas',
  name_ar = 'قرطاس',
  summary_en = 'The Society''s paper: news, letters and art, in print and online.',
  summary_ar = 'صحيفة الجمعية: أخبار وآداب وفنون، مطبوعةً وعلى الإنترنت.',
  sort = 10
where slug = 'waraq';

update core.programmes set
  name_en = 'Next Stop',
  name_ar = 'المحطة القادمة',
  sort = 20
where slug = 'side-quest';

update core.programmes set sort = 30 where slug = 'second-chapter';
update core.programmes set sort = 40 where slug = 'typewriter-tour';

-- The Company, the Society's theater company (formerly Productions): the
-- fifth flagship. Its pages stay at /programs/productions.
insert into core.programmes (slug, kind, name_en, name_ar, summary_en, summary_ar, sort)
values (
  'company', 'series', 'The Company', 'الفرقة',
  'The Society''s theater company: one staged production a semester, cast from Open Stage.',
  'فرقة الجمعية المسرحية: عمل مسرحي واحد كل فصل، يُختار ممثلوه من المسرح المفتوح.',
  50
)
on conflict (slug) do update set
  name_en = excluded.name_en,
  name_ar = excluded.name_ar,
  summary_en = excluded.summary_en,
  summary_ar = excluded.summary_ar,
  sort = excluded.sort,
  is_active = true;

update core.programmes set sort = 60 where slug = 'majlis';
update core.programmes set sort = 70 where slug = 'book-circle';
update core.programmes set sort = 80 where slug = 'open-pages';

update core.programmes set
  name_en = 'Open Stage',
  name_ar = 'المسرح المفتوح',
  sort = 90
where slug = 'scratch-night';

update core.programmes set sort = 100 where slug = 'bad-poetry-night';

update core.programmes set
  name_en = 'Munazara',
  name_ar = 'المناظرة',
  sort = 110
where slug = 'motion-night';

update core.programmes set
  name_en = 'Mutanabbi Friday',
  name_ar = 'جمعة المتنبي',
  sort = 120
where slug = 'mutanabbi-walk';

-- Gallery Wall merges into Qirtas's Gallery desk: unpublished, not deleted,
-- so its row and history stay.
update core.programmes set is_active = false, sort = 130
where slug = 'gallery-wall';

-- ── The paper's name ────────────────────────────────────────────────────────

update core.settings set value = '"Qirtas"'::jsonb where key = 'journal.name_en';
update core.settings set value = '"قرطاس"'::jsonb where key = 'journal.name_ar';

-- ── Roles and titles ────────────────────────────────────────────────────────

update access.roles set
  name_en = 'Director of Partnerships',
  name_ar = 'مدير الشراكات'
where key = 'partnerships_director';

-- Directors carry their portfolio as the title of their role assignment.
update access.role_assignments set
  title_en = regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
    title_en,
    'Director of Letters', 'Editor of Qirtas'),
    'Director of Stage (and|&) Arts', 'Director of the Company'),
    'Director of Programm?e?s (and|&) Events', 'Director of Programs'),
    'Director of Partnerships (and|&) Outreach', 'Director of Partnerships'),
    'Director of Membership (and|&) Community', 'Director of Membership'),
    'Director of Media (and|&) [A-Za-z]+', 'Director of Media'),
  title_ar = replace(replace(replace(replace(replace(replace(
    title_ar,
    'مدير الآداب', 'محرّر قرطاس'),
    'مدير المسرح والفنون', 'مدير الفرقة'),
    'مدير البرامج والفعاليات', 'مدير البرامج'),
    'مدير الشراكات والتواصل', 'مدير الشراكات'),
    'مدير العضوية والمجتمع', 'مدير العضوية'),
    'مدير الإعلام والتواصل', 'مدير الإعلام')
where title_en ~ 'Director of (Letters|Stage|Programm?e?s|Partnerships (and|&)|Membership (and|&)|Media (and|&))'
   or title_ar ~ 'مدير (الآداب|المسرح والفنون|البرامج والفعاليات|الشراكات والتواصل|العضوية والمجتمع|الإعلام والتواصل)';

-- ── Platform policies (drafts written for the platform) ─────────────────────
-- The governance documents keep their text; the owner amends those.

update governance.society_documents set body_en =
  replace(replace(replace(replace(
    body_en,
    'auibsal.org/nexus', 'auibsal.org/diwan'),
    'auibsal.org/waraq', 'auibsal.org/qirtas'),
    'Nexus', 'Diwan'),
    'Waraq', 'Qirtas')
where code like 'SAL-PLT-%' and status = 'draft';

-- ── The newsroom's byline ───────────────────────────────────────────────────
-- Unsigned news runs as the News Desk; its slug stays.
update journal.contributors set
  name_en = 'Qirtas News Desk',
  name_ar = coalesce(nullif(replace(name_ar, 'ورق', 'قرطاس'), ''), 'مكتب أخبار قرطاس')
where slug = 'waraq-news-desk';
