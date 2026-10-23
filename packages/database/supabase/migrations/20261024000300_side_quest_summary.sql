-- Side Quest is the series' name in public: the "(working title)" note
-- leaves its program summary (the Constitution's own text, quoted verbatim,
-- keeps it).
update core.programmes
set
  summary_en = replace(summary_en, ' (working title)', ''),
  summary_ar = replace(summary_ar, ' (اسم مؤقت)', '')
where slug = 'side-quest';
