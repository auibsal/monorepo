-- Receipts (decisions.md, Documents and forms: every action that creates a
-- record emails a receipt with its link; the third prompt, §2). Most
-- already do (a booking, a submission with its SUB number, a signed form,
-- an application, a removal request). Two did not: standing for a seat,
-- and a request for Associate membership.

create function private.after_candidacy_filed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.enqueue('governance.candidacy_received',
    jsonb_build_object('candidate_id', new.id, 'user_id', new.user_id));
  return null;
end;
$$;
revoke all on function private.after_candidacy_filed() from public, anon, authenticated;

create trigger after_candidacy_filed
  after insert on governance.candidates
  for each row execute function private.after_candidacy_filed();

create function private.after_associate_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.enqueue('membership.associate_request_received',
    jsonb_build_object('request_id', new.id));
  return null;
end;
$$;
revoke all on function private.after_associate_request() from public, anon, authenticated;

create trigger after_associate_request
  after insert on membership.associate_requests
  for each row execute function private.after_associate_request();
