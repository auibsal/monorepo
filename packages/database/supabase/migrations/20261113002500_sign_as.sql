-- "Sign as …" everywhere (fourth prompt, 2): nobody types the name the
-- site knows. A signed-in signer signs a form, an agreement or the GPA
-- consent in the name the register holds (the legal name, English if it
-- is complete, else Arabic, else the name shown); the page says "Sign as
-- …". Only someone with no account (a parent by link) types a name.

create function private.register_name(uid uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    case when private.legal_name_complete(p, 'en')
      then concat_ws(' ', p.first_name_en, p.father_name_en, p.grandfather_name_en, p.last_name_en) end,
    case when private.legal_name_complete(p, 'ar')
      then concat_ws(' ', p.first_name_ar, p.father_name_ar, p.grandfather_name_ar, p.last_name_ar) end,
    nullif(btrim(p.full_name_en), ''),
    nullif(btrim(p.full_name_ar), ''))
  from core.profiles p where p.id = uid;
$$;

revoke all on function private.register_name(uuid) from public, anon, authenticated;
grant execute on function private.register_name(uuid) to service_role;

-- The name a signed-in member signs in, for the page's "Sign as …".
create function private.my_register_name()
returns text
language sql
stable
security definer
set search_path = ''
as $$ select private.register_name(auth.uid()) $$;

create function core.my_register_name()
returns text
language sql
stable
security invoker
set search_path = ''
as $$ select private.my_register_name() $$;

revoke all on function private.my_register_name() from public, anon;
grant execute on function private.my_register_name() to authenticated;
revoke all on function core.my_register_name() from public, anon;
grant execute on function core.my_register_name() to authenticated;

