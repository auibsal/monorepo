-- The Qirtas Prizes (owner, Oct 29, 2026). Six prizes: the Mutanabbi Prize
-- for the whole paper, and one for each of five sections: the Tabari Prize
-- (News), the Jahiz Prize (Voices), the Nazik Prize (Letters), the Wasiti
-- Prize (Gallery) and the Ibn al-Haytham Prize (Video).
--
-- Each year is a round, with the day its shortlists are announced and the
-- day the prizes are awarded (the first: April 4 and April 20, 2027). The
-- Diwan records the shortlists, the judges and the winners; the public
-- page at /qirtas/prizes shows a shortlist from its day and the winners
-- from theirs (journal.prize_results, which never shows a winner early).
-- Winners and the shortlisted are given a certificate, signed as every
-- certificate is (membership.certificates, kind 'prize').
--
-- The certificates also gain the kind 'apprenticeship' (the Callboard's
-- Apprenticeship, 20261029000700).

-- ── Who runs the Prizes ─────────────────────────────────────────────────────

insert into access.permissions (key, description) values
  ('journal.prizes', 'The Qirtas Prizes: rounds, shortlists, judges, winners and their certificates');

insert into access.role_permissions (role, permission) values
  ('eic', 'journal.prizes'),
  ('managing_editor', 'journal.prizes'),
  ('president', 'journal.prizes');

create function private.runs_the_prizes()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_permission_anywhere('journal.prizes');
$$;

-- ── The six prizes ──────────────────────────────────────────────────────────

create table journal.prizes (
  key text primary key check (key ~ '^[a-z_]+$'),
  name_en text not null check (char_length(name_en) <= 100),
  name_ar text not null check (char_length(name_ar) <= 100),
  -- The section it is for; the Mutanabbi Prize is for the whole paper.
  desk journal.desk,
  sort integer not null default 0
);

comment on table journal.prizes is
  'The six Qirtas Prizes. Anyone reads them; they change only by migration.';

insert into journal.prizes (key, name_en, name_ar, desk, sort) values
  ('mutanabbi', 'The Mutanabbi Prize', 'جائزة المتنبي', null, 10),
  ('tabari', 'The Tabari Prize', 'جائزة الطبري', 'news', 20),
  ('jahiz', 'The Jahiz Prize', 'جائزة الجاحظ', 'voices', 30),
  ('nazik', 'The Nazik Prize', 'جائزة نازك', 'letters', 40),
  ('wasiti', 'The Wasiti Prize', 'جائزة الواسطي', 'gallery', 50),
  ('ibn_al_haytham', 'The Ibn al-Haytham Prize', 'جائزة ابن الهيثم', 'video', 60);

alter table journal.prizes enable row level security;

create policy "Anyone reads the prizes" on journal.prizes
  for select to anon, authenticated using (true);
create policy "Third-party apps reach only their areas" on journal.prizes
  as restrictive for all to authenticated
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));

revoke all on journal.prizes from anon, authenticated;
grant select on journal.prizes to anon, authenticated;
grant all on journal.prizes to service_role;

-- ── Rounds ──────────────────────────────────────────────────────────────────

create table journal.prize_rounds (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title_en text not null check (char_length(title_en) <= 200),
  title_ar text not null check (char_length(title_ar) <= 200),
  -- Baghdad days.
  shortlist_on date not null,
  awarded_on date not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (awarded_on >= shortlist_on)
);

comment on table journal.prize_rounds is
  'A year of the Qirtas Prizes: when the shortlists are announced and the prizes awarded.';

create trigger set_updated_at before update on journal.prize_rounds
  for each row execute function private.set_updated_at();
create trigger log_activity after insert or update or delete on journal.prize_rounds
  for each row execute function private.log_activity();
create trigger revalidate after insert or update or delete on journal.prize_rounds
  for each statement execute function private.queue_revalidation('journal');

alter table journal.prize_rounds enable row level security;

create policy "Select by anon and authenticated" on journal.prize_rounds
  for select to anon, authenticated
  using (is_published or (select private.runs_the_prizes()));
create policy "The Prizes' officers add rounds" on journal.prize_rounds
  for insert to authenticated with check ((select private.runs_the_prizes()));
create policy "The Prizes' officers edit rounds" on journal.prize_rounds
  for update to authenticated
  using ((select private.runs_the_prizes()))
  with check ((select private.runs_the_prizes()));
create policy "The Prizes' officers remove rounds" on journal.prize_rounds
  for delete to authenticated using ((select private.runs_the_prizes()));
create policy "Third-party apps reach only their areas" on journal.prize_rounds
  as restrictive for all to authenticated
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));

