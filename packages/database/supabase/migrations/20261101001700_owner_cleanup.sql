-- The owner's cleanup (Oct 31, 2026, last):
--
-- 1. One Shaheen Farjo: every account under that name other than the one
--    holding the President's role is deleted. What their bylines carried
--    moves to the President's byline first, so no piece loses its author.
-- 2. The IDEA is no longer a partner: its record goes, with its memorandum,
--    perks, invitations, guests and team roles.
-- 3. Qirtas's October archive reads as if the paper had always had its
--    current name and structure: the Society's pieces are rewritten, and
--    every piece's note credits Qirtas.

-- ── 1. One Shaheen Farjo ────────────────────────────────────────────────────
do $$
declare
  v_keep uuid;
  v_keepers integer;
  v_byline uuid;
  v_dups uuid[];
begin
  create temporary table shaheen_accounts on commit drop as
  select p.id
  from core.profiles p
  where lower(btrim(p.full_name_en)) = 'shaheen farjo'
    or private.name_key(p.first_name_en, p.father_name_en, p.grandfather_name_en, p.last_name_en)
      = 'shaheen karam muwafaq farjo';

  select count(distinct s.id), (array_agg(distinct s.id))[1] into v_keepers, v_keep
  from shaheen_accounts s
  join access.role_assignments r on r.user_id = s.id
  where r.role = 'president' and r.scope_type = 'global'
    and r.starts_at <= now() and (r.ends_at is null or r.ends_at > now());

  if v_keepers <> 1 then
    raise notice 'Not exactly one Shaheen Farjo holds the President''s role (%): no account deleted', v_keepers;
    return;
  end if;

  select array_agg(s.id) into v_dups from shaheen_accounts s where s.id <> v_keep;
  if v_dups is null then
    return;
  end if;

  -- The President's own-name byline takes the duplicates' own-name bylines;
  -- their pen names become the President's.
  select c.id into v_byline from journal.contributors c
  where c.user_id = v_keep and not c.is_pen_name
  order by c.created_at
  limit 1;
  if v_byline is null then
    update journal.contributors c set user_id = v_keep
    where c.id = (
      select c2.id from journal.contributors c2
      where c2.user_id = any (v_dups) and not c2.is_pen_name
      order by c2.created_at limit 1
    )
    returning c.id into v_byline;
  end if;

  if v_byline is not null then
    update journal.pieces p set contributor_id = v_byline
    from journal.contributors c
    where c.id = p.contributor_id and c.user_id = any (v_dups) and not c.is_pen_name;
    insert into journal.piece_credits (piece_id, contributor_id, role)
    select pc.piece_id, v_byline, pc.role
    from journal.piece_credits pc
    join journal.contributors c on c.id = pc.contributor_id
    where c.user_id = any (v_dups) and not c.is_pen_name
    on conflict do nothing;
    delete from journal.contributors c
    where c.user_id = any (v_dups) and not c.is_pen_name;
  end if;
  update journal.contributors set user_id = v_keep where user_id = any (v_dups);

  -- Deleting the sign-in account removes the profile, membership, card,
  -- pledges, bookings and roles with it (as account deletion does).
  delete from auth.users u where u.id = any (v_dups);
  raise notice 'Deleted % duplicate Shaheen Farjo account(s)', cardinality(v_dups);
end;
$$;

-- ── 2. The IDEA ─────────────────────────────────────────────────────────────
do $$
declare
  v_ids uuid[];
begin
  select array_agg(p.id) into v_ids
  from governance.partners p
  where lower(btrim(p.name_en)) in ('the idea', 'the idea iq', 'the idea iraq')
    or p.slug in ('the-idea', 'the-idea-iq', 'theidea', 'theideaiq', 'idea', 'idea-iq');
  if v_ids is null then
    raise notice 'No partner named The IDEA';
    return;
  end if;

  -- Its team's roles are scoped to it; its openings would block the delete.
  delete from access.role_assignments r
  where r.scope_type = 'partner' and r.scope_id = any (v_ids);
  delete from programmes.openings o where o.partner_id = any (v_ids);
  delete from governance.partners p where p.id = any (v_ids);
end;
$$;

-- ── 3. Qirtas's October archive ─────────────────────────────────────────────
create temporary table qirtas_rewrite (
  slug text primary key,
  new_slug text not null,
  title_en text not null,
  deck_en text not null,
  body_en text not null
) on commit drop;

