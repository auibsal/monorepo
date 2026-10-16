-- auibsal.org/governance: who was elected, once the Elections Committee has
-- published an election. Only the outcome per office (the winner's name, or
-- that Re-Open Nominations won), the ballots counted and the turnout; the
-- candidates who were not elected and the counts at each round stay with
-- members in the Nexus (Bylaws B6: the Committee declares them, Form F-23).

create or replace function governance.public_election_results()
returns table (
  election_id uuid,
  election_title_en text,
  election_title_ar text,
  voting_closes_at timestamptz,
  eligible_count integer,
  position_title_en text,
  position_title_ar text,
  position_sort integer,
  winner_name_en text,
  winner_name_ar text,
  ron_won boolean,
  ballots_counted integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.title_en, e.title_ar, e.voting_closes_at, e.eligible_count,
    p.title_en, p.title_ar, p.sort,
    case when r.ron_won then null else pr.full_name_en end,
    case when r.ron_won then null else pr.full_name_ar end,
    r.ron_won, r.ballots_counted
  from governance.elections e
  join governance.election_results r on r.election_id = e.id
  join governance.positions p on p.id = r.position_id
  left join governance.candidates c on c.id = r.winner_candidate_id
  left join core.profiles pr on pr.id = c.user_id
  where e.status = 'published'
  order by e.voting_closes_at desc, p.sort;
$$;

comment on function governance.public_election_results() is
  'Published elections: the outcome per office, ballots counted and turnout. Never the other candidates or the rounds.';

revoke all on function governance.public_election_results() from public;
grant execute on function governance.public_election_results() to anon, authenticated, service_role;
