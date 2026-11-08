-- The Company's line on /company named "open nights", a retired name
-- (decisions.md, "Retired names"). It now says only what the Company runs.
update core.programmes set
  rhythm_en = 'Its own auditions and productions.',
  rhythm_ar = 'تجارب الأداء والعروض الخاصة بها.'
where slug = 'company'
  and rhythm_en = 'Its own open nights, auditions and productions.';
