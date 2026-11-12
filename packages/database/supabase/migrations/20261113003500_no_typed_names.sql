-- No name fields (decisions.md, Members: names; the third prompt, §1): the
-- only name anyone types is their own, on their account. Everyone named on
-- a record is picked from the site's people; an outsider is invited by
-- email first and gives their own name by signing.
--
-- * The Publication Agreement is signed in the name the register holds.
-- * A production credit names an account (rows typed before stay).
-- * Someone on camera for Next Stop is a member picked from the people, or
--   an outsider invited by email whose name comes from the release they
--   sign (rows typed before stay).

-- The Publication Agreement, "Sign as …".
create or replace function private.sign_agreement(submission_id uuid, signer_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  s journal.submissions;
  new_id uuid;
  version text := coalesce(private.setting('journal.agreement.version') #>> '{}', '1');
  who text := private.register_name(auth.uid());
begin
  select * into s from journal.submissions where id = sign_agreement.submission_id;
  if not found or s.author_id <> auth.uid() then
    raise exception 'Submission not found' using errcode = 'P0002';
  end if;
  -- The name typed by an older client is ignored: the register's stands.
  if sign_agreement.signer_name is distinct from who then
    signer_name := who;
  end if;
  if s.status <> 'accepted' then
    raise exception 'Only accepted work has an agreement to sign' using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(who, '')), '') is null then
    raise exception 'name_required' using errcode = '22023';
  end if;

  insert into journal.agreements (submission_id, version, signer_name)
  values (s.id, version, who)
  returning id into new_id;
  return new_id;
end;
$$;

-- New credits name an account.
create function private.credit_names_an_account()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.person_name is not null then
    raise exception 'pick_from_people' using errcode = '22023',
      hint = 'Pick the person from the site''s people; an outsider is invited by email first.';
  end if;
  return new;
end;
$$;

create trigger credit_names_an_account
  before insert on programmes.production_credits
  for each row execute function private.credit_names_an_account();

-- On camera: a member, or an outsider invited by email.
alter table programmes.episode_on_camera drop constraint episode_on_camera_check;
alter table programmes.episode_on_camera add constraint episode_on_camera_check
  check (user_id is not null or guest_name_en is not null or is_guest);

create function private.on_camera_names()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.user_id is null and (new.guest_name_en is not null or new.guest_name_ar is not null) then
    raise exception 'invite_by_email_first' using errcode = '22023',
      hint = 'Invite the guest by email; their name comes from the release they sign.';
  end if;
  return new;
end;
$$;

create trigger on_camera_names
  before insert on programmes.episode_on_camera
  for each row execute function private.on_camera_names();

create function private.invite_on_camera(episode uuid, email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if not private.has_permission('content.manage') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  insert into programmes.episode_on_camera (episode_id, is_guest)
  values (episode, true)
  returning id into new_id;
  perform private.episode_release_link(new_id, email);
  return new_id;
end;
$$;
revoke all on function private.invite_on_camera(uuid, text) from public, anon;
grant execute on function private.invite_on_camera(uuid, text) to authenticated;

create function programmes.invite_on_camera(episode uuid, email text)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.invite_on_camera($1, $2) $$;
revoke all on function programmes.invite_on_camera(uuid, text) from public, anon;
grant execute on function programmes.invite_on_camera(uuid, text) to authenticated, service_role;

-- The release signed: the guest's name is the one they signed with.
create or replace function private.release_signed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.submission_id is not null and old.submission_id is null and new.form_key = 'f15' then
    update programmes.episode_on_camera c
    set release_id = new.submission_id,
        guest_name_en = coalesce(c.guest_name_en, (
          select left(btrim(f.signer_name), 120) from governance.form_submissions f
          where f.id = new.submission_id and char_length(btrim(f.signer_name)) >= 2))
    where c.form_link_id = new.id and c.release_id is null;
  end if;
  return new;
end;
$$;