create or replace function private.sign_form(form_key text, data jsonb, signer_name text, subject_id uuid DEFAULT NULL::uuid, signer_contact text DEFAULT NULL::text, anonymous boolean DEFAULT false, routing text DEFAULT 'none'::text, esign_agreed boolean DEFAULT false, link_token text DEFAULT NULL::text, signer_ip text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  t governance.form_types;
  new_id uuid;
  via_api boolean := coalesce(auth.role(), '') = 'service_role';
  link governance.form_links;
  ip text;
begin
  -- "Sign as …" (fourth prompt, 2): a signed-in signer signs in the name
  -- the register holds, never one typed on the page.
  if auth.uid() is not null then
    signer_name := coalesce(private.register_name(auth.uid()), signer_name);
  end if;
  select * into t from governance.form_types where key = sign_form.form_key;
  if not found or t.filled <> 'site' then
    raise exception 'unknown_form' using errcode = 'P0002';
  end if;
  -- Signed out: only through the API route (Turnstile, a limit per address).
  if auth.uid() is null and not via_api then
    raise exception 'use_the_form_page' using errcode = '42501';
  end if;
  if auth.uid() is null and (t.needs_account or anonymous) then
    raise exception 'sign_in_required' using errcode = '42501';
  end if;
  if auth.uid() is not null and not private.may_submit_form(t.key) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if auth.uid() is null and not core.take_rate('forms:' || t.key, 60, 3600) then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
  if data is null or jsonb_typeof(data) <> 'object' or length(data::text) > 40000 then
    raise exception 'invalid_data' using errcode = '22023';
  end if;
  -- Every form is signed, a sealed concern too (its name is kept apart).
  if char_length(btrim(coalesce(sign_form.signer_name, ''))) < 2 then
    raise exception 'signature_required' using errcode = '23514';
  end if;
  if not sign_form.esign_agreed then
    raise exception 'esign_agreement_required' using errcode = '23514';
  end if;
  if anonymous and not t.anonymous_ok then
    raise exception 'anonymous_not_allowed' using errcode = '22023';
  end if;
  if coalesce(routing, 'none') <> 'none' and t.key <> 'f21' then
    raise exception 'routing_only_for_concerns' using errcode = '22023';
  end if;
  if t.subject_kind = 'event' and t.key = 'f45' and not exists (
    select 1 from events.events e
    where e.id = sign_form.subject_id and e.off_campus and e.status = 'published'
      and private.can_see_event_id(e.id)
  ) then
    raise exception 'not_a_trip' using errcode = '22023';
  end if;
  -- A link-only form needs its link; any form given a link uses it once
  -- (a guest's F-15 release for a Next Stop episode).
  if t.by_link or sign_form.link_token is not null then
    select * into link from governance.form_links l
    where l.form_key = t.key
      and l.token_hash = encode(extensions.digest(coalesce(sign_form.link_token, ''), 'sha256'), 'hex')
      and l.used_at is null and l.expires_at > now()
    for update;
    if not found then
      raise exception 'link_not_valid' using errcode = '42501';
    end if;
  end if;

  -- The IP: given by the API route, or read from the request.
  ip := case when via_api then sign_form.signer_ip else split_part(coalesce(
    (nullif(current_setting('request.headers', true), '')::jsonb) ->> 'x-forwarded-for', ''), ',', 1) end;

  insert into governance.form_submissions (
    form_key, submitted_by, routing, data, status, submitted_at, form_version,
    signer_name, signed_at, signer_contact, subject_id,
    esign_agreed, signer_ip, document_sha256
  ) values (
    t.key,
    case when anonymous then null else auth.uid() end,
    coalesce(routing, 'none'),
    data,
    'submitted',
    now(),
    t.version,
    case when anonymous then null else btrim(sign_form.signer_name) end,
    now(),
    case when anonymous then null else nullif(btrim(coalesce(sign_form.signer_contact, '')), '') end,
    sign_form.subject_id,
    sign_form.esign_agreed,
    case when anonymous then null else nullif(btrim(coalesce(ip, '')), '') end,
    encode(extensions.digest(jsonb_build_object(
      'form', t.code, 'version', t.version, 'data', data,
      'signer', case when anonymous then null else btrim(sign_form.signer_name) end
    )::text, 'sha256'), 'hex')
  )
  returning id into new_id;

  -- A sealed concern: the signer, kept apart from what the panel reads.
  if anonymous then
    insert into governance.sealed_signers (submission_id, user_id, signer_name)
    values (new_id, auth.uid(), btrim(sign_form.signer_name));
  end if;

  if link.id is not null then
    update governance.form_links set used_at = now(), submission_id = new_id where id = link.id;
  end if;
  -- The signer's copy by email (a sealed concern sends none: the panel's
  -- mailbox would hold their address).
  if not anonymous then
    perform private.enqueue('forms.signed_copy', jsonb_build_object('submission_id', new_id));
  end if;
  return new_id;
end;
$function$;

create or replace function private.save_application(opening_id uuid, answers jsonb, availability text, lang text, files text[], accommodation text, gpa_consent_name text, submit boolean)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  o programmes.openings;
  uid uuid := auth.uid();
  existing programmes.opening_replies;
  q jsonb;
begin
  if uid is null or not private.membership_is_member() then
    raise exception 'members_apply' using errcode = '42501';
  end if;
  select * into o from programmes.openings x
  where x.id = save_application.opening_id and x.is_open and (x.closes_at is null or x.closes_at > now());
  if not found then
    raise exception 'opening_closed' using errcode = 'P0001';
  end if;
  select * into existing from programmes.opening_replies r
  where r.opening_id = o.id and r.user_id = uid;
  if found and existing.status not in ('draft', 'withdrawn') then
    raise exception 'already_applied' using errcode = 'P0001';
  end if;
  if submit then
    for q in select * from jsonb_array_elements(o.questions) loop
      if coalesce((q ->> 'required')::boolean, false)
        and coalesce(btrim(answers ->> (q ->> 'key')), '') = '' then
        raise exception 'answer_required' using errcode = '22023';
      end if;
    end loop;
    if private.is_director_role(o.role) then
      if coalesce(btrim(gpa_consent_name), '') = '' then
        raise exception 'gpa_consent_name' using errcode = '22023',
          hint = 'Consent to the GPA check; the register''s name signs it.';
      end if;
      -- Council seats wait for 18 (§10, Minors).
      if private.is_minor(uid) then
        raise exception 'council_seat_under_18' using errcode = 'P0001';
      end if;
    end if;
  end if;
  perform set_config('sal.applicant', 'on', true);
  insert into programmes.opening_replies as r (opening_id, user_id, status, answers, availability, lang,
    files, accommodation, gpa_consent_name, gpa_consent_at, submitted_at)
  values (o.id, uid, case when submit then 'new' else 'draft' end,
    coalesce(answers, '{}'::jsonb), nullif(btrim(availability), ''), lang,
    coalesce(files, '{}'), nullif(btrim(accommodation), ''),
    case when private.is_director_role(o.role) and coalesce(btrim(gpa_consent_name), '') <> '' then private.register_name(uid) end,
    case when submit and private.is_director_role(o.role) then now() end,
    case when submit then now() end)
  on conflict on constraint opening_replies_pkey do update set
    status = excluded.status,
    answers = excluded.answers,
    availability = excluded.availability,
    lang = excluded.lang,
    files = excluded.files,
    accommodation = excluded.accommodation,
    gpa_consent_name = excluded.gpa_consent_name,
    gpa_consent_at = excluded.gpa_consent_at,
    submitted_at = excluded.submitted_at,
    decided_at = null;
  perform set_config('sal.applicant', 'off', true);
  if submit then
    perform private.enqueue('get_involved.received',
      jsonb_build_object('opening_id', o.id, 'user_id', uid));
  end if;
  return case when submit then 'new' else 'draft' end;
end;
$function$;
