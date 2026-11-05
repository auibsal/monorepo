-- The design review, PR 5b (Nov 4, 2026), A33, decision D12: Book Circle's
-- members vote among three books the host chooses. The host opens a ballot
-- in the Diwan (the program's Vote tab) with up to three books and a
-- closing time; members vote once (and may change their vote) while it is
-- open; the counts show to everyone once it closes, and to the host
-- throughout. A ballot belongs to a program, so another may vote later.

create table programmes.book_ballots (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references core.programmes (id) on delete cascade,
  title_en text not null default '' check (char_length(title_en) <= 120),
  title_ar text not null default '' check (char_length(title_ar) <= 120),
  closes_at timestamptz not null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint book_ballots_named check (title_en <> '' or title_ar <> ''),
  constraint book_ballots_closes_later check (closes_at > created_at)
);

create table programmes.book_choices (
  id uuid primary key default gen_random_uuid(),
  ballot_id uuid not null references programmes.book_ballots (id) on delete cascade,
  title_en text not null default '' check (char_length(title_en) <= 200),
  title_ar text not null default '' check (char_length(title_ar) <= 200),
  author_en text not null default '' check (char_length(author_en) <= 200),
  author_ar text not null default '' check (char_length(author_ar) <= 200),
  created_at timestamptz not null default now(),
  constraint book_choices_named check (title_en <> '' or title_ar <> '')
);

create table programmes.book_votes (
  ballot_id uuid not null references programmes.book_ballots (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  choice_id uuid not null references programmes.book_choices (id) on delete cascade,
  voted_at timestamptz not null default now(),
  primary key (ballot_id, user_id)
);

comment on table programmes.book_ballots is
  'A program''s vote among books its host chose (Book Circle, D12): open until closes_at.';
comment on table programmes.book_choices is
  'The books on a ballot: three at most.';
comment on table programmes.book_votes is
  'One vote per member per ballot, read only by the voter; counts through programmes.ballot_counts().';

create index book_ballots_programme_idx on programmes.book_ballots (programme_id, closes_at desc);
create index book_ballots_created_by_idx on programmes.book_ballots (created_by);
create index book_choices_ballot_idx on programmes.book_choices (ballot_id, created_at);
create index book_votes_user_idx on programmes.book_votes (user_id);
create index book_votes_choice_idx on programmes.book_votes (choice_id);

-- Three books at most, and none added or removed once someone has voted.
create function private.book_choices_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ballot uuid := coalesce(new.ballot_id, old.ballot_id);
begin
  if exists (select 1 from programmes.book_votes v where v.ballot_id = ballot) then
    raise exception 'ballot_has_votes' using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT'
    and (select count(*) from programmes.book_choices c where c.ballot_id = ballot) >= 3 then
    raise exception 'three_books' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function private.book_choices_guard() from public, anon, authenticated;

create trigger three_books
  before insert or delete on programmes.book_choices
  for each row execute function private.book_choices_guard();

-- A vote names a book on the same ballot.
create function private.book_vote_matches()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from programmes.book_choices c
    where c.id = new.choice_id and c.ballot_id = new.ballot_id
  ) then
    raise exception 'choice_not_on_ballot' using errcode = 'P0001';
  end if;
  new.voted_at := now();
  return new;
end;
$$;
revoke all on function private.book_vote_matches() from public, anon, authenticated;

create trigger vote_matches
  before insert or update on programmes.book_votes
  for each row execute function private.book_vote_matches();

alter table programmes.book_ballots enable row level security;
alter table programmes.book_choices enable row level security;
alter table programmes.book_votes enable row level security;

revoke all on programmes.book_ballots, programmes.book_choices, programmes.book_votes from anon, authenticated;
grant select on programmes.book_ballots, programmes.book_choices to anon, authenticated;
grant insert (programme_id, title_en, title_ar, closes_at) on programmes.book_ballots to authenticated;
grant update (title_en, title_ar, closes_at) on programmes.book_ballots to authenticated;
grant delete on programmes.book_ballots to authenticated;
grant insert (ballot_id, title_en, title_ar, author_en, author_ar) on programmes.book_choices to authenticated;
grant delete on programmes.book_choices to authenticated;
grant select, delete on programmes.book_votes to authenticated;
grant insert (ballot_id, choice_id) on programmes.book_votes to authenticated;
grant update (choice_id) on programmes.book_votes to authenticated;
grant all on programmes.book_ballots, programmes.book_choices, programmes.book_votes to service_role;

create policy "No third-party apps" on programmes.book_ballots
  as restrictive for all to authenticated
  using ((select private.client_allows('programmes')))
  with check ((select private.client_allows('programmes')));
create policy "No third-party apps" on programmes.book_choices
  as restrictive for all to authenticated
  using ((select private.client_allows('programmes')))
  with check ((select private.client_allows('programmes')));
create policy "No third-party apps" on programmes.book_votes
  as restrictive for all to authenticated
  using ((select private.client_allows('programmes')))
  with check ((select private.client_allows('programmes')));

create policy "Anyone reads ballots" on programmes.book_ballots
  for select to anon, authenticated using (true);
create policy "Program managers open ballots" on programmes.book_ballots
  for insert to authenticated
  with check ((select private.has_permission('programs.manage', 'programme', programme_id)));
create policy "Program managers change ballots" on programmes.book_ballots
  for update to authenticated
  using ((select private.has_permission('programs.manage', 'programme', programme_id)))
  with check ((select private.has_permission('programs.manage', 'programme', programme_id)));
create policy "Program managers remove ballots" on programmes.book_ballots
  for delete to authenticated
  using ((select private.has_permission('programs.manage', 'programme', programme_id)));

create policy "Anyone reads the books on a ballot" on programmes.book_choices
  for select to anon, authenticated using (true);
create policy "Program managers choose the books" on programmes.book_choices
  for insert to authenticated
  with check (exists (
    select 1 from programmes.book_ballots b
    where b.id = ballot_id
      and (select private.has_permission('programs.manage', 'programme', b.programme_id))
  ));
create policy "Program managers remove books" on programmes.book_choices
  for delete to authenticated
  using (exists (
    select 1 from programmes.book_ballots b
    where b.id = ballot_id
      and (select private.has_permission('programs.manage', 'programme', b.programme_id))
  ));

create policy "Members read their own vote" on programmes.book_votes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Members vote while the ballot is open" on programmes.book_votes
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select membership.is_member((select auth.uid())))
    and exists (select 1 from programmes.book_ballots b where b.id = ballot_id and b.closes_at > now())
  );