revoke all on journal.prize_rounds from anon, authenticated;
grant select on journal.prize_rounds to anon;
grant select, insert, update, delete on journal.prize_rounds to authenticated;
grant all on journal.prize_rounds to service_role;

insert into journal.prize_rounds (slug, title_en, title_ar, shortlist_on, awarded_on, is_published)
values ('2027', 'The Qirtas Prizes 2027', 'جوائز قرطاس 2027', date '2027-04-04', date '2027-04-20', true);

-- ── Shortlists and winners ──────────────────────────────────────────────────

create table journal.prize_entries (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references journal.prize_rounds (id) on delete cascade,
  prize_key text not null references journal.prizes (key),
  piece_id uuid not null references journal.pieces (id) on delete cascade,
  won boolean not null default false,
  certificate_id uuid references membership.certificates (id) on delete set null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (round_id, prize_key, piece_id)
);

comment on table journal.prize_entries is
  'The shortlists: published pieces up for a prize in a round, and whether each won. Only the Prizes'' officers read the table; the public reads journal.prize_results().';

create index prize_entries_prize_key_idx on journal.prize_entries (prize_key);
create index prize_entries_piece_id_idx on journal.prize_entries (piece_id);
create index prize_entries_certificate_id_idx on journal.prize_entries (certificate_id);
create index prize_entries_created_by_idx on journal.prize_entries (created_by);

create trigger set_updated_at before update on journal.prize_entries
  for each row execute function private.set_updated_at();
create trigger log_activity after insert or update or delete on journal.prize_entries
  for each row execute function private.log_activity();
create trigger revalidate after insert or update or delete on journal.prize_entries
  for each statement execute function private.queue_revalidation('journal');

-- A shortlisted piece is published, and from the prize's section.
create function private.prize_entry_valid()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p journal.pieces;
  section journal.desk;
begin
  select * into p from journal.pieces where id = new.piece_id;
  if p.status <> 'published' then
    raise exception 'prize_piece_unpublished' using errcode = '22023';
  end if;
  select z.desk into section from journal.prizes z where z.key = new.prize_key;
  if section is not null and p.desk <> section then
    raise exception 'prize_wrong_section' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger prize_entry_valid before insert or update of piece_id, prize_key on journal.prize_entries
  for each row execute function private.prize_entry_valid();

alter table journal.prize_entries enable row level security;

create policy "The Prizes' officers read the shortlists" on journal.prize_entries
  for select to authenticated using ((select private.runs_the_prizes()));
create policy "The Prizes' officers shortlist" on journal.prize_entries
  for insert to authenticated with check ((select private.runs_the_prizes()));
create policy "The Prizes' officers mark winners" on journal.prize_entries
  for update to authenticated
  using ((select private.runs_the_prizes()))
  with check ((select private.runs_the_prizes()));
create policy "The Prizes' officers take pieces off" on journal.prize_entries
  for delete to authenticated using ((select private.runs_the_prizes()));
create policy "Third-party apps reach only their areas" on journal.prize_entries
  as restrictive for all to authenticated
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));

revoke all on journal.prize_entries from anon, authenticated;
grant select, insert, update, delete on journal.prize_entries to authenticated;
grant all on journal.prize_entries to service_role;

-- ── Judges ──────────────────────────────────────────────────────────────────

create table journal.prize_judges (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references journal.prize_rounds (id) on delete cascade,
  prize_key text not null references journal.prizes (key),
  name_en text not null check (char_length(name_en) <= 200),
  name_ar text not null check (char_length(name_ar) <= 200),
  -- When the judge has an account.
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table journal.prize_judges is
  'Who judges each prize in a round. Only the Prizes'' officers read and write it.';

create index prize_judges_round_id_idx on journal.prize_judges (round_id);
create index prize_judges_prize_key_idx on journal.prize_judges (prize_key);
create index prize_judges_user_id_idx on journal.prize_judges (user_id);

create trigger log_activity after insert or update or delete on journal.prize_judges
  for each row execute function private.log_activity();

alter table journal.prize_judges enable row level security;

create policy "The Prizes' officers read the judges" on journal.prize_judges
  for select to authenticated using ((select private.runs_the_prizes()));
create policy "The Prizes' officers name judges" on journal.prize_judges
  for insert to authenticated with check ((select private.runs_the_prizes()));
create policy "The Prizes' officers edit judges" on journal.prize_judges
  for update to authenticated
  using ((select private.runs_the_prizes()))
  with check ((select private.runs_the_prizes()));
create policy "The Prizes' officers remove judges" on journal.prize_judges
  for delete to authenticated using ((select private.runs_the_prizes()));
create policy "Third-party apps reach only their areas" on journal.prize_judges
  as restrictive for all to authenticated
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));

revoke all on journal.prize_judges from anon, authenticated;
grant select, insert, update, delete on journal.prize_judges to authenticated;
grant all on journal.prize_judges to service_role;

