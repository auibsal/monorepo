-- Qirtas starts empty (decisions §10): the 22 News pieces made on October
-- 14, 2026 and backdated to earlier dates come down before launch, among
-- them those naming Charter Day, a ratification and "six programs". They
-- stay in the newsroom as unpublished, so an editor can rework one into a
-- real piece; the sitemap and feeds list only published pieces.
update journal.pieces
set status = 'unpublished', front_rank = null
where status = 'published'
  and created_at >= '2026-10-14 00:00+03' and created_at < '2026-10-15 00:00+03';
