-- The nightly Telegram tidy still cleared the daily word's plays, a table
-- dropped in 20261108003900_old_telegram_columns, so the job failed. It
-- keeps clearing expired link codes and old post records.
select cron.schedule('sal-telegram-tidy', '25 3 * * *', $$
  delete from core.telegram_codes where expires_at < now();
  delete from core.telegram_posts where posted_at < now() - interval '90 days';
$$);
