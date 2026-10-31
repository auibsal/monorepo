-- The owner's decisions on the final audit (Oct 31, 2026, last):
--
-- 1. Rate limits for the public forms, kept here now that Arcjet is gone:
--    the API routes count a hashed visitor key per form and refuse past the
--    limit (core.take_rate, service role only).
-- 2. The old handbook pages (each in Notion now) and the old uploaded
--    library entries are dropped. The `library` bucket stays: it also holds
--    Qirtas agreements and production rights.
-- 3. One person, one name: a full name in four parts, in English or in
--    Arabic, belongs to one account. Names already shared stay as they are
--    until changed; no new account or name change may copy another's.
-- 4. The website policies no longer describe the API (gone Oct 30): SAL-PLT-10
--    is retired, and PLT-01, 02, 04, 05 and 09 say what the platform is now.

-- ── 1. Rate limits ──────────────────────────────────────────────────────────
create table private.rate_hits (
  bucket text not null check (char_length(bucket) between 1 and 128),
  hit_at timestamptz not null default now()
);
alter table private.rate_hits enable row level security;
create index rate_hits_bucket_idx on private.rate_hits (bucket, hit_at);
revoke all on private.rate_hits from public, anon, authenticated;

-- Records one hit and says whether it is within the limit: at most
-- `max_hits` in the last `window_seconds` for the bucket.
create function core.take_rate(bucket text, max_hits integer, window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  since timestamptz := now() - make_interval(secs => greatest(window_seconds, 1));
  used integer;
begin
  delete from private.rate_hits h where h.hit_at < now() - interval '1 day';
  select count(*) into used from private.rate_hits h
  where h.bucket = take_rate.bucket and h.hit_at >= since;
  if used >= max_hits then
    return false;
  end if;
  insert into private.rate_hits (bucket) values (take_rate.bucket);
  return true;
end;
$$;
revoke all on function core.take_rate(text, integer, integer) from public, anon, authenticated;
grant execute on function core.take_rate(text, integer, integer) to service_role;

-- ── 2. Old handbook pages and library entries ──────────────────────────────
drop table governance.handbook_pages;
drop table governance.library_documents;

-- ── 3. One person, one name ─────────────────────────────────────────────────
create function private.name_key(a text, b text, c text, d text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(btrim(a), '') = '' or coalesce(btrim(b), '') = ''
      or coalesce(btrim(c), '') = '' or coalesce(btrim(d), '') = '' then null
    else lower(regexp_replace(btrim(a) || ' ' || btrim(b) || ' ' || btrim(c) || ' ' || btrim(d), '\s+', ' ', 'g'))
  end;
$$;
revoke all on function private.name_key(text, text, text, text) from public, anon, authenticated;

create function private.one_person_one_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  en text := private.name_key(new.first_name_en, new.father_name_en, new.grandfather_name_en, new.last_name_en);
  ar text := private.name_key(new.first_name_ar, new.father_name_ar, new.grandfather_name_ar, new.last_name_ar);
begin
  if tg_op = 'UPDATE' then
    -- Only a changed name is checked, so names shared before this rule
    -- can still save everything else.
    if en is not distinct from private.name_key(old.first_name_en, old.father_name_en, old.grandfather_name_en, old.last_name_en) then
      en := null;
    end if;
    if ar is not distinct from private.name_key(old.first_name_ar, old.father_name_ar, old.grandfather_name_ar, old.last_name_ar) then
      ar := null;
    end if;
  end if;
  if (en is not null and exists (
        select 1 from core.profiles p
        where p.id <> new.id
          and private.name_key(p.first_name_en, p.father_name_en, p.grandfather_name_en, p.last_name_en) = en))
    or (ar is not null and exists (
        select 1 from core.profiles p
        where p.id <> new.id
          and private.name_key(p.first_name_ar, p.father_name_ar, p.grandfather_name_ar, p.last_name_ar) = ar)) then
    raise exception 'name_taken' using errcode = '23505',
      hint = 'This full name belongs to another account.';
  end if;
  return new;
end;
$$;
revoke all on function private.one_person_one_name() from public, anon, authenticated;

create trigger one_person_one_name
  before insert or update of first_name_en, father_name_en, grandfather_name_en, last_name_en,
    first_name_ar, father_name_ar, grandfather_name_ar, last_name_ar
  on core.profiles
  for each row execute function private.one_person_one_name();

-- ── 4. The website policies ─────────────────────────────────────────────────
delete from governance.society_documents where code = 'SAL-PLT-10';

update governance.society_documents set body_en = replace(body_en,
  'the Diwan (auibsal.org/diwan), the Society''s API (auibsal.org/api) and the Society''s emails',
  'the Diwan (auibsal.org/diwan), Hudhud (the Society''s Telegram bot) and the Society''s emails')
where code = 'SAL-PLT-01';

update governance.society_documents set body_en = replace(replace(body_en,
  'on auibsal.org, the Diwan and through the API, and to messages sent in the Society''s name',
  'on auibsal.org, the Diwan and through Hudhud, and to messages sent in the Society''s name'),
  E'<li>Use the API only as the API Terms (SAL-PLT-10) allow.</li>\n', '')
where code = 'SAL-PLT-02';

update governance.society_documents set body_en = replace(replace(body_en,
  'the Book of Members and the Book of Fellows', 'the Register and the Roll of Fellows'),
  'Qirtas issues', 'Qirtas Editions')
where code = 'SAL-PLT-04';

update governance.society_documents set body_en = replace(body_en,
  'work submitted through the Diwan or the API to Qirtas, the Prizes and other Society programs',
  'work sent through auibsal.org/qirtas/write to Qirtas, the Qirtas Awards and other Society programs')
where code = 'SAL-PLT-05';

update governance.society_documents set body_en = replace(body_en,
  'Use the request form on auibsal.org/programs/side-quest/care for Side Quest',
  'Use the request form on auibsal.org/qirtas/next-stop/care for Next Stop')
where code = 'SAL-PLT-09';

-- Sentry, Arcjet and Better Stack are gone (owner, Oct 31, 2026): errors and
-- logs stay in the host's runtime log.
update governance.society_documents
set body_en = replace(replace(replace(body_en, 'error reports (Sentry)', 'error reports'),
  ' (Sentry)', ''), ' (Arcjet)', '')
where body_en ~ '\((Sentry|Arcjet)\)';