-- ── What the public sees ────────────────────────────────────────────────────

-- A published round's shortlists from their day, and its winners from the
-- day of the award (Baghdad). Before then a winner is only shortlisted.
create function private.prize_results(round_slug text)
returns table (
  prize_key text, piece_slug text, title_en text, title_ar text,
  author_en text, author_ar text, won boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.prize_key, p.slug, p.title_en, p.title_ar, c.name_en, c.name_ar,
    e.won and (now() at time zone 'Asia/Baghdad')::date >= r.awarded_on
  from journal.prize_entries e
  join journal.prize_rounds r on r.id = e.round_id
  join journal.pieces p on p.id = e.piece_id
  left join journal.contributors c on c.id = p.contributor_id
  where r.slug = prize_results.round_slug
    and r.is_published
    and p.status = 'published'
    and (now() at time zone 'Asia/Baghdad')::date >= r.shortlist_on
  order by e.prize_key, p.title_en;
$$;

revoke all on function private.runs_the_prizes(), private.prize_entry_valid(), private.prize_results(text)
  from public, anon, authenticated;
grant execute on function private.runs_the_prizes(), private.prize_results(text)
  to anon, authenticated, service_role;

create function journal.prize_results(round_slug text)
returns table (
  prize_key text, piece_slug text, title_en text, title_ar text,
  author_en text, author_ar text, won boolean
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.prize_results($1) $$;

revoke all on function journal.prize_results(text) from public;
grant execute on function journal.prize_results(text) to anon, authenticated, service_role;

-- ── Certificates ────────────────────────────────────────────────────────────

alter table membership.certificates drop constraint certificates_kind_check;
alter table membership.certificates add constraint certificates_kind_check check (
  kind in ('service', 'fellowship', 'honorary', 'volunteer', 'production', 'partner', 'prize', 'apprenticeship')
);
alter table membership.certificates drop constraint certificates_check1;
alter table membership.certificates add constraint certificates_check1 check (
  kind not in ('service', 'production', 'partner', 'apprenticeship')
  or (role_en is not null and period_from is not null)
);
alter table membership.certificates add constraint certificates_prize_citation check (
  kind <> 'prize' or citation_en is not null
);

-- Drafts for the round's winners and shortlisted writers who have an
-- account, once the prizes are awarded; the President and the Faculty
-- Advisor sign them as any certificate. Returns how many were made.
create function private.prepare_prize_certificates(round uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r journal.prize_rounds;
  e record;
  made uuid;
  n integer := 0;
begin
  if not private.runs_the_prizes() then
    raise exception 'journal.prizes is required' using errcode = '42501';
  end if;
  select * into r from journal.prize_rounds where id = prepare_prize_certificates.round;
  if r.id is null then
    raise exception 'Round not found' using errcode = 'P0002';
  end if;
  if (now() at time zone 'Asia/Baghdad')::date < r.awarded_on then
    raise exception 'prizes_not_awarded' using errcode = '22023';
  end if;
  for e in
    select pe.id, pe.won, c.user_id, regexp_replace(z.name_en, '^The ', 'the ') as name_en,
      z.name_ar, p.title_en, p.title_ar
    from journal.prize_entries pe
    join journal.prizes z on z.key = pe.prize_key
    join journal.pieces p on p.id = pe.piece_id
    join journal.contributors c on c.id = p.contributor_id
    where pe.round_id = r.id and pe.certificate_id is null and c.user_id is not null
  loop
    insert into membership.certificates (user_id, kind, citation_en, citation_ar, period_from, period_to)
    values (
      e.user_id, 'prize',
      case when e.won
        then 'won ' || e.name_en || ' for “' || e.title_en || '”'
        else 'was shortlisted for ' || e.name_en || ' for “' || e.title_en || '”' end,
      case when e.won
        then 'فاز بـ' || e.name_ar || ' عن «' || coalesce(e.title_ar, e.title_en) || '»'
        else 'بلغ القائمة القصيرة لـ' || e.name_ar || ' عن «' || coalesce(e.title_ar, e.title_en) || '»' end,
      r.awarded_on, r.awarded_on
    )
    returning id into made;
    update journal.prize_entries set certificate_id = made where id = e.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function private.prepare_prize_certificates(uuid) from public, anon;
grant execute on function private.prepare_prize_certificates(uuid) to authenticated, service_role;

create function journal.prepare_prize_certificates(round uuid)
returns integer
language sql
volatile
security invoker
set search_path = ''
as $$ select private.prepare_prize_certificates($1) $$;

revoke all on function journal.prepare_prize_certificates(uuid) from public, anon;
grant execute on function journal.prepare_prize_certificates(uuid) to authenticated, service_role;
