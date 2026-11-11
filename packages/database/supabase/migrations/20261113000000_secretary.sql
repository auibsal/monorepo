-- "Secretary" («أمين السر»; «أمينة السر» for a woman) replaces "General
-- Secretary" («الأمين العام») everywhere (decisions.md, Standards and
-- language; the glossary). The role's key, general_secretary, stays.

update access.roles
set name_en = 'Secretary',
    name_ar = 'أمين السر',
    name_ar_feminine = 'أمينة السر'
where key = 'general_secretary';
