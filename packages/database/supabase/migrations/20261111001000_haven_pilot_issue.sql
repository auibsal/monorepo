-- Haven is the pilot issue, not Issue 1 (decisions.md, Qirtas): Issue 1
-- comes in spring 2027. Haven's call takes up to two entries a person and
-- closes Sun Dec 6, 2026, 11:59 p.m. Baghdad time; writers hear back within
-- the week, and the pilot issue is published Wed Dec 16, 2026. The standing
-- call takes only Letters and Gallery until the owner reopens the others.

-- ── A pilot issue has no number ─────────────────────────────────────────────

alter table journal.issues add column pilot boolean not null default false;
alter table journal.issues alter column number drop not null;
alter table journal.issues add constraint issues_pilot_unnumbered
  check (pilot = (number is null));

comment on column journal.issues.pilot is
  'A pilot issue (Haven, fall 2026) carries no number; Issue 1 is the first numbered issue (decisions.md, Qirtas).';

update journal.issues
set pilot = true,
    number = null,
    season_en = 'Fall 2026',
    season_ar = 'خريف 2026',
    publish_at = timestamptz '2026-12-16 09:00+03'
where slug = 'haven' and status = 'draft';

-- ── Haven's call ────────────────────────────────────────────────────────────

update journal.calls c
set closes_at = timestamptz '2026-12-06 23:59:59+03',
    decisions_at = timestamptz '2026-12-13 12:00+03',
    max_per_person = 2
from journal.issues i
where c.issue_id = i.id and i.slug = 'haven';

-- ── The standing call: Letters and Gallery for now ──────────────────────────

update journal.calls
set desks = array['letters', 'gallery']::journal.desk[]
where issue_id is null;
