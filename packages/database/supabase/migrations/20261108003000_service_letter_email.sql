-- A service letter tells its holder once it is written (audit C9), as a
-- certificate does when it is issued.

create function private.after_service_letter_written()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.enqueue('membership.service_letter',
    jsonb_build_object('letter_id', new.id, 'user_id', new.user_id));
  return new;
end;
$$;
revoke all on function private.after_service_letter_written() from public, anon, authenticated;

create trigger after_service_letter_written after insert on membership.service_letters
  for each row execute function private.after_service_letter_written();