create policy "Members change their vote while the ballot is open" on programmes.book_votes
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from programmes.book_ballots b where b.id = ballot_id and b.closes_at > now())
  );
create policy "Members take back their vote while the ballot is open" on programmes.book_votes
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    and exists (select 1 from programmes.book_ballots b where b.id = ballot_id and b.closes_at > now())
  );

-- The counts for each book: for everyone once the ballot closes, for the
-- program's managers throughout. Never who voted.
create function private.ballot_counts(ballot uuid)
returns table (choice_id uuid, votes integer)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, (select count(*)::integer from programmes.book_votes v where v.choice_id = c.id)
  from programmes.book_choices c
  join programmes.book_ballots b on b.id = c.ballot_id
  where c.ballot_id = ballot
    and (b.closes_at <= now()
      or private.has_permission('programs.manage', 'programme', b.programme_id))
  order by c.created_at;
$$;
revoke all on function private.ballot_counts(uuid) from public;
grant execute on function private.ballot_counts(uuid) to anon, authenticated, service_role;

create function programmes.ballot_counts(ballot uuid)
returns table (choice_id uuid, votes integer)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.ballot_counts(ballot) $$;
revoke all on function programmes.ballot_counts(uuid) from public;
grant execute on function programmes.ballot_counts(uuid) to anon, authenticated, service_role;

-- Ballots and their books read in the activity log; votes stay private.
create trigger log_activity
  after insert or update or delete on programmes.book_ballots
  for each row execute function private.log_activity();
create trigger log_activity
  after insert or update or delete on programmes.book_choices
  for each row execute function private.log_activity();