insert into qirtas_rewrite values
(
  'society-publishes-its-member-handbook',
  'society-publishes-its-member-handbook',
  $t$The Society of Arts and Letters sets out what membership means$t$,
  $t$Free, open to every AUIB student, in Arabic and English: the Member Handbook introduces Qirtas, the Company and six programs.$t$,
  $b$<p>BAGHDAD — The AUIB Society of Arts and Letters (SAL) has issued its Member Handbook, a guide for every member, dated September 28, 2026, and prepared by the Society's founder and president, Shaheen Farjo.</p>
<p>Membership is free and open to every enrolled AUIB student, with no audition, portfolio or fee. A student joins at auibsal.org/join and makes the Member Pledge. Taking part in two Society activities in a semester makes a member a Voting Member, able to vote in elections and stand for office.</p>
<p>The handbook introduces Qirtas, the Society's paper of news, letters and art; the Company, its theater company, with open nights, auditions and productions; and six programs. Second Chapter is a book drive and fair every November. The Typewriter Tour collects six-word stories every March. On Tuesdays, every fourth week, the Salon brings a guest, readings and tea; Book Circle reads one book a month; Open Pages holds a writing workshop; and the Listening Room plays an album or recording in full, then talks about it.</p>
<p>It also describes the Society's traditions: every new member types six words on the Society Typewriter for the Register; the Return marks the Society's anniversary each October; and each April the outgoing president hands the new president a fresh typewriter ribbon.</p>
<p>"Everything we do is free, in Arabic and English, and open to every student," Farjo writes in the handbook's opening letter, inviting students to come to a Salon, type their six words and say what they want to make.</p>
<hr>
<p><em>Qirtas is published by the AUIB Society of Arts and Letters. Qirtas compiled this report in October 2026 from the source below, with the help of an AI writing tool.</em></p>
<p><strong>Source</strong></p>
<ul><li><a href="https://auibsal.org/library/member-handbook">The Member Handbook (September 28, 2026)</a></li></ul>$b$
),
(
  'society-publishes-its-founding-documents',
  'society-publishes-its-founding-documents',
  $t$Society puts its rulebooks and three-year plan online$t$,
  $t$The Bylaws, the Policy Manual, Roles and Staffing and the Strategic Plan join the Constitution in the Library at auibsal.org/library.$t$,
  $b$<p>BAGHDAD — The AUIB Society of Arts and Letters has published its founding documents in its Library on auibsal.org, ahead of Charter Day on October 13, 2026. Alongside the Constitution, anyone can read the Bylaws and Standing Orders, Roles and Staffing, the Policy Manual and the Strategic Plan 2026–2029.</p>
<p>The Strategic Plan traces the Society's short history: a first brief, guidelines and rubric for a campus literary journal in February 2026; the Typewriter Tour in spring 2026, when a typewriter traveled the campus collecting six-word stories, which the plan says "proves the campus will write when invited"; and, in September 2026, the proposals that became Qirtas, the Society's paper, and Next Stop, its video show.</p>
<p>The plan sets targets it calls estimates for a new society, to be reset each April. In its first year, 2026–27, it aims for 60 registered members, 25 of them voting, a full Council seated, the Salon from December and the Society's first elections. By the third year it looks to 200 members and 70 voting, a full production by the Company, a letters day with other Baghdad universities, and a Council run by students who never met the founder.</p>
<p>The plan's own test is October 2029: whether the Return is run by people who never met the founder, with more members than the year before and a program nobody on the founding team imagined. If so, it says, the plan worked.</p>
<hr>
<p><em>Qirtas is published by the AUIB Society of Arts and Letters. Qirtas compiled this report in October 2026 from the sources below, with the help of an AI writing tool.</em></p>
<p><strong>Sources</strong></p>
<ul><li><a href="https://auibsal.org/library">The Society's Library</a></li><li><a href="https://auibsal.org/library/strategic-plan">Strategic Plan 2026–2029 (September 28, 2026)</a></li></ul>$b$
),
(
  'society-ratifies-its-constitution-on-charter-day',
  'society-ratifies-its-constitution-on-charter-day',
  $t$On Charter Day, the Society of Arts and Letters ratifies its Constitution$t$,
  $t$The founding charter makes membership free, puts power in a General Assembly of all members and sets elections every April.$t$,
  $b$<p>BAGHDAD — The AUIB Society of Arts and Letters ratified its Constitution at its Founding General Assembly on Charter Day, Tuesday, October 13, 2026.</p>
<p>The Constitution, prepared by the founder and president, Shaheen Farjo, opens with a preamble written for the city: students "in a city that once kept the House of Wisdom and still keeps al-Mutanabbi Street" adopting it "so that our Society is open to every student, governed in the open, careful with people and money, and built to outlast those who founded it."</p>
<p>It sets the Society's mission, "to cultivate a culture of literature and creative expression across AUIB," and its motto, "The paper and the pen," the last two of the things al-Mutanabbi's most quoted line says know him.</p>
<p>Membership is free and open to every enrolled AUIB student. All authority comes from the General Assembly of members, which elects the officers, amends the Constitution by a two-thirds vote with fourteen days' notice, and can remove anyone who abuses a role. A Council of three elected officers, the President, the Vice President and the General Secretary, and six directors runs the Society between assemblies and meets every two weeks. Elections are held every April by secret ballot with AUIB sign-in, using ranked choice when more than two candidates stand, and a president may serve at most two terms.</p>
<p>Editors and directors make creative decisions; the Council may overrule a selection only on grounds of law, safety or University policy, and in writing. The Society holds no money of its own: the Office of Student Life provides what it needs. The one exception is Second Chapter's collection, which belongs to its charity partner and is counted by two people and handed over, witnessed, with a receipt.</p>
<p>The names of those who adopted the Constitution are kept on the Founders' Roll, and the Return will mark the anniversary every October.</p>
<hr>
<p><em>Qirtas is published by the AUIB Society of Arts and Letters. Qirtas compiled this report in October 2026 from the sources below, with the help of an AI writing tool.</em></p>
<p><strong>Sources</strong></p>
<ul><li><a href="https://auibsal.org/library/constitution">The Constitution</a></li><li><a href="https://auibsal.org/library/member-handbook">The Member Handbook</a></li></ul>$b$
),
(
  'waraq-launches-as-one-paper',
  'qirtas-launches-as-one-paper',
  $t$Qirtas launches: news, letters and art in one bilingual paper$t$,
  $t$The Society brings its literary journal, campus news, the gallery, Six Words and Next Stop into one paper with six sections. Edition 1 opens for submissions on October 25.$t$,
  $b$<p>BAGHDAD — The AUIB Society of Arts and Letters launched Qirtas on October 14, 2026: a single bilingual paper of news, letters and art on auibsal.org, with its own masthead and editorial independence.</p>
<p>Qirtas, Arabic for "paper," is organized in six sections. News covers the campus and is always open to pitches. Voices carries reviews, columns, opinion essays and letters to the editor. Letters publishes poetry, fiction, creative nonfiction, drama, translation and Six Words. Gallery shows art, photography, illustration, comics and calligraphy. Video carries Next Stop, Qirtas's video show, and Games has crosswords, quizzes and word puzzles.</p>
<p>Members may send work to any section at any time from auibsal.org/qirtas/write, and everything sent is read blind: readers never see an author's name before a decision. Letters and Gallery also publish in Editions, each opened by a call and printed. The call for Edition 1 opens on October 25 and closes on December 3, with decisions on December 17. Current AUIB students and alumni may send up to two pieces each. Faculty and staff appear by invitation.</p>
<p>Authors keep their copyright, and the author approves every change made in editing. The News section's standards require two sources for any claim about a person or office and open, dated corrections.</p>
<hr>
<p><em>Qirtas is published by the AUIB Society of Arts and Letters. Qirtas compiled this report in October 2026 from the sources below, with the help of an AI writing tool.</em></p>
<p><strong>Sources</strong></p>
<ul><li><a href="https://auibsal.org/qirtas">Qirtas on auibsal.org</a></li><li><a href="https://auibsal.org/qirtas/editions">Qirtas: Editions and the open call</a></li></ul>$b$
);

update journal.pieces p
set slug = r.new_slug, title_en = r.title_en, deck_en = r.deck_en
from qirtas_rewrite r
where p.slug = r.slug
  and not exists (select 1 from journal.pieces o where o.slug = r.new_slug and o.id <> p.id);

update journal.piece_bodies b
set body_en = r.body_en
from qirtas_rewrite r
join journal.pieces p on p.slug = r.new_slug
where b.piece_id = p.id;

-- Every other archived piece: the note credits Qirtas.
update journal.piece_bodies
set body_en = replace(replace(body_en,
  'Waraq is published by the Society of Arts and Letters.',
  'Qirtas is published by the AUIB Society of Arts and Letters.'),
  'Waraq''s News Desk compiled this report',
  'Qirtas compiled this report')
where body_en like '%Waraq''s News Desk compiled this report%';
