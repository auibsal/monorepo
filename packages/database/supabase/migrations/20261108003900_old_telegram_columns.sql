-- Hudhud's old columns and settings, unused since the bot was rebuilt
-- (owner, Nov 8, 2026: drop them). In production on Nov 8: no word plays,
-- no warnings; the two group-rules texts are replaced by the bot's copy.
drop table if exists core.telegram_word_plays;
alter table core.telegram_groups drop column if exists join_policy;
alter table core.telegram_members
  drop column if exists warnings,
  drop column if exists joined_at;
delete from core.settings where key in ('telegram.rules_en', 'telegram.rules_ar');
