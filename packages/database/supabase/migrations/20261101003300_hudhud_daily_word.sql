-- The design review, PR 4f (Nov 4, 2026), C26: Hudhud sends the day's
-- word to a member who asks for it (/me, "Daily word here"), off until
-- they turn it on, and only while their notices here are on. Reminders of
-- shifts and booked events reach Telegram even when optional email is off
-- (the outbox, apps/web/lib/api/outbox.ts).

alter table core.telegram_accounts
  add column daily_word boolean not null default false,
  -- The Baghdad day it was last sent, claimed before sending so
  -- overlapping runs never send it twice.
  add column word_sent_on date;

comment on column core.telegram_accounts.daily_word is
  'The day''s word sent to this chat each morning, while notices are on.';

create or replace function core.telegram_whoami(telegram_id bigint)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := private.telegram_become(telegram_id);
begin
  if uid is null then
    return null;
  end if;
  return (
    select jsonb_build_object(
      'user_id', p.id,
      'name_en', p.full_name_en,
      'name_ar', p.full_name_ar,
      'locale', p.locale,
      'member', membership.is_member(),
      'notify', a.notify,
      'daily_word', a.daily_word
    )
    from core.profiles p
    join core.telegram_accounts a on a.user_id = p.id
    where p.id = uid
  );
end;
$$;
