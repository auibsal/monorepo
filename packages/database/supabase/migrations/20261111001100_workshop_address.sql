-- The writing workshop moved to Tue Dec 8 (decisions.md, Events): its address
-- follows its date. The old address redirects (308, apps/web/next.config.ts),
-- and its Notion row's Slug carries the same value, so the sync keeps it.
update events.events
set slug = 'writing-workshop-2026-12-08'
where id = '085d9e58-72e3-4dc1-820a-d4b028573e1d'
  and slug = 'writing-workshop-2026-11-17'
  and not exists (select 1 from events.events e where e.slug = 'writing-workshop-2026-12-08');
