-- The writing workshop moves to Tuesday, December 8, 2:30–4:00 p.m.
-- (Baghdad), and stays an unpublished draft until its room is confirmed
-- (decisions.md, Events). No personal data.
update events.events
set starts_at = '2026-12-08 14:30:00+03',
    ends_at = '2026-12-08 16:00:00+03'
where id = '085d9e58-72e3-4dc1-820a-d4b028573e1d' and status = 'draft';
