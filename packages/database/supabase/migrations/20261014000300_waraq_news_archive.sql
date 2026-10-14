-- Waraq's News desk, populated in retrospect (owner, Oct 14, 2026): reports
-- on the American University of Iraq – Baghdad and the Society, written from
-- AUIB's published news and the Society's own documents. Every piece lists
-- its sources and says it was compiled with an AI writing tool; the owner
-- chose to publish them directly, outside the desk's approval rule.
-- Re-running is harmless: existing slugs are left alone.

insert into journal.contributors (slug, name_en, bio_en)
values (
  'waraq-news-desk',
  'Waraq News Desk',
  'The News desk of Waraq, the paper of the AUIB Society of Arts and Letters.'
)
on conflict (slug) do nothing;

create temporary table waraq_news (
  slug text primary key,
  category journal.category not null,
  title_en text not null,
  deck_en text not null,
  published_at timestamptz not null,
  body_en text not null
) on commit drop;

insert into waraq_news values
(
  'iraq-energy-institute-opens-offices-at-auib',
  'article',
  $t$Iraq Energy Institute opens offices on the AUIB campus$t$,
  $t$The research group and the university sign a memorandum of understanding and plan to co-host the sixth Iraq Energy Forum at the former Al-Faw Palace.$t$,
  '2022-01-25 09:00+03',
  $b$<p>BAGHDAD — The Iraq Energy Institute, a non-profit research organization that works on economic reform, energy and sustainable development, has opened offices on the campus of the American University of Iraq – Baghdad, the university announced on January 25, 2022.</p>
<p>The two institutions marked the opening by signing a memorandum of understanding that sets out a general framework for working toward shared goals.</p>
<p>They also said they would jointly host the sixth Iraq Energy Forum on the AUIB campus, together with multinational institutions including the International Energy Agency and the Organization of the Petroleum Exporting Countries. According to the university, the forum was expected to coincide with a visit by OPEC's Secretary General and to mark the sixtieth anniversary of Iraq's role in founding OPEC in Baghdad.</p>
<p>"We are excited about the possibilities this partnership will have for the people of Iraq," said Dr. Michael Mulnix, then AUIB's president. Joint research, he said, "will improve AUIB's ranking while setting a high standard for local universities."</p>
<p>Dr. Gareth Stansfield, the institute's honorary president and a Pro-Vice-Chancellor at the University of Exeter, said the institute "has published numerous publications, run many workshops, and founded the Iraq Energy Forum in Baghdad." He said the institute and the university aimed to support the new government's reforms of the energy sector and the passage of key federal legislation.</p>
<p>Sheikh Adnan Al Janabi, the institute's deputy chairman, spoke of Iraq's need for cooperation between research institutes, civil society and universities at home and abroad. The institute's motto is "Energize Iraq."</p>
<p>At the time, AUIB described itself as a non-profit university founded in 2018, with eight colleges.</p>
<hr>
<p><em>Waraq's News Desk compiled this report in October 2026 from the source below, with the help of an AI writing tool.</em></p>
<p><strong>Source</strong></p>
<ul><li><a href="https://auib.edu.iq/iraq-energy-institute-opens-offices-at-auib-campus/">AUIB: Iraq Energy Institute Opens Offices at AUIB Campus (January 25, 2022)</a></li></ul>$b$
),
(
  'auib-graduates-its-first-class',
  'article',
  $t$AUIB graduates its first class at the Al-Faw Palace$t$,
  $t$Thirty-eight students cross the stage about four years after the university opened, and Dr. Bradley Cook gives his first address as president.$t$,
  '2025-05-24 21:00+03',
  $b$<p>BAGHDAD — The American University of Iraq – Baghdad held its first commencement on Saturday, May 24, 2025, graduating its first cohort about four years after the university opened its doors.</p>
<p>The ceremony took place outdoors in front of the Al-Faw Palace, the former presidential palace that houses the campus. Graduates, their families, faculty and staff were joined by government officials, diplomats, military officers, social figures and business leaders. Thirty-eight students graduated, according to published accounts of the ceremony.</p>
<p>Saadi Waheeb Saihood, whom the university calls its Founding Father, described the day as "a culmination of a dream long awaited; a dream not solely of mine personally or my family, but a national project that I had believed in and sought to achieve." Graduation, he told the class, was "a beginning of a new chapter," not the end of their ties to the university. He announced a forum for AUIB alumni and the completion of a bronze statue of Dr. Michael Mulnix by the Iraqi artist Nidaa' Kadhim, to be placed on campus.</p>
<p>Dr. Mulnix, the university's founding president, said that "all of our graduates found good jobs before they graduated." He announced that he would move from the presidency to become Chairman of the Board of Trustees and President Emeritus, and that his wife, Dr. Esther Mulnix, a professor of psychology, would be named Professor Emerita.</p>
<p>The new president, Dr. Bradley Cook, who had just left the presidency of the American University of Bahrain, gave his first address at AUIB. "Today is a day of pride, joy, and promise," he said, and spoke of "a future of peace, prosperity, and renewal—because I believe in you."</p>
<hr>
<p><em>Waraq's News Desk compiled this report in October 2026 from the sources below, with the help of an AI writing tool.</em></p>
<p><strong>Sources</strong></p>
<ul><li><a href="https://auib.edu.iq/auib-holds-its-first-commencement-ceremony/">AUIB: AUIB Holds its First Commencement Ceremony (May 24, 2025)</a></li><li><a href="https://en.wikipedia.org/wiki/American_University_of_Iraq_-_Baghdad">Wikipedia: American University of Iraq – Baghdad</a></li></ul>$b$
),
(
  'auib-and-somo-discuss-energy-forum',
  'article',
  $t$AUIB and Iraq's oil marketer discuss an energy forum and training$t$,
  $t$President Bradley Cook leads a delegation to the State Oil Marketing Organization, Iraq's representative at OPEC.$t$,
  '2025-10-23 09:00+03',
  $b$<p>BAGHDAD — A delegation from the American University of Iraq – Baghdad, led by President Dr. Bradley Cook, visited the headquarters of the State Oil Marketing Organization (SOMO), Iraq's national representative to OPEC, the university reported on October 23, 2025.</p>
<p>The delegation met SOMO's Director General, Ali Nizar Al-Shatri, and several of the organization's officials.</p>
<p>The two sides discussed a forum the university would host the following May, bringing together leading oil companies and organizations from the energy sector. They also discussed an exchange of expertise between SOMO and AUIB's Center of Excellence for Innovation and Development, including specialized training courses.</p>
<p>The university presented the visit as part of its strategy of "building enduring partnerships that serve its objectives": developing Iraqi talent and supporting the country's economic sectors.</p>
<hr>
<p><em>Waraq's News Desk compiled this report in October 2026 from the source below, with the help of an AI writing tool.</em></p>
<p><strong>Source</strong></p>
<ul><li><a href="https://auib.edu.iq/auib-delegation-visits-somo-headquarters-and-discusses-cooperation/">AUIB: AUIB Delegation Visits SOMO Headquarters and Discusses Cooperation (October 23, 2025)</a></li></ul>$b$
),
(
  'auib-moves-classes-online',
  'article',
  $t$AUIB moves all classes online, citing student safety$t$,
  $t$The university says teaching will continue remotely and asks visitors to call before coming to campus.$t$,
  '2026-03-31 19:20+03',
  $b$<p>BAGHDAD — The American University of Iraq – Baghdad moved to fully online classes on March 31, 2026, saying the step was taken to protect students' safety.</p>
<p>In three updates posted that evening, the university said faculty would remain reachable by email and that students were expected to keep up with their coursework online. Campus access and opening hours could change as the situation was monitored, it said, and visitors were asked to call ahead on extensions 6227 or 6228.</p>
<p>A third notice reaffirmed the university's commitment to educating young Iraqis and said it would keep supporting students and faculty through what it called the current regional challenges.</p>
<p>The university's annual report for 2025–2026 later referred to airport closures and conflict-related disruption during the year.</p>
<hr>
<p><em>Waraq's News Desk compiled this report in October 2026 from the sources below, with the help of an AI writing tool.</em></p>
<p><strong>Sources</strong></p>
<ul><li><a href="https://auib.edu.iq/live-updates/">AUIB: Live Updates (March 31, 2026)</a></li><li><a href="https://auib.edu.iq/about-us/annual-report-2025-2026/">AUIB: Annual Report 2025–2026</a></li></ul>$b$
),
(
  'auib-second-commencement-first-mba-class',
  'article',
  $t$AUIB's second commencement graduates its first MBA class$t$,
  $t$Iraq's president attends as Judge Faiq Zidan receives an honorary doctorate and tells graduates never to compromise their values.$t$,
  '2026-05-23 21:00+03',
  $b$<p>BAGHDAD — The American University of Iraq – Baghdad held its second commencement on May 23, 2026, graduating its second undergraduate class and its first class of Master of Business Administration students. The university's annual report puts the number of graduates at about 150.</p>
<p>Among those attending, according to the university, were the President of the Republic, Nizar Amidi; Judge Dr. Faiq Zidan, President of the Supreme Judicial Council; former Prime Ministers Mohammad Al-Sudani and Mustafa Al-Kadhimi; and ministers, diplomats and business leaders.</p>
<p>Judge Zidan received an honorary doctorate and gave the keynote address, urging graduates "never to compromise your values, no matter how great the temptations may be." President Amidi wished the class "a successful professional life" and said that "progress in knowledge and construction is always the companion of peace and stability."</p>
<p>"Tonight, we celebrate not only achievement, but hope," said AUIB's president, Dr. Bradley Cook. "Iraq does not simply need graduates. Iraq needs builders."</p>
<p>Dr. Saadi Waheeb Saihood, the university's Founding Father and Vice Chairman of its Board of Trustees, presented the Founder's Medal, which bears his name and goes to the graduate with the highest academic standing in each college. Dr. Esther Mulnix was recognized as the university's first Professor Emerita. Eng. Hussein Saadi Saihood, a member of the Board of Trustees, described the graduates as proof of what disciplined work and purposeful initiative can achieve.</p>
<hr>
<p><em>Waraq's News Desk compiled this report in October 2026 from the sources below, with the help of an AI writing tool.</em></p>
<p><strong>Sources</strong></p>
<ul><li><a href="https://auib.edu.iq/auib-holds-its-second-annual-commencement-ceremony/">AUIB: AUIB Holds its Second Annual Commencement Ceremony (May 23, 2026)</a></li><li><a href="https://auib.edu.iq/commencement-2026/">AUIB: Commencement 2026</a></li><li><a href="https://auib.edu.iq/about-us/annual-report-2025-2026/">AUIB: Annual Report 2025–2026</a></li></ul>$b$
),
(
  'auib-and-gallup-national-leadership-institute',
  'article',
  $t$AUIB and Gallup to build Iraq's first National Leadership Institute$t$,
  $t$The institute will train directors-general, deputy ministers and senior civil servants first, mostly in Arabic, and later business leaders.$t$,
  '2026-07-08 09:00+03',
  $b$<p>BAGHDAD — The American University of Iraq – Baghdad and Gallup announced on July 8, 2026, a long-term partnership to establish a permanent National Leadership Institute at AUIB, which they describe as Iraq's first.</p>
<p>The partnership builds on a memorandum of understanding signed in London on June 10, 2026, by AUIB's founder, Dr. Saadi Saihood, and Gallup's chairman, Jim Clifton. Alongside the institute, a new research center affiliated with AUIB will bring Gallup's expertise in opinion research, analytics, leadership science and institutional assessment to Iraq.</p>
<p>Programs will first serve public-sector leaders, including directors-general, deputy ministers and senior civil servants, and later private-sector leaders such as entrepreneurs and business executives. They will be delivered mainly in Arabic and designed for Iraq. The two partners will co-design the curriculum, set quality standards, prepare faculty and certify leadership coaches. Once fully operational, the institute is meant to train hundreds of leaders a year; the size of the first cohorts will be announced later.</p>
<p>"Iraq has never lacked talent, ambition, or courage. What every nation needs is a place to grow its own leaders," Clifton said.</p>
<p>"For too long, Iraq's most capable people were told their futures lay elsewhere," said Dr. Saihood.</p>
<hr>
<p><em>Waraq's News Desk compiled this report in October 2026 from the source below, with the help of an AI writing tool.</em></p>
<p><strong>Source</strong></p>
<ul><li><a href="https://auib.edu.iq/the-american-university-of-iraq-baghdad-and-gallup-launch-first-national-leadership-institute-in-iraq/">AUIB: The American University of Iraq – Baghdad and Gallup Launch First National Leadership Institute in Iraq (July 8, 2026)</a></li></ul>$b$
),
(
  'petroleum-engineers-plan-auib-student-chapter',
  'article',
  $t$Petroleum engineers' society visits AUIB; a student chapter is planned$t$,
  $t$The Society of Petroleum Engineers meets students of the College of Engineering and Applied Sciences.$t$,
  '2026-07-13 09:00+03',
  $b$<p>BAGHDAD — A delegation from the Society of Petroleum Engineers (SPE), one of the largest professional associations for petroleum engineers, visited the College of Engineering and Applied Sciences at the American University of Iraq – Baghdad, the university reported on July 13, 2026.</p>
<p>The delegation was led by Baraa Zubaidi, SPE's vice chairperson, and Dr. Ahmed Kareem Al-Hussaini, its treasurer. In an interactive presentation, they described how professional societies build technical skills, leadership and international networks, and how SPE links universities and industry through technical events, mentorship, research and career development.</p>
<p>The university and SPE plan to establish an SPE Student Chapter at AUIB, offering technical workshops, contact with industry, international competitions and professional certification. The university said the visit drew strong interest from students in its Petroleum Engineering program. No formal agreement was reported.</p>
<p>"Professional societies are essential partners in modern engineering education," said Professor Salah Al-Majeed, the college's dean. "Establishing an SPE Student Chapter creates a strong platform for our students."</p>
<hr>
<p><em>Waraq's News Desk compiled this report in October 2026 from the source below, with the help of an AI writing tool.</em></p>
<p><strong>Source</strong></p>
<ul><li><a href="https://auib.edu.iq/?p=13487">AUIB: AUIB Advances Industry-Academia Collaboration Through Partnership with the Society of Petroleum Engineers (July 13, 2026)</a></li></ul>$b$
),
(
  'auib-shortlisted-for-the-leadership-award',
  'article',
  $t$AUIB shortlisted for a Times Higher Education leadership award$t$,
  $t$The university is a finalist for Leadership and Management Team of the Year at the THE Awards Arab World 2026; winners are named on November 4 in Morocco.$t$,
  '2026-07-16 09:00+03',
  $b$<p>BAGHDAD — The American University of Iraq – Baghdad has been shortlisted for Leadership and Management Team of the Year at the Times Higher Education Awards Arab World 2026, the university announced on July 16, 2026.</p>
<p>The winners will be announced on November 4 at THE's Arab Universities Summit, held at Mohammed VI Polytechnic University in Morocco.</p>
<p>AUIB said the nomination recognized its leadership and management team's vision, dedication and teamwork in growing the university.</p>
<p>"Universities across this region have faced immense challenges over the past year," said Chris Havergal, the editor of Times Higher Education, in remarks quoted by the university. "Arab universities continue to excel in the face of adversity," he said, adding that the credit "must go to the individuals and teams behind the shortlisted entries."</p>
<hr>
<p><em>Waraq's News Desk compiled this report in October 2026 from the source below, with the help of an AI writing tool.</em></p>
<p><strong>Source</strong></p>
<ul><li><a href="https://auib.edu.iq/?p=13526">AUIB: Times Higher Education Shortlists AUIB for Leadership and Management Team of the Year Award (July 16, 2026)</a></li></ul>$b$
),
(
  'auib-signs-law-and-leadership-agreements-in-washington',
  'article',
  $t$In Washington, AUIB signs agreements on law and leadership$t$,
  $t$A pathway to an LL.M. at George Mason University's Antonin Scalia Law School, and a permanent Leadership Institute with Gallup.$t$,
  '2026-07-18 09:00+03',
  $b$<p>WASHINGTON — The American University of Iraq – Baghdad signed two agreements at the U.S.–Iraq Business Summit in Washington in July 2026, the university announced.</p>
<p>The first, between AUIB's College of Law and George Mason University's Antonin Scalia Law School, creates a graduate transfer program in Global Antitrust Law and Economics that gives AUIB students a direct path to a Master of Laws (LL.M.) at Scalia Law. The university said the aim is to build Iraqi expertise in antitrust and competition law, in support of market competition, the investment climate and economic governance in line with international standards.</p>
<p>The second, with Gallup, establishes AUIB's Leadership Institute as a permanent center offering executive education, applied research, leadership coaching and professional development for leaders in Iraq's public institutions, private sector and civil society.</p>
<p>The summit, hosted by the U.S. Chamber of Commerce through its U.S.-Iraq Business Council, coincided with Prime Minister Ali Al-Zaidi's first visit to Washington. The Chamber reported more than fifty agreements and memorandums of understanding signed, worth over $60 billion in all.</p>
<hr>
<p><em>Waraq's News Desk compiled this report in October 2026 from the sources below, with the help of an AI writing tool.</em></p>
<p><strong>Sources</strong></p>
<ul><li><a href="https://auib.edu.iq/?p=13537">AUIB: AUIB Signs Landmark Agreements at U.S.-Iraq Business Summit in Washington (July 17, 2026)</a></li><li><a href="https://www.uschamber.com/international/u-s-chamber-hosts-historic-u-s-iraq-business-summit-with-iraqi-prime-minister-al-zaidi-marking-over-60-billion-in-deal-signings">U.S. Chamber of Commerce: U.S. Chamber Hosts Historic U.S.-Iraq Business Summit (July 18, 2026)</a></li></ul>$b$
),
(
  'auib-law-students-take-environmental-bills-to-parliament',
  'article',
  $t$AUIB law students take environmental bills to Parliament$t$,
  $t$Students and graduates present draft laws on recycling, sustainable development and a standalone environmental law to three parliamentary committees.$t$,
  '2026-07-19 09:00+03',
  $b$<p>BAGHDAD — Students and graduates of the College of Law at the American University of Iraq – Baghdad presented proposals for environmental legislation to members of the Iraqi Council of Representatives, the university reported on July 19, 2026.</p>
<p>The presentations were part of the Youth Environmental Legal Leadership (YELL) Program, run by the Institute for International Law and Human Rights (IILHR) with the college. They were made to members of the Parliamentary Committee on Agriculture, Water, and Marshes, the Parliamentary Legal Committee and the Parliamentary Committee on Investment and Development.</p>
<p>The draft laws covered more investment in waste recycling, legal frameworks for sustainable development, amendments to some existing laws, subjects not previously addressed in specialized legislation, and an independent environmental law meant to meet current challenges and follow international practice.</p>
<p>According to the university, the lawmakers praised the proposals' scientific and practical quality and agreed to take them forward with the relevant government bodies, including the Ministry of Environment. In the next phase, the students and graduates are to work directly with ministries and other authorities to refine the drafts.</p>
<hr>
<p><em>Waraq's News Desk compiled this report in October 2026 from the source below, with the help of an AI writing tool.</em></p>
<p><strong>Source</strong></p>
<ul><li><a href="https://auib.edu.iq/auib-college-of-law-students-and-alumni-present-innovative-environmental-legislation-proposals-before-the-iraqi-council-of-representatives/">AUIB: College of Law Students and Alumni Present Environmental Legislation Proposals Before the Iraqi Council of Representatives (July 19, 2026)</a></li></ul>$b$
),
(
  'auib-law-summer-course-on-environmental-law',
  'article',
  $t$Law school runs a summer course on protecting Iraq's environment$t$,
  $t$A three-day course with the Institute for International Law and Human Rights draws students, practitioners and activists, and a delegation from the Presidency.$t$,
  '2026-08-09 09:00+03',
  $b$<p>BAGHDAD — The College of Law at the American University of Iraq – Baghdad and the Institute for International Law and Human Rights (IILHR) held a three-day summer course, "Environmental Law, Governance and Leadership: Protecting People and the Environment in Iraq," the university reported on August 9, 2026.</p>
<p>Participants included law students from AUIB and the University of Mashreq, legal practitioners and environmental activists. A delegation from the Office of the President of the Republic attended the opening session and conveyed the Presidency's support.</p>
<p>Dr. Khansaa Mohammad Jassim, the college's dean, said the course was "designed as a progression from understanding to application to leadership" and described it as "a space for learning and questioning."</p>
<p>Robin Gary, IILHR's executive director, recalled the institute's work in Iraq since 2005, when it worked with the country's post-war parliament, and spoke about "law as a tool for change," especially for environmental rights. Discussion at the opening focused on putting existing environmental laws into effect and on cooperation between government agencies, the public and specialist associations.</p>
<hr>
<p><em>Waraq's News Desk compiled this report in October 2026 from the source below, with the help of an AI writing tool.</em></p>
<p><strong>Source</strong></p>
<ul><li><a href="https://auib.edu.iq/auibs-college-of-law-co-organizes-summer-course-on-environmental-law-and-governance/">AUIB: College of Law Co-organizes Summer Course on Environmental Law and Governance (August 9, 2026)</a></li></ul>$b$
),
(
  'auib-enrollment-up-32-percent',
  'article',
  $t$AUIB enrollment up 32 percent, president tells summer convocation$t$,
  $t$Dr. Bradley Cook reports a 93 percent retention rate and says the university is "going global" despite a difficult year.$t$,
  '2026-08-19 09:00+03',
  $b$<p>BAGHDAD — Student enrollment at the American University of Iraq – Baghdad grew by 32 percent, and the university retains 93 percent of its students, President Dr. Bradley Cook told faculty and staff at the Summer Convocation, the university reported on August 19, 2026.</p>
<p>The convocation took place as faculty returned from the summer break to prepare for the new academic year. Dr. Cook called the retention figure "a remarkable rate" compared with long-established universities.</p>
<p>He opened with the saying that "ships are safe in their harbor," asking whether universities are needed most in hard times. "Every original story isn't easy… we're in that original phase," he said. "Even with everything, what a remarkable year it has been… a year we can be proud of."</p>
<p>Dr. Cook said the university would keep developing its programs, international partnerships and recruitment despite regional volatility, describing AUIB as "going global" and "investing in the student experience." He pointed to work on student mental health, facilities for students with physical disabilities, and public services such as those offered by the College of Dentistry. No new programs were announced.</p>
<hr>
<p><em>Waraq's News Desk compiled this report in October 2026 from the source below, with the help of an AI writing tool.</em></p>
<p><strong>Source</strong></p>
<ul><li><a href="https://auib.edu.iq/auibs-summer-convocation-affirms-continuity-and-resilience/">AUIB: AUIB's Summer Convocation Affirms Continuity and Resilience (August 19, 2026)</a></li></ul>$b$
),
(
  'japan-corner-opens-at-auib-library',
  'article',
  $t$A Japan Corner opens at the AUIB Library$t$,
  $t$Japan's ambassador opens a shelf of 174 donated books, and between 15 and 30 students are to spend two weeks at Hiroshima University in January.$t$,
  '2026-08-26 09:00+03',
  $b$<p>BAGHDAD — Japan's ambassador to Iraq, Akira Endo, opened a "Japan Corner" at the library of the American University of Iraq – Baghdad, the university reported on August 26, 2026.</p>
<p>The corner holds 174 books on a range of subjects, donated by the Nippon Foundation through its Read Japan Project, to introduce Japan and its culture to the university community.</p>
<p>The visit, by an embassy delegation joined by representatives of Sardar Group, formalized a partnership on cultural exchange and study abroad. The embassy had already helped arrange a memorandum of understanding between AUIB and Hiroshima University, under which 15 to 30 AUIB students are to spend two weeks at Hiroshima University in January. The partnership also opens the way to joint research, conferences and workshops in the humanities and social sciences.</p>
<p>"Japan is such a special culture," said AUIB's president, Dr. Bradley Cook, from which "we can learn so much on organization, efficiency, and service." He described universities as "a bridge for cross-border interaction" and spoke of "a great thirst among AUIB students" to explore Japanese culture. Ambassador Endo thanked the university for "actively promoting cultural exchange."</p>
<hr>
<p><em>Waraq's News Desk compiled this report in October 2026 from the source below, with the help of an AI writing tool.</em></p>
<p><strong>Source</strong></p>
<ul><li><a href="https://auib.edu.iq/auib-lauches-partnership-with-japanese-embassy-and-opens-japan-corner-at-its-library/">AUIB: AUIB Launches Partnership with Japanese Embassy and Opens "Japan Corner" at its Library (August 26, 2026)</a></li></ul>$b$
),
(
  'auib-staff-train-at-vanderbilt',
  'article',
  $t$Eleven AUIB staff complete a leadership week at Vanderbilt$t$,
  $t$The Staff Excellence Fellowship takes the group to Peabody College, Tennessee State University and the Nashville Entrepreneur Center.$t$,
  '2026-08-31 09:00+03',
  $b$<p>NASHVILLE — Eleven staff members of the American University of Iraq – Baghdad completed a week-long immersion at Vanderbilt University's Peabody College of Education and Human Development, the university reported on August 31, 2026.</p>
<p>The group took part in Vanderbilt's Staff Excellence Fellowship, a train-the-trainer program built around interactive sessions, institutional visits, meetings with Vanderbilt faculty and leaders, collaborative design work, daily reflection and final presentations. Its focus was on how leadership development and professional learning can be put into practice at their own institution.</p>
<p>The staff also visited Tennessee State University, where they discussed student success, enrollment management, academic support and partnerships with its leadership, and the Nashville Entrepreneur Center, for sessions on innovation, presentation and turning ideas into action.</p>
<p>Peabody College is AUIB's partner on its College of Education and Human Development.</p>
<hr>
<p><em>Waraq's News Desk compiled this report in October 2026 from the sources below, with the help of an AI writing tool.</em></p>
<p><strong>Sources</strong></p>
<ul><li><a href="https://auib.edu.iq/auib-staff-complete-intensive-leadership-and-training-immersion-at-vanderbilt-universitys-peabody-college/">AUIB: AUIB Staff Complete Intensive Leadership and Training Immersion at Vanderbilt University's Peabody College (August 31, 2026)</a></li><li><a href="https://auib.edu.iq/academics/college-of-education-and-human-development/">AUIB: College of Education and Human Development</a></li></ul>$b$
),
(
  'auib-signs-mou-with-disability-organizations',
  'article',
  $t$AUIB and the Iraqi Alliance of Disability Organizations sign an MoU$t$,
  $t$The agreement covers inclusive education, disability rights, research and community work.$t$,
  '2026-09-01 09:00+03',
  $b$<p>BAGHDAD — The American University of Iraq – Baghdad signed a memorandum of understanding with the Iraqi Alliance of Disability Organizations (IADO) at a ceremony on campus, the university reported on September 1, 2026.</p>
<p>The agreement, signed by AUIB's president, Dr. Bradley Cook, and IADO's head, Moaffak Alkhafaji, lays the foundation for cooperation in "inclusive education, disability rights, academic excellence," as well as community engagement, research and institutional development.</p>
<p>"AUIB has a responsibility that extends beyond the classroom," Dr. Cook said, describing a responsibility to students, the university community and the Iraqi public. He praised the resolve and optimism of AUIB students with disabilities.</p>
<p>Alkhafaji spoke about the UN Convention on the Rights of Persons with Disabilities, adopted in 2006, and said his organization's campaign led Iraq's Parliament to ratify it in 2013, moving state institutions toward a human-rights approach in areas from sport to political participation.</p>
<p>The university did not announce specific programs or a timeline under the agreement.</p>
<hr>
<p><em>Waraq's News Desk compiled this report in October 2026 from the source below, with the help of an AI writing tool.</em></p>
<p><strong>Source</strong></p>
<ul><li><a href="https://auib.edu.iq/auib-signs-memorandum-of-understanding-with-iraqi-alliance-of-disability-organizations/">AUIB: AUIB Signs Memorandum of Understanding with Iraqi Alliance of Disability Organizations (September 1, 2026)</a></li></ul>$b$
),
(
  'auib-and-mirmaz-academy-sign-cooperation-agreement',
  'article',
  $t$AUIB and Mirmaz Academy sign a cooperation agreement$t$,
  $t$Partial scholarships, English and soft-skills programs, and campus events for learners of the digital education platform.$t$,
  '2026-09-27 09:00+03',
  $b$<p>BAGHDAD — The American University of Iraq – Baghdad and Mirmaz Academy, which the university describes as a leading digital education platform in Iraq, signed a strategic cooperation agreement on campus, the university reported on September 27, 2026.</p>
<p>The agreement was signed by AUIB's president, Dr. Bradley Cook, and Mustafa Hameed, Mirmaz Academy's founder and chief executive. It brings the university's seven colleges and its Center of Excellence for Innovation and Development together with the academy's learning community.</p>
<p>Under the agreement, academy learners gain routes into AUIB's degree programs and its professional development and continuing education courses; distinguished academy students can receive partial scholarships; and specialized programs will strengthen English and communication and leadership skills. Joint events on campus will introduce academy students to the university.</p>
<p>Dr. Cook called it "a big day" for both institutions and said the "very powerful combination" of their roles and reach would help extend quality education across the country. Hameed said the partnership would help raise standards in Iraqi education and open places at AUIB each year for qualified students from the academy's community.</p>
<hr>
<p><em>Waraq's News Desk compiled this report in October 2026 from the source below, with the help of an AI writing tool.</em></p>
<p><strong>Source</strong></p>
<ul><li><a href="https://auib.edu.iq/auib-and-mirmaz-academy-sign-strategic-cooperation-agreement/">AUIB: AUIB and Mirmaz Academy Sign Strategic Cooperation Agreement (September 27, 2026)</a></li></ul>$b$
),
(
  'saihood-receives-order-of-the-star-of-italy',
  'article',
  $t$Italy honors AUIB founder Saadi Saihood with the Order of the Star of Italy$t$,
  $t$Italy's ambassador presents the Commander's rank, conferred by President Sergio Mattarella, for strengthening ties between the two countries.$t$,
  '2026-09-28 09:00+03',
  $b$<p>BAGHDAD — Italian President Sergio Mattarella has conferred the Order of the Star of Italy, in the rank of Commander, on Dr. Saadi Waheeb Saihood, the Founding Father of the American University of Iraq – Baghdad and Vice Chair of its Board of Trustees, the university reported on September 28, 2026.</p>
<p>Italy's ambassador to Iraq, Niccolò Fontana, presented the honor at the Italian Embassy in Baghdad, before ambassadors, Iraqi government ministers and business leaders. The order was conferred on the recommendation of Antonio Tajani, Italy's foreign minister, in recognition of Dr. Saihood's contributions to economic and cultural relations between Italy and Iraq.</p>
<p>"Dr. Saihood has been one of the key figures and one of the most steadfast advocates of this deep bond," Ambassador Fontana said, praising his "constant efforts in favor of youth development and dialogue."</p>
<p>Dr. Saihood described the order as "not only a token of appreciation of my own self," but a reflection of the depth of relations between the two countries and their peoples.</p>
<hr>
<p><em>Waraq's News Desk compiled this report in October 2026 from the source below, with the help of an AI writing tool.</em></p>
<p><strong>Source</strong></p>
<ul><li><a href="https://auib.edu.iq/italian-president-sergio-mattarella-confers-upon-auibs-founding-father-dr-saadi-saihood-order-of-the-star-of-italy-in-the-rank-of-commander/">AUIB: Italian President Sergio Mattarella Confers Upon AUIB's Founding Father Dr. Saadi Saihood Order of the Star of Italy in the Rank of Commander (September 28, 2026)</a></li></ul>$b$
),
(
  'auib-sets-out-its-plan-to-2031',
  'feature',
  $t$Student success to a green campus: AUIB sets out its plan to 2031$t$,
  $t$A five-year strategic plan, an annual report that calls 2025–2026 one of the most significant years in the university's history, and the long road to American accreditation.$t$,
  '2026-10-14 09:00+03',
  $b$<p>BAGHDAD — The American University of Iraq – Baghdad has set out where it wants to be by 2031 in a five-year strategic plan built on five themes: student success, academic and operational excellence, community impact, innovation, and institutional sustainability.</p>
<p>Under student success, the plan aims to improve academic outcomes and on-time graduation through teaching, advising and learning support, and to build students' wellbeing and sense of belonging. Academic and operational excellence covers the groundwork for international accreditation, research capacity, student-centered campus services and more international partnerships. Community impact puts heritage preservation, cultural diplomacy and civic dialogue at the center, along with wider public access to the university's resources.</p>
<p>The innovation theme calls for a culture of creativity and entrepreneurship, new teaching methods and hands-on learning, and faster adoption of AI and data-driven decision-making. Institutional sustainability pairs budget transparency with a green campus. The plan sets no numerical targets.</p>
<p>The university's annual report for 2025–2026, signed by President Dr. Bradley J. Cook, calls the year "one of the most significant periods in the history" of AUIB. It records the second commencement, with about 150 graduates; a budget for the 2026 fiscal year with a multi-year forecast; approval of a Center for Teaching Excellence and Learning Innovation; and continued growth in enrollment across undergraduate, graduate, Academic Success Program and English language programs, despite regional instability.</p>
<p>Accreditation by the WASC Senior College and University Commission (WSCUC) in the United States is described as a major institutional priority. The university is accredited at home by the Ministry of Higher Education and Scientific Research.</p>
<hr>
<p><em>Waraq's News Desk compiled this report in October 2026 from the sources below, with the help of an AI writing tool.</em></p>
<p><strong>Sources</strong></p>
<ul><li><a href="https://auib.edu.iq/about-us/five-year-strategic-plan/">AUIB: Five Year Strategic Plan</a></li><li><a href="https://auib.edu.iq/about-us/annual-report-2025-2026/">AUIB: Annual Report 2025–2026</a></li><li><a href="https://auib.edu.iq/about-us/">AUIB: About Us</a></li></ul>$b$
),
(
  'society-publishes-its-member-handbook',
  'article',
  $t$The Society of Arts and Letters sets out what membership means$t$,
  $t$Free, open to every AUIB student, in Arabic and English: the Member Handbook lists twelve programs and the traditions members keep.$t$,
  '2026-09-28 12:00+03',
  $b$<p>BAGHDAD — The AUIB Society of Arts and Letters (SAL) has issued its Member Handbook, an eleven-page guide for every member, dated September 28, 2026, and prepared by the Society's founder and president, Shaheen Farjo.</p>
<p>Membership is free and open to every enrolled AUIB student, with no audition, portfolio or fee. A student joins by registering and signing the Member Pledge. Taking part in two Society activities in a semester makes a member a Voting Member, able to vote in elections and stand for office.</p>
<p>The handbook lists the Society's programs: Waraq, the bilingual journal (then a working title); Side Quest, a campus video series; Second Chapter, a fall book drive; the Typewriter Tour, which collects six-word stories every spring; the Majlis, a monthly salon with a guest, readings and tea; Open Pages writing workshops; a monthly Book Circle alternating Arabic and English; Scratch Night; Bad Poetry Night; Motion Night, a literary debate each term; the Gallery Wall for members' art and photography; and the Mutanabbi Walk, a trip to Baghdad's book street.</p>
<p>It also describes the Society's traditions: every new member types six words on the Society Typewriter for the Book of Members; Charter Night marks the Society's anniversary each October; and each April the outgoing president hands the new president a fresh typewriter ribbon.</p>
<p>"Everything we do is free, in Arabic and English, and open to every student," Farjo writes in the handbook's opening letter. "Come to a Majlis. Type your six words on the typewriter. Tell us what you want to make. We will help you make it."</p>
<hr>
<p><em>Waraq is published by the Society of Arts and Letters. Waraq's News Desk compiled this report in October 2026 from the source below, with the help of an AI writing tool.</em></p>
<p><strong>Source</strong></p>
<ul><li><a href="https://auibsal.org/en/documents/member-handbook">SAL-MEM-01: Member Handbook (September 28, 2026)</a></li></ul>$b$
),
(
  'society-publishes-its-founding-documents',
  'article',
  $t$Society puts its draft rulebooks and three-year plan online$t$,
  $t$Bylaws, a Policy Manual, a staffing handbook and a strategic plan, all marked Draft 1, join the Constitution at auibsal.org/documents.$t$,
  '2026-10-09 12:00+03',
  $b$<p>BAGHDAD — The AUIB Society of Arts and Letters has published its founding documents on its website, ahead of Charter Day on October 13, 2026. Alongside the Constitution, members can read the Bylaws and Standing Orders, the Roles and Staffing handbook, the Policy Manual and the Strategic Plan 2026–2029. Each of the four is marked Draft 1, dated September 28, 2026; none has yet been adopted.</p>
<p>The draft Strategic Plan traces the Society's short history: a first brief, guidelines and rubric for a campus literary journal in February 2026; the Typewriter Tour in spring 2026, when a typewriter traveled the campus collecting six-word stories, which the plan says "proves the campus will write when invited"; and, in September 2026, proposals for three programs, among them the journal and the Side Quest video series.</p>
<p>The plan sets targets it calls estimates for a new society, to be reset each April. In its first year, 2026–27, it aims for 60 registered members, 25 of them voting, a Council of eight seated, a monthly Majlis from December and the Society's first elections. By the third year it looks to 200 members and 70 voting, a full theatre production, a letters day with other Baghdad universities, and a Council run by students who never met the founder.</p>
<p>"In October 2029, will Charter Night be run by people who never met the founder, with more members than the year before and a programme nobody on the founding team imagined?" the plan asks. "If yes, the plan worked."</p>
<hr>
<p><em>Waraq is published by the Society of Arts and Letters. Waraq's News Desk compiled this report in October 2026 from the sources below, with the help of an AI writing tool.</em></p>
<p><strong>Sources</strong></p>
<ul><li><a href="https://auibsal.org/en/documents">The Society's documents, with their status</a></li><li><a href="https://auibsal.org/en/documents/strategic-plan">SAL-STR-01: Strategic Plan 2026–2029 (Draft 1, September 28, 2026)</a></li></ul>$b$
),
(
  'society-ratifies-its-constitution-on-charter-day',
  'article',
  $t$On Charter Day, the Society of Arts and Letters ratifies its Constitution$t$,
  $t$The founding charter makes membership free, puts power in a General Assembly of all members and sets elections every April.$t$,
  '2026-10-13 21:00+03',
  $b$<p>BAGHDAD — The AUIB Society of Arts and Letters ratified its Constitution at its Founding General Assembly on Charter Day, Tuesday, October 13, 2026, according to the Society's register of documents.</p>
<p>The Constitution, prepared by the founder and president, Shaheen Farjo, opens with a preamble written for the city: students "in a city that once kept the House of Wisdom and still keeps al-Mutanabbi Street" adopting it "so that our Society is open to every student, governed in the open, careful with people and money, and built to outlast those who founded it."</p>
<p>It sets the Society's mission, "to cultivate a culture of literature and creative expression across AUIB," and its motto, "The paper and the pen," the last two of the things al-Mutanabbi's most quoted line says know him.</p>
<p>Membership is free and open to every enrolled AUIB student. All authority comes from the General Assembly of members, which elects the officers, amends the Constitution by a two-thirds vote with fourteen days' notice, and can remove anyone who abuses a role. A Council of four elected officers and six appointed directors runs the Society between assemblies, meets every two weeks and adopts the budget. Elections are held every April by secret ballot with AUIB sign-in, using ranked choice when more than two candidates stand, and a president may serve at most two terms.</p>
<p>Editors and directors make creative decisions; the Council may overrule a selection only on grounds of law, safety or University policy, and in writing. Spending is capped by level, two people are present at every cash count, and every expense needs a receipt.</p>
<p>The names of those who adopted the Constitution are kept on the Founders' Roll, and Charter Night will mark the anniversary every October.</p>
<hr>
<p><em>Waraq is published by the Society of Arts and Letters. Waraq's News Desk compiled this report in October 2026 from the sources below, with the help of an AI writing tool.</em></p>
<p><strong>Sources</strong></p>
<ul><li><a href="https://auibsal.org/en/documents/constitution">SAL-GOV-01: The Constitution</a></li><li><a href="https://auibsal.org/en/documents/member-handbook">SAL-MEM-01: Member Handbook</a></li></ul>$b$
),
(
  'waraq-launches-as-one-paper',
  'article',
  $t$Waraq launches: news, letters and art in one bilingual paper$t$,
  $t$The Society folds its literary journal, campus news, the Gallery Wall, Six Words and Side Quest into one publication with five desks. Edition 1 opens for submissions on October 25.$t$,
  '2026-10-14 12:00+03',
  $b$<p>BAGHDAD — The AUIB Society of Arts and Letters launched Waraq on October 14, 2026: a single bilingual publication for news, letters, art and video on auibsal.org, replacing the AUIB Literary Journal as a separate program.</p>
<p>Waraq, Arabic for "paper," is organized in five desks. News covers the campus and is always open to pitches. Letters, the former journal, publishes poetry, fiction, creative nonfiction, drama, translation and Six Words. Gallery shows art, photography and comics. Video carries Side Quest episodes, and Voices carries columns and letters.</p>
<p>Letters and Gallery publish in Editions, each opened by a call and read blind: readers never see an author's name before a decision. The call for Edition 1 opens on October 25 and closes on December 3, with decisions on December 17. Current AUIB students and alumni may send up to two pieces each. Faculty and staff appear by invitation.</p>
<p>Authors keep their copyright, and the author approves every change made in editing. The News desk's standards require two sources for any claim about a person or office and open, dated corrections.</p>
<hr>
<p><em>Waraq is published by the Society of Arts and Letters. Waraq's News Desk compiled this report in October 2026 from the sources below, with the help of an AI writing tool.</em></p>
<p><strong>Sources</strong></p>
<ul><li><a href="https://auibsal.org/en/waraq">Waraq on auibsal.org</a></li><li><a href="https://auibsal.org/en/waraq/editions">Waraq: Editions and the open call</a></li></ul>$b$
);

insert into journal.pieces (contributor_id, slug, category, language, title_en, deck_en, status, publish_at, published_at)
select c.id, n.slug, n.category, 'en', n.title_en, n.deck_en, 'published', n.published_at, n.published_at
from waraq_news n
cross join journal.contributors c
where c.slug = 'waraq-news-desk'
on conflict (slug) do nothing;

insert into journal.piece_bodies (piece_id, body_en)
select p.id, n.body_en
from waraq_news n
join journal.pieces p on p.slug = n.slug
on conflict (piece_id) do nothing;

drop table waraq_news;
