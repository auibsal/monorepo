# SAL: current decisions (source of truth, Thursday, November 12, 2026)

Every chat in this project follows this file. Where an older document, project doc or chat disagrees, this file wins. Every Society document is **Version 1**: there are no earlier versions, no change histories and no old names.

**How this file is kept.**
- **There is one copy:** the Claude project's `claude/decisions.md`.
- **The repo mirror:** the monorepo keeps a read-only mirror of this file and of `claude/glossary_ar.md` for the site chat, which can't read the project. Both are replaced whole from the project whenever the owner sends the site chat a prompt, and are never edited in the repo; the site chat proposes changes in its report instead.
- **The file is organized by subject, not by date.** A new decision goes into the section it belongs to, replacing any line it changes, so the file never says two things.
- **Changing it:** any chat may change it, but only this way:
  - re-read the project copy immediately before writing, never from a local, attached or remembered copy;
  - change only the lines concerned;
  - update the date line;
  - say in its report which lines it changed;
  - before writing, check that every section it knows of is still there, and stop and tell the owner if one is missing.

## 1. Standards and language
- **The American standard across the board.** Governance, elections, meetings, names, documents, the paper and the platform follow the standard practice of American university student organizations and student media. Where this file is silent, do what that standard does. Standard practice beats house rules: keep what helps, change what doesn't, merge what repeats. Counts are not rules; sections, events and tabs are as many as the work needs.
- **English:** American English with no exceptions, following the Chicago Manual of Style (Merriam-Webster for spelling), with the guide's own typography (curly quotes, the serial comma, en dashes for ranges).
  - **Times:** "4:00 p.m.".
  - **Numbers:** one through nine in words, 10 and up in numerals.
  - **Calendars** start the week on Sunday.
  - **Titles (Chicago 8.21):** capitalized are only the nine seats, the Managing Editor, the Copy Chief, the Faculty Advisor and the Partner Lead; team roles are lowercase in running text.
  - **Usage:** "semester" for AUIB's fall and spring (as AUIB says it; «الفصل الدراسي»), and "term" only for a term of office. "advisor", never "adviser". "Graduate" in the singular and "alumni" in the plural. The endorsement line is "a Society of Arts and Letters program".
- **Arabic:** Modern Standard Arabic, following the Arab language academies, for documents, Qirtas and the site. Iraqi Arabic, written as Iraqis write it (گ، چ، پ), is used only where the Society chats: Hudhud, social captions and stories, the members' group, signs at the door.
  - **Writing:** Latin digits; «» quotes; the Iraqi month names; diacritics, spelling and punctuation as set out under AUIB's name below.
  - **One word per term:** the glossary (`claude/glossary_ar.md`).
  - **AUIB** is always «الجامعة الأمريكية في بغداد», in compounds too (طلبة الجامعة الأمريكية في بغداد، حرم الجامعة الأمريكية في بغداد), except in names the Society made itself, which keep «الجامعة الأمريكية» alone: the Society's name «جمعية الفنون والآداب في الجامعة الأمريكية» and Qirtas's line «صحيفة الجامعة الأمريكية للأخبار والآداب والفن»; English keeps "the American University of Iraq – Baghdad".
  - **After the first mention** in a piece, AUIB is «الجامعة» and the Society «الجمعية». Qirtas is «قرطاس», a proper name with no article and masculine (نشر قرطاس، في قرطاس).
  - **Diacritics (sparing, as edited Arabic prose uses them):** only where a word would be misread without them (a passive verb such as «صُوِّر», a shadda that changes the meaning). Tanween al-fath is always written, on the letter before the alif (شكرًا، أيضًا); the other tanween (ٌ ٍ) never. Full diacritics only for al-Mutanabbi's verse, the motto and any quoted poetry; poems in Qirtas keep the poet's own choice exactly as sent; people's names have none, except a shadda the person asks for. Headlines, buttons and emails follow the same rule.
  - **Spelling and punctuation:** hamza, taa marbuta and alif maqsura always correct (إ أ آ؛ ة not ه؛ ى and ي), checked in CI for the site's text; no tatweel (كـتـاب) anywhere, display type included; Arabic punctuation always (، ؛ ؟ and «»), never the Latin marks.
  - **Other scripts inside Arabic:** products and platforms in Latin script (Instagram, Telegram, Notion); the Society's own names in Arabic (قرطاس، الديوان، هدهد); web addresses, emails and handles in Latin, isolated so they don't flip the line's direction.
  - **Addressing a mixed group** in Arabic: neutral wording where possible (أعضاء الجمعية، كل من…), otherwise the masculine plural, as Modern Standard Arabic does; a person is always addressed in their chosen form.
- **Iraqi Arabic, exactly where it's used:**
  - **Iraqi:** Hudhud's chat, reminders and Sunday note; Instagram captions and stories; the members' group; short door and table signs only when they just give directions or a welcome.
  - **Modern Standard:** everything else, including designed slides and posts, posters and printed material, Next Stop's on-screen text and captions (speech stays as spoken), any Hudhud message with official weight (removal notices, consents, appeals), and any sign or notice with official weight, such as Next Stop's filming notice on the bus door, which tells riders how to opt out of being filmed.
  - **One register per piece:** a message or post is wholly Iraqi or wholly Modern Standard, never mixed.
  - **Spelling:** one short Iraqi spelling list in the glossary (گ چ پ ڤ; اكو، ماكو، شلون، هسه، شكو…), so every writer spells it the same. The Society's own names keep the glossary's word even in Iraqi (الفعالية, never «الإيفنت»).
  - **Tone:** warm and polite, in the person's chosen Arabic form, with no slang that could offend.
- **English beside Arabic:**
  - **Where both appear together** (mixed audiences, Telegram posts, signage): English first.
  - **The site's language** for a first-time visitor is the browser's, or English if it's neither; an account's language is that of the page they signed up on, changeable in Settings.
  - **Certificates** are in the recipient's language, with the other edition available.
  - **Type:** in the brand kit, Arabic is set about 10% larger than English so both read at the same size.
  - **Hashtags:** none, or the one Society tag #auibsal.
  - **Arabic words in English text** (al-Mutanabbi, Qalam, the Diwan) use simple spelling with no diacritics, as Chicago allows for general readers, from the glossary.
- **Gender:** seats and roles are written without gender. In English a seat is its title or "they"; in Arabic a seat named in the abstract keeps the glossary's form and avoids pronouns where it can. A title that names a person takes that person's gender, by their own preference, with تاء التأنيث for a woman (نائبة الرئيس، أمينة السر، رئيسة التحرير) and matching verbs and pronouns. Every account sets its Arabic form at sign-up with one grammar question, "In Arabic, address me as: «عضو» / «عضوة»" (existing members are asked once at their next sign-in). It can be changed any time, is never guessed from the name, and sets every Arabic title, card line, email, letter and Hudhud message. The public line: "We address everyone in the form they choose, in both languages."
- **One language per piece.** Every document and page exists in full in both languages, as separate English and Arabic editions linked to each other. Claude writes the Arabic; no native-speaker check is needed, and the team edits later where needed.
- **Everything addressed to a person is in that person's language:** the site, emails, the Sunday Paper (an English and an Arabic edition), Hudhud's private messages, letters and forms.
  - **A mixed audience** that can't be personalized (Telegram group posts, a shared email) gets English first, with a link or button to the Arabic edition.
  - **Instagram:** one carousel per post, an English slide then an Arabic slide; the caption in English, a line, then Arabic; stories one per language in the same set.
- **How the Society describes itself:**
  - **The motto:** "The paper and the pen." («والقرطاسُ والقلمُ»), with its full stop wherever it stands alone. It is the standard line on posters, bios, stickers, certificates and signatures; no list of parts.
  - **The one full sentence,** where a full sentence is needed (About, the press kit, LinkedIn, letters to partners): "The AUIB Society of Arts and Letters publishes Qirtas, AUIB's paper of news, letters and art; runs the Company, its theater; makes Next Stop, its show; and holds events all year."

- **Standards the Society adopts publicly (free; only what it actually does):**
  - **For Qirtas:** SPJ's Code of Ethics, cited in EDT-01; the Student Press Law Center's resources; Google News (Publisher Center) and NewsArticle data on every piece; Internet Archive saving; and a Creative Commons license chosen by the writer for each piece.
  - **An ISSN for Qirtas:** Iraq has no national ISSN center, so the request goes to the ISSN International Centre through the ISSN Portal once Edition 1 is published. Any fee is asked of Student Life as a need.
  - **For the site:** WCAG 2.2 AA with automated checks on every change and a hands-on audit each September in both languages (VoiceOver and NVDA, keyboard only); Global Privacy Control honored; Mozilla Observatory and securityheaders.com A ratings; plain language in every document and page; RSS feeds for Qirtas and Events.
  - **Days marked,** each as an ordinary event or post: International Mother Language Day (Feb 21), Student Press Freedom Day (late February), World Poetry Day (Mar 21), National Poetry Month (April), World Book and Copyright Day (Apr 23), International Literacy Day (Sep 8), Banned Books Week (late September) and Arabic Language Day (Dec 18).
  - **Not joined:** paid memberships until Student Life can provide them; any green badge or claim the Society can't measure.
- **More standards adopted** (each claimed only once it is done):
  - the Student Press Law Center's model student media policy, the basis of EDT-01's independence section;
  - a vulnerability disclosure policy from CISA's template, linked from security.txt;
  - OpenSSF Scorecard on the repository each week;
  - the W3C Web Sustainability Guidelines, named only in the sustainability note, with no badge;
  - the U.S. Web Design System as the reference for how components behave, under the Society's own look;
  - plain-language checks (plainlanguage.gov) on public pages and emails.
- **Formats:**
  - **Deadlines** are 11:59 p.m. Baghdad time on the day named; times shown to people outside Iraq say "Baghdad time".
  - **On screen** dates read one way: "Tue, Dec 1 · 2:30–4:00 p.m." («الثلاثاء 1 كانون الأول · 2:30–4:00 م»), with the year only when it isn't this year.
  - **Hijri dates:** Arabic pages of events and Editions, and Arabic letters, add the full Hijri date after the Gregorian one; English shows Gregorian only.
  - **Titles** of pages, files, emails and buttons are in sentence case, with no emoji, prefixes or brackets; Notion pages start with what they are ("Event: Writing workshop, Dec 8"); email subjects stay under 60 characters.
  - **Speech and screen text:** people in videos speak as they speak (Iraqi Arabic is fine); on-screen text, captions and titles follow the glossary's Modern Standard Arabic.
- **Answer times:** hello@, Help Desk, nextstop@ and partners@ in two working days; the press in one; letters to the editor in a week; applications by their stated date; removals in two working days; accessibility requests in three; privacy requests to privacy@ in 30 days, logged in the Diwan; security reports to security@ acknowledged within three business days (SAL-GOV-07).

## 2. Where the Society stands
- **Its history, as it happened** (shown as a short History on About):
  - **Spring 2026:** the Society registered with Student Life. It ran the Typewriter Tour (Food Court Sun Feb 8; English Language Academy in the CEID Mon Feb 9; College of Law Tue Feb 10; College of Arts and Sciences Wed Feb 11) and had a table at the club fair (Mon Feb 23). It began posting on Instagram (@auibsal), with some notices on Telegram and through Student Life's email.
  - **Fall 2026:** it registered again and had a table at the club fair (Mon Oct 5). A VR event was planned but not held: it needed a one-time rental, now a need for Student Life or a partner in kind.
  - **Sun Nov 8, 2026:** auibsal.org launched; joining and Write for Qirtas opened.
- **2026–27 is the interim year.** No Council meeting, general meeting or election has been held yet. The officers and directors on record are the founding team, appointed by the President, serving until the first elections in October 2027.
- **Founding:** the Society is founded at the Founding Meeting (Tue Mar 30, 2027), which adopts the founding documents. The Founding Proposal goes to Student Life with the spring 2027 registration. Until then every document is Version 1 and proposed, and nothing gives an adoption, ratification or founding date before then. There is no founding-day event, no Charter Day and no Founders' Roll; the Founding Meeting's minutes record who attended. An anniversary event could only become a tradition the usual way (§3).
- **Old drafts:** the December 2025 Founding Dossier, Constitution and Bylaws were never sent to Student Life and are deleted, with no copy kept.

## 3. What the Society does
- **Qirtas** is the Society's paper, with its own masthead and editorial independence (§9). It includes **Qalam**, its summer program for high school students.
- **The Company** is the Society's theater company. Its performances are ordinary events. Until an Artistic Director is appointed, the President covers the seat.
  - **First season** (targets the Council sets once the Artistic Director is appointed): a staged reading around Wed Nov 17, 2027, and a full production around Wed–Thu Apr 26–27, 2028 (desk work in Ramadan, blocking after Eid al-Fitr, finished before Eid al-Adha and finals).
  - **Plays suggested to the panel,** with an original student play first if one is ready: Ahmad Shawqi's "Majnun Layla" (Arabic, the reading) and Oscar Wilde's "The Importance of Being Earnest" (English, the production).
  - **Its Notion project** is "The Company: first season". Rights are kept on the site ("no rights, no show").
- **Next Stop** is the Society's video show, made by the Director of Media's team (a producer and the host): episodes of 12 to 20 minutes, six a season released every other week on the same day and time, longer specials and reels cut from every episode, a reality-sitcom about AUIB. It is not part of Qirtas, and it can become its own club if it outgrows the Society. A pilot episode is released Wed Dec 9, 2026, and the first season runs in spring 2027, set by Media. The Secretary sends the pilot's filming request to Student Life by Sun Nov 15. Guests and pitches come in through nextstop@.
  - **Its name is "Next Stop"** only (never "Next Stop @ AUIB"), and its title shows the name alone; the host is credited, never added to the title.
  - **Its package,** built once in the brand kit (§15): an illustrated paper collage in natural colors, uncluttered and grown-up, never childish, with no real places or photographs.
    - **An episode runs:** the Society's sound logo; the cold open; the opening titles; four parts, each opened by a ticket card (The ride, The task, The long way home, The exit); the credits; the end screen.
    - **The opening titles (about 17 seconds):** a clapper slate; then the campus bus, the same size and seen from the same side throughout, drives past the College of Business across the water, the sports courts and the palace stretch after the ELA, with the presenting line, the host and the director on paper tags; it pulls in to the Food Court stop, arriving from the other side of the road; the "Next Stop" title is cut from paper; and a ticket types "Next stop: [guest]" as the bus bell rings.
    - **Inside an episode:** the guest's take on a take card, stamped with the bus's verdict ("Approved by the bus" or "Overruled"); name captions (the name from the site and one line, bottom left, for five seconds).
    - **The end:** the credits roll on crimson beside the outtakes, then the 20-second end screen. Reels end on "Who's next? Nominate a guest: nextstop@auibsal.org", then the sound logo.
    - **Until a piece is approved,** an episode uses only what is approved. If the opening titles and cards aren't approved by Dec 9, the pilot opens with the approved sound logo and a plain title card; the release doesn't wait on the package.
    - **The music:** an original jazz-hop theme (Rhodes, upright bass, dusty drums and a vibraphone hook). Episodes follow the Society's video standard (§15).
- **Events.** There are no standing programs and no series. Events are made as needed, by the Society or for any party within or outside it, titled plainly for what they are, and recurring events are made again for each date. The Council sets a calendar of at least one event a month each semester. Ways to run an event are kept in the Events Manual as plain formats: a reading with a guest, a book discussion, a writing workshop, a listening session, a debate, a trip, a performance.
- **Traditions:** an event gets a name only once it has run at least twice and the Council agrees. There are two:
  - **The Typewriter Tour** (membership): once a year in the spring club fair week, with the fair as one of its days (§11).
  - **Second Chapter** (partnerships): a book drive and sale for a charity at the fall club fair, from October 2027 (§6).
- **Six Words:** six-word stories are written only on the typewriter, at the Tour or at the membership table. They are not part of Qirtas. Each page belongs to its writer, private until the writer chooses their profile or the Tour's page (that choice is the consent record). The wall shows the first name and last initial unless the writer chooses the full preferred name.
- **Qalam:**
  - **What it is:** workshops, mentoring by AUIB members, assignments and a certificate. Its sessions are ordinary events. A Qalam lead runs it under the Editor-in-Chief, and the Director of Partnerships finds the partner school. It first runs in summer 2028, and planning starts after the October 2027 elections.
  - **Safeguarding:** the school's and parents' written consent; two adults at all times; contact only through the teacher; no one-to-one meetings; written Student Life approval. High school students never use the Diwan or Get involved.
  - **Publishing:** with consent, the best work may appear in Qirtas, bylined with the student's first name, last initial and school. The full name appears only on the certificate.
  - **Media:** Qalam is never filmed for Next Stop or any public video. Photos only with a parent's consent, first names only, no faces on public channels.
  - **Records:** consents and attendance are kept three years after the program and incident records seven years (or longer if AUIB requires).
  - **Data:** applications and the roster are kept in the staff area of the site, never in Notion.
- **Sustainability:** the Society states only what it does.
  - **Every email and the site footer** carry "Paperless by default. Books reused through Second Chapter." («الأصل عندنا: بلا ورق. والكتب يُعاد استخدامها عبر «الفصل الثاني».»).
  - **Practices:** forms and tickets digital by default; print only to the confirmed need (the RSVP count plus 10%, or the number asked for; booklets in multiples of 4 pages); no single-use decorations; reuse of books through Second Chapter; shared rides for trips.
  - **Earth Day:** one event a year, registered on EarthDay.org's map. In 2027 it is the trip to al-Mutanabbi Street on Fri Apr 23.
- **Next Stop's working rules:**
  - **Care:** nobody is filmed for the show without agreeing first; no pranks on people who haven't agreed; nothing filmed in classes or private spaces without permission; the Director of Media checks every episode against these rules before release.
  - **Being on the show:** members sign up with "Be on the show" on Get involved; suggesting someone else is by email to nextstop@.
  - **Footage:** three copies on two kinds of storage, one kept apart (3-2-1); footage of anyone who withdraws is deleted from all three.
  - **No advertising on camera:** no product placement, and brands kept out of the frame where possible.
  - **Captions:** English and Arabic caption files on every episode whatever is spoken; reels carry burned-in captions.
  - **Numbering:** "Season 1, Episode 3" (S01E03 in files and addresses).
- **The Company's working rules:**
  - **Choosing plays:** a panel (the Artistic Director, two members, and the Faculty Advisor once there is one) reads proposals each spring and announces the next year's season; nothing is announced before its rights are secured.
  - **One production calendar:** auditions, callbacks, the first read, rehearsals, tech week, performances and strike; about eight weeks for a reading and ten to twelve for a production, with weekly production meetings.
  - **Auditions:** open to every member, no pre-casting, sides posted two weeks ahead, callbacks, accommodations on request, the cast list posted on the site at a stated time; the director and the Artistic Director cast together.
  - **Safety:** each production's stage manager leads it (rehearsal reports, the call board, the emergency plan with the venue).
  - **Recordings:** only when the license allows; otherwise an archival recording for the Company only.
  - **The playbill:** digital, by QR at the door, with names from the site, plus a small printed run to the confirmed need. Seats are RSVPs to the room's capacity, with a waitlist.
  - **Naming:** productions go by season and title ("2027–28, The Importance of Being Earnest").
- **Campaigns are events or calls,** each with its own page, dates and needs; there are no standalone campaigns.
  - **One Book, One Campus** (from spring 2027): members choose one book in the fall, the campus reads it in spring, with a discussion, Qirtas's reviews and a reading. It becomes a tradition only after it has run twice.
  - **Poem in Your Pocket Day** each April: members hand out pocket-sized poems in both languages, printed to the confirmed need.
  - **Banned Books Week** (late September): a display and a reading. **Arabic Language Day** (Dec 18): an Arabic reading at the Arabic typewriter.
  - **A welcome to try:** new members type their first line on the typewriter at their first event; it is named only if it runs twice.
- **Qalam's shape:**
  - **Mentors** complete safeguarding training, give two references and are approved by the Editor-in-Chief and the Vice President (the standard substitute where US-style background checks aren't available).
  - **Size:** one partner school, up to 20 students, six weekly sessions in both languages, ending in a reading.
  - **The certificate:** at least five of six sessions and one finished piece.
  - **Accounts:** each student gets a guest account with the "Qalam student" role, created by the parent's consent: private, no public profile, no Diwan or Get involved, showing only their sessions, assignments, card and certificate. The role ends with the program; the account stays a guest account (and becomes a Member's if they enroll at AUIB), and the protections for minors (§4) apply until 18.

## 4. Members
- **Membership is open to every AUIB student,** with no discrimination and no dues. One account per person, holding one class and any roles.
- **Classes:**
  - **Members:** students enrolled at AUIB in a degree or in the English Language Academy on the way to one (undergraduate, and graduate students if AUIB has them), who have joined on auibsal.org; they vote, hold office, write and are eligible for the Prize.
  - **Associate Members:** AUIB faculty and staff (Student Life's staff and the Faculty Advisor among them) and alumni, meaning anyone who studied at AUIB for at least a semester, whether they graduated or not; no vote or office, but they write and come to events.
  - **Honorary Members:** voted by the Council for outstanding contribution; no vote.
  - **Guests:** everyone else, 18 or older, or younger only with a parent's consent (Qalam students): people from outside AUIB, partners' people, parents, and those in the Continuing Education programs who aren't AUIB degree students (as US student organizations limit membership to enrolled degree students). They RSVP, write for Qirtas in any section but Games (bylined with their name and a short line saying who they are), and aren't eligible for the Prize.
  - **The class follows the person's status** with the same account, number and history: a student who leaves or graduates becomes an Associate (graduates automatically); one who returns, including for a second or graduate degree, becomes a Member again. The site checks status at the September renewal and whenever the person updates it, and Student Life's eligibility list confirms it where a vote or seat depends on it.
  - **Good standing:** a member in good standing follows the Code of Conduct. A voting member has attended at least two events or general meetings in the 12 months before the voter list's record date.
- **Joining by class,** each class with its own welcome, Today page and permissions in both languages:
  - **Students** join themselves at auibsal.org/join, and anyone may share the link.
  - **Graduates** move to Associate automatically at graduation, on their confirmed personal email, keeping their account and number.
  - **Students who leave without graduating** become Associates the same way, keeping their account and number. Both lose the vote and any seat, and keep the members' group.
  - **Faculty, staff and alumni who never joined** use "Request Associate membership" on /join, approved by the Director of Membership, or receive an invitation.
  - **Honorary Members** join by invitation after the Council's vote.
  - **Guests** sign up themselves or by invitation.
  - **No link or invitation ever grants a role or a seat** (§8).
- **One invitation system:** every invitation that gives access (Associate or Honorary membership, a partner's team, a guest) is a single-use email invitation to a named person.
  - **Terms:** valid 14 days, revocable, logged, and accepted only with that address.
  - **Who sends:** the Director of Membership (classes), a Partner Lead (their team and their event's guests) or an event's lead (guests for that event).
  - **Not allowed:** shareable links and Society-wide guest invitations.
- **Minors:** any enrolled AUIB student may join regardless of age. Sign-up asks "Are you 18 or older?"; if not, it asks the month and year of birth (deleted at 18) and a parent's address, and the parent consents once through a single-use link. Until then the page and account stay private and limited, and nothing shows or names them.
  - **Safeguarding:** no one-on-one meetings with adults; consent for trips and photos.
  - **Roles:** team roles yes, Council seats only from 18.
  - **No birthdays** are collected otherwise, shown or celebrated. Qalam is a separate program.
- **Names (as US universities keep them):**
  - **The legal name,** as on official papers, is required for Members in English and Arabic. It is entered in parts (given name, father's, grandfather's, and family name where there is one), each in its own language's script, and used only on certificates, letters, signed forms, minutes and lists for Student Life. It is locked for everyone, including every account that exists now: no member can change it themselves. After sign-up it is changed only in the Diwan (Membership → the member → Official name), by the Director of Membership on the member's request, with a reason and a second officer's approval (§7).
  - **The preferred name** is one field in each language, the whole name as the person wants it shown. By default it is the given and father's names from the legal name (for a guest, or until the legal name is complete, the name given at sign-up), and the person can change it at any time, though not to mislead or offend (the Director of Membership may reset it). It is shown everywhere else: the card, the profile, bylines, the Council page, the masthead, and every credit and name caption in the Society's videos. Credits, captions and lists take the name from the site; nobody types a name by hand. The default is set for everyone the same way, with no prompt to confirm it; the person can change it in Settings whenever they want.
  - **Guests and partners' people** give a preferred name, plus their full name when they sign. Names never need to be unique. Documents name seats only.
- **Accounts (NIST SP 800-63B, OWASP ASVS):**
  - **Passwords:** at least 12 characters, with no composition rules, a show-password toggle and a breached-password check.
  - **Two-step sign-in:** offered to everyone, and required for officers, Council seats and every role that sees personal data (§8). From Sun Nov 22, 2026, anyone holding such a role who signs in without it is taken straight to setting it up before they can go on: a passkey first (it counts as two steps on its own, NIST's phishing-resistant authenticator), or an authenticator app (TOTP) if they prefer, with recovery codes. Nobody is locked out or sent reminders; the next sign-in does it.
  - **Privacy:** the site never reveals whether an address has an account.
  - **Sign-up:** the person acknowledges the Code of Conduct (no other pledge), agrees to the Terms and the Privacy Notice, and confirms they are an enrolled AUIB student or 18 or older. It asks only what the site uses: no birth year, gender or skills (skills come from applications, §8).
  - **Reminders:** an unconfirmed email gets one reminder after 24 hours, and the account is deleted after 7 days. An unfinished profile gets reminders after 2 and 7 days, then nothing more.
  - **Data rights:** every member can download and delete their data (deletion keeps the name, roles held and published bylines).
- **The Register** is only on the site (no paper Register or binder) and private, seen only by the Executive Board and the Director of Membership. Members may choose to appear in a members-only directory. There is no bulk export, only counts plus purpose-made lists (the Elections Committee's voter list, names only; lists for Student Life), each generated for its purpose and logged.
- **Numbers:** one series of five digits for everyone (members of every class and guests), assigned once and never reused or changed, including when a guest joins or a student graduates. The founding team comes first in seat order (President 00001, then the Vice President, Secretary, Editor-in-Chief, Managing Editor, Director of Media and Next Stop host), then everyone else by join date.
- **The membership card** (never "ID card") is digital, in the account and in Google Wallet.
  - **What it shows:** the preferred name, number, class (Member, Associate Member, Honorary Member or Guest), the current role on a second line while it is held ("Editor-in-Chief", "Event lead, Writing workshop"), the year since, and a live QR with a 30-second countdown.
  - **The check page** shows those fields only for a live code; an old code shows "This code is not current". Deleting an account revokes its Wallet pass.
  - **Look and use:** a printed card only on request, from the same component. The card holds still: no tilt, sheen or turning pattern. It is for the door and for checking membership, nothing else.
- **Records of service:** the Society records staff hours and service (the Council, the masthead, team members) and writes a service letter on request. Student Life's logbooks record event volunteers. Certificates are given only for finishing Qalam and for the Mutanabbi Prize.

- **Onboarding is automatic and paperless,** run on the site, by email and through Hudhud, in the person's language, with a staff step only where a decision is needed:
  - **A new member:** sign up, then confirm (with the welcome), then the profile (preferred names, Arabic form, language), the card in Wallet and the Telegram link (Hudhud approves the join request). Then a "Get involved" email on day 3, a "Your first event" email on day 10, and after their first check-in a thank-you with a one-question survey.
  - **A new role holder:** the role email; the Code of Conduct and, for Qirtas, the confidentiality agreement signed electronically; two-step set up; Hudhud adds them to the Diwan group with their role tag; a checklist in their account (their manual, Brand essentials, their Diwan pages). Seat holders also get their mailbox handed over and a Notion invitation from the Secretary. The appointer is reminded to confirm them at the end of the first semester.
  - **Leaving a role:** site access ends the same day; the handover is signed electronically; Telegram removal follows 7 days later; a seat's mailbox password is reset; and a service letter is offered automatically.
  - **Under-18 members, graduates, leavers, guests, partners and Associate requests** follow the steps in their own sections, each with reminders (parents' consent after 3 and 7 days).
- **Paperless, measured:** the site counts the documents signed digitally, and the Society reports the count once a year in the annual report. There is no pledge: the Code of Conduct is the only thing members agree to.
- **No name fields, anywhere.** Every person who acts on the site has an account, and their name always comes from it. The only place a name is entered is the account itself, when it is made: at sign-up, or when a parent's consent link, an Associate request or Qalam's application makes the account; that name is the account's own and is never retyped on a record. Signing shows the account's legal name and the person clicks "Sign as …"; credits, co-authors, guests of an event and anyone named on a record are picked from the site's people, never typed; outsiders are invited by email and make a guest account first.
- **Accounts follow one model:** a class says whether someone is a member (Member, Associate Member, Honorary Member, or Guest for everyone else), and a role says what they do. An outside role (the Faculty Advisor, Student Life, an Advisory Board member, a partner's people, a parent) sits on whatever account the person's class gives them: the Faculty Advisor, Student Life's staff and AUIB's own Advisory Board members on Associate accounts; partners' people, parents and outside advisors on guest accounts. Partners' roles open the partner dashboard. There is no "staff" class: in the Society, staff means role holders.
- **Roles that need their own view:**
  - **Parents:** a guest account, made by the consent link, with the "Parent" role linked to their child, which shows the child's consents and lets them withdraw them. The role ends when the child turns 18 or leaves Qalam; the guest account stays.
  - **Student Life:** Associate accounts with the outside role "Student Life", which answer requests, approve trips and see Security's guest lists; the link in each request still signs them in. The Campus Recreation Officer already has an account (to be moved to this role); others are invited when needed.
  - **Qalam students:** guest accounts with the "Qalam student" role (§3).
- **Sign-in (as US universities do it: a password, plus a second step for those who need one):** the email and password is the main way in, as it is now. A passkey is offered as an optional other way in, never pushed. There is no sign-in link by email, since every link spends the email quota; email is used only to confirm the address and reset a forgotten password.
- **Being part of it:**
  - **Hours:** every opening states the hours a week it needs, and the quarterly access review checks nobody carries far more than their role.
  - **Check-ins:** once a semester, each seat holder has a short check-in with each team member, recorded only as done.
  - **Training:** the new role holder's checklist includes short trainings where the role touches people: personal data and the Diwan (every role), safeguarding (anyone near minors), blind reading (readers), consent and filming (Media).
  - **Time away:** a role holder away more than two weeks tells their seat holder, and their second covers.
  - **Thanks:** at the Annual Meeting every role holder's name is read out, and each gets a service letter automatically.
- **A members' survey** each spring (about ten questions, anonymous, both languages), reported in the annual report.
- **Accounts and sessions:** Settings lists the devices signed in, with "Sign out everywhere else", and a sign-in from an unfamiliar device sends an email. Deleting an account has a 30-day grace period in which signing in restores it. "Download your data" gives a readable page beside the JSON.
- **Renewal:** each September, members confirm "I'm still here" with one click and re-acknowledge the Code of Conduct; those who don't stay members but leave the active count (and Student Life's lists) until they do.
- **Sign-up** takes three screens at most: the address and a password (a passkey can be added later in Settings); the names (the legal name for Members, with a line saying where it's used) and the Arabic form; the agreements. Everything else waits on Today. The first two weeks' emails each point to one next step on Today and stop once it's done.
- **Journey maps:** one short map for each kind of person (a student member, an Associate, a guest, a parent, a partner's people, a new and a leaving role holder, Student Life), kept in the site's docs and checked once a year.
- **The card:** no photo (it proves membership; AUIB's ID proves identity); everyone with an account gets one, with their class and their role on the second line ("Guest · Parent", "Guest · Qalam student", "Guest · Partner Lead"); for anyone under 18 the card and its check page show only the first name and last initial (and, for Qalam, the school and year); the Wallet pass updates itself when a role, class or name changes and is withdrawn the day membership ends; Apple Wallet once its developer account is provided as a need.

## 5. Partners
- **They apply; the Society never adds them.** An organization becomes a partner only by applying at auibsal.org/partners/apply, with its profile, contact and the partnership memorandum signed on the site.
  - **Who may apply:** other AUIB clubs, charities and partner schools apply the same way. The Director of Partnerships may send the link.
  - **The vote:** the Council votes on each application by resolution. The President countersigns on the site as authorized signatory, the memorandum takes its MOU number, and Student Life is informed, or approves where AUIB requires.
  - **Ending:** a Council vote or the partner's own notice.
- **The listing:** /partners lists Council-approved partners publicly (name, logo, one line, link) with their consent. A partner's edits wait for the Director of Partnerships' approval, and its name is locked to the signed memorandum.
- **AUIB's own offices aren't partners** (AUIB, the Office of Student Life, AUIB Press, the Library, the colleges). They appear in a "With the support of" list on /partners only, each linking to its page on AUIB's site, kept by Partnerships in the Diwan (Partnerships → Register) on the Council's word.
- **The partner's people:** a Partner Lead (who signed the memorandum) and up to two team members, invited by the Lead by named email invitation. They see only their own events, checklist and guests on the partner dashboard.
- **The partner's guests:** invited by named email invitation only. Their names reach Security through Student Life automatically from the event's guest list, two weeks ahead.
- **No perks or offers (the IRS line between acknowledgment and advertising).** Partners list no discounts, codes, offers or benefits anywhere. Sponsors in kind are thanked with a "Supported by" line (name or logo) on the event page, the listing, printed programs and the thank-you, with no qualitative words, prices or calls to buy.
- **The Advisory Board's contacts** live in each advisor's own account on the site: an Associate Member for faculty and alumni, a guest account for people from outside AUIB. Notion keeps only names and seats.
- **Second Chapter:**
  - **Lead:** the Vice President while covering Partnerships.
  - **Collection boxes** carry the box's number and hello@auibsal.org, never a person's name. Each box's custodian is a named volunteer shift on the event, and the Notion box log records numbers and checks only.
  - **Prices** appear only on the sign at the sale, never in a document or Notion page, and there is no money target.

## 6. Money: the Society has none
- **No money at all:** the Society holds no budget, account or money, charges no dues and has no Treasurer. The Office of Student Life provides what it needs, through Ali Najm, Campus Recreation Officer, to the best of its ability.
- **Needs, not numbers.** Every event, the Company, Next Stop, the Tour, Second Chapter, Qirtas, Qalam and the Council keep a needs list: the item, the quantity, the date needed, and what it is for. No document, page or form shows budgets, costs, prices, spending limits, ledgers, claims or reimbursements.
  - **Who gathers needs:** the Director of Events (events), the Director of Membership (the Tour), the Director of Partnerships (Second Chapter), the Editor-in-Chief (the paper and Qalam) and the Director of Media (Next Stop).
  - **Who asks Student Life:** the Secretary sends every request from the Diwan, and logs what was asked, provided and when. Anything not provided is dropped or found through a partner, with the Council's approval.
  - **Standing needs:** Zoho Mail Lite seats if appointed directors need mailboxes; Resend Pro, Supabase Pro and Vercel Pro if the free limits are reached; three drives for Next Stop footage; a one-time VR rental.
- **No advertising and no paid sponsorship.** Sponsors give in kind (books, printing, a venue, refreshments), never money. Each gift is a row in Needs, and the sponsor is thanked by name. Offers of money are declined or referred to Student Life.
- **The one exception is charity collections** (Second Chapter and any other). The money belongs to the charity, is never used for costs, and has no feature on the site; each collection's record is a Notion page kept by the Secretary.
  - **Counting:** two people count at the close of each day, record it and keep it sealed.
  - **Handover:** witnessed, to the charity, with a receipt, then an impact report.
  - **Who:** the event's lead owns it, the Secretary witnesses and keeps the record, and the cashiers are volunteers. Student Life advises on holding cash overnight.
  - **The line:** "Every dinar goes to the charity."
- **One needs request a semester:** each department's needs for the coming semester are gathered two weeks before it starts and sent to Student Life as one request, with smaller ones as they come up.
- **The inventory:** everything the Society holds or borrows (typewriters, ribbons, drives, banners, the cart) in one Notion list with its custodian, place and condition, checked each September and at every handover.
- **Standing needs** also include Supabase Pro (daily backups), Vercel Pro (previews), and Apple's developer account (the card in Apple Wallet).

## 7. Governance
### The Council: nine seats
- **The Executive Board:** the three officers (President, Vice President and Secretary), elected by members. The President chairs it and the Council.
- **Six directors:**
  - the Editor-in-Chief (Qirtas and Qalam);
  - the Director of Media (promotion, design, channels, the web team, Next Stop);
  - the Artistic Director (the Company);
  - the Director of Events;
  - the Director of Partnerships (partners, charities, Second Chapter);
  - the Director of Membership (the Register, the welcome, the Tour, hiring, staff hours).
- **The Secretary:** records, minutes, the books, rooms and every request to Student Life.
- **Central functions stay central:** what the Society does centrally is done by its owner, never by an event's or Qirtas's own team. Media promotes Qirtas but never decides its content.
- **Covering open seats:** a time-limited assignment that ends when the seat is filled. Officers' own permissions don't include the covered powers. Until filled:
  - the President covers Events and the Artistic Director;
  - the Vice President covers Partnerships;
  - the Secretary covers Membership.
- **One person holds at most one Council seat** (Constitution 4.14); there are no other limits on roles.

### Elections, appointments and terms
- **Officers** are elected by members by secret ballot.
- **The Editor-in-Chief** is elected by Qirtas's staff (editors and contributors with at least one semester on Qirtas).
- **The other five directors** (Artistic Director, Events, Partnerships, Membership, Media) are appointed by the President after an open call on Get involved (§8).
  - **Approval:** the Executive Board approves each by resolution, after Student Life confirms eligibility, with no probation.
  - **Eligible:** a Student Member in good standing, enrolled, with a GPA of at least 2.0; from fall 2028 also a member for at least one semester.
- **Terms:**
  - **Elected seats** serve one year, from the new Council's first meeting in May.
  - **Appointed directors** serve one-year terms ending with the Council's, renewable by reappointment.
  - **Handover:** outgoing holders hand over in writing.
  - **First elections:** October 2027. The first elected Council serves until May 2028; from 2028, elections are each April, with results at the Annual Meeting.
- **Who may stand:** a member for at least one semester, a voting member, in good standing, enrolled, with a cumulative GPA of at least 2.0. Elections Committee members don't run, and there are no term limits.
- **GPA checks:** always through Student Life, never by asking students for grades.
  - **Consent:** candidates consent on the nomination form, and applicants for director seats in their application.
  - **Lists:** the Elections Committee sends its candidate list before the ballot opens, and the Secretary sends the full Council list at the start of each semester.
  - **Answers:** Student Life answers only "eligible" or "not eligible", and the Society never sees or stores grades.
  - **Falling below 2.0:** the holder is told privately and has one semester to recover before the seat is declared vacant.
- **The Elections Committee:** three members, appointed by Council resolution at least six weeks before voting opens. It makes no endorsements.
- **Nominations** are open one week, and candidates' statements run up to 200 words.
- **Voting:** online on auibsal.org by secret ballot over a set window, with a voting point in person at the meeting; the Bylaws authorize electronic voting. No proxies or write-ins.
  - **Counting:** one vote per seat; a candidate needs a majority of the votes cast, or a runoff between the top two follows within a week. A recount follows when the margin is under 5%.
  - **Appeals** go to the Faculty Advisor.
- **Vacancies:** if the President leaves office, the Vice President becomes President. Another officer seat goes to a special election within 30 days. A director seat is filled the way it was first filled.
- **Removal from a seat:** a two-thirds vote of the Council (or of a members' meeting, for an officer), after notice and a hearing. The Council may remove a member from membership the same way.

### Meetings
- **Council meetings:** monthly in the semester, on a Wednesday at 2:15 p.m. in a week without a general meeting. They are open to members as observers, with a closed session only for people matters (appointments, complaints, removals); minutes are linked, and the Secretary leads them.
  - **Quorum:** a majority of the seats filled.
  - **Online Council votes** between meetings are open 24 hours, by roll call.
- **General meetings:** all members, every other Wednesday in the semester, 2:15–3:00 p.m., access Members (news, plans, ideas, questions). They count toward the two-event voting rule, and the Secretary leads them.
- **The Annual Meeting:** each April from 2028 (election results, reports, the Mutanabbi Prize).
- **Special meetings:** called by the Council, or on the petition of one-tenth of voting members, with two weeks' notice.
- **Members' meetings:** quorum is 10% of voting members or 15, whichever is lower.
- **Amendments:** by two-thirds at a members' meeting (or online), with two weeks' written notice of the text. The Policy Manual is changed by two-thirds of the Council.
- **Rules of order:** Robert's Rules of Order, Newly Revised, where the Constitution and Bylaws are silent.
- **The Founding Meeting:** Tue Mar 30, 2027, 2:30–4:00 p.m., led by the Secretary.
  - **Who votes:** every Member in good standing who joined by the notice date (Tue Mar 16), in person or online.
  - **Adoption:** the Constitution and Bylaws are adopted by two-thirds of the votes cast, with the members' quorum. The two-event rule applies from the first elections.
  - **Then:** the Council adopts GOV-03 to GOV-06 and every manual at its next meeting.
- **Resolutions** are site records, numbered RES on adoption and linked from the Notion minutes; failed motions appear only in the minutes. Council votes on partners are minuted.

### The Constitution and its core rules
- **Art. II, Purpose:** a general statement, with no names that may change (the names of Qirtas, the Company, Next Stop and the traditions live in the Bylaws and manuals).
  - **It reads:** "The purpose of the Society is to foster the arts and letters at the American University of Iraq – Baghdad."
  - **Its objectives:** to publish student journalism, writing and art; to produce theater and performance; to produce video; and to hold events open to the University.
  - **Then two clauses:** the Society is nonpartisan (it endorses no party or candidate) and not for profit (it holds no money).
- **Dissolution:** by two-thirds of voting members at a members' meeting with two weeks' written notice, or on loss of registration. Records and any property pass to the Office of Student Life; money held for a charity goes to that charity.
- **The English text governs** over the Arabic.
- **Numbering:** governing documents (GOV-01 to GOV-03) number by Article and Section (cited "Art. IV, Sec. 2"); all other documents by numbered sections (1, 1.1).
- **Complaints:** a panel of three, chaired by the Vice President, decides within 14 days, with appeal to the Faculty Advisor.
- **Trips:** Student Life's approval is asked eight weeks ahead.

### Advisors and Student Life
- **The Faculty Advisor:** required, invited through Student Life.
- **The Advisory Board:** five to seven faculty, alumni and people from partner organizations (as individuals), chaired by the Faculty Advisor. They are invited by the Council for two years, have no vote, and meet once a semester.
- **Student Life:** Ali Najm, Campus Recreation Officer, is the Society's staff contact (registration, approvals, rooms, needs, the volunteer log), and Jelena Zivkovic is Director of Student Life. Both are Associate Members with the "Student Life" role, in the members' group only, marked with the "Student Life" member tag (not as admins), and exempt from Hudhud's removals.
- **Requests to Student Life go by secure link (the American standard where there is no campus system).** At US universities, the student-activities office answers its clubs' requests in a campus system. With none at AUIB, each request goes to Student Life by email from the Secretary's address (secretary@), with a single-use link to answer it without an account. The answer is recorded on the site, the Secretary sees its status, and a reminder follows after 3 days. The requests:
  - **a need:** provided, provided in part, or not provided;
  - **a trip:** approved or not, signed electronically, which records the approval on the event;
  - **the GPA list:** "eligible" or "not eligible" for each name, nothing more;
  - **an event's guest list** for Security, two weeks ahead;
  - **a room booking.**
  Student Life's staff answer from their Associate accounts with the "Student Life" role (§4); the single-use link still works.

### Holders on record (the founding team, until October 2027)
Wherever a name is shown (the site, credits, captions, the masthead), it is the holder's preferred name from the site (§4). Two are set by choice: the President's, "Shaheen Farjo" («شاهين فرجو»), and the host's, "Hassan Sadeq" («حسن صادق»); the others show the default until each sets their own.
- **President:** Shaheen Farjo (also covers Events and the Artistic Director).
- **Vice President:** Fejer Saif Khalid Ezzet (also covers Partnerships).
- **Secretary:** Yaqoob Ghassan Mahmood Hussein (also covers Membership).
- **Editor-in-Chief:** Mohammed-Ali Ehsan Ohmaid.
- **Managing Editor:** Mia Hakimi.
- **Director of Media:** Ali Hayder.
- **Next Stop host:** Hasan Sadeq (his legal name is to be entered on the site; he is shown as Hassan Sadeq).
- **Faculty Advisor:** none yet.
- **The Tour lead for 2027** is appointed.
- **The President is abroad Jan 24 – May 15, 2027.** There is no Acting President.
  - **The Vice President acts:** under Constitution 4.4, the Vice President performs the President's duties while the President is recorded absent, with the President's administrative powers on the site for that period, and covers any director seat still open on Jan 24.
  - **The record:** the Council records the absence on Nov 18. The President's notice to Student Life (signed electronically, acknowledged by the Vice President) goes by Sun Dec 20.
### How the Council works
- **Agendas** go out two days before every meeting; **draft minutes** within seven days, approved at the next meeting; approved minutes are open to all members; decisions are recorded in the Diwan the same day.
- **A one-page guide** to how meetings work (motions, voting, speaking), from "Robert's Rules in Brief", in both languages.
- **The officers** have a 15-minute check-in each week in the semester (online is fine), recorded in the Diwan.
- **A semester plan:** what each department will deliver, with an owner and a date, reviewed briefly at every Council meeting.
- **A second for every seat:** each seat holder names a team member who knows the work and stands in when the holder is away or leaves.
- **The year's operations calendar** lives in the Leadership Handbook: registering each semester, the GPA list, elections, handovers, the access and security reviews, the September document review, renewals and the annual report.
- **The annual report** each April at the Annual Meeting: members, events, Qirtas, Next Stop, the Company, needs met, supporters, the paperless count; one page, both languages.
- **Elections:** the rules are published before nominations open, candidates may watch the count, ballots are kept one year, and the Faculty Advisor certifies the result.
- **The Code of Conduct** forbids hazing (as the 2024 Stop Campus Hazing Act requires US campuses to publish), and reports of harassment or discrimination go to AUIB's own offices as well as the complaints panel.
- **A crisis plan** (one page, in the Leadership Handbook): who speaks (the President, the Vice President while away), who is told first (Student Life), what goes where, and how a post is corrected or taken down.
- **Who speaks for the Society:** the President; the Editor-in-Chief for Qirtas; the Director of Media for Next Stop; everyone else points the press to press@.
- **Concerns** are raised signed in. The person may ask to keep their name from the panel: it is sealed, opened only for a safety risk or with their agreement, and the reply notes that anonymous concerns are harder to act on.
- **Records people can read:** adopted resolutions (number, title, date) are open to members beside the approved minutes; resolutions about partners and documents are public. Each election has a candidates' forum in the week before voting, recorded for those who can't come.
- **Two officers** approve the most sensitive actions: removing a member, changing a legal name, granting a Council role, exporting a list for Student Life. One officer asks; another holding the same permission approves or declines on the Diwan's Desk ("For a second officer"), never their own request; an approved Student Life list downloads once.

## 8. Get involved and roles
- **The roles standard (least privilege, as US universities run student systems):**
  - **Where roles are defined:** every role is a job with a bundle of permissions, defined in its seat's manual and nowhere else. The site's role list matches the manuals exactly; retired roles are marked retired and are never shown or assignable.
  - **Four kinds:**
    - seats (the nine);
    - team roles (standing jobs under a seat);
    - scoped roles (tied to one event, production, Edition, episode, election or shift, and ending with it automatically);
    - outside roles (the Partner Lead and the partner's team, the Faculty Advisor, the Advisory Board, Student Life, Parent).
  - **Covering a seat** is a dated delegation record that ends when the seat is filled, never built into the officer's own role. One person holds at most one Council seat, with no other cap on roles.
  - **Two-step sign-in** is required for every role that sees personal data, and a passkey counts. From Sun Nov 22, 2026, the site makes each such role holder set it up at their next sign-in (§4).
  - **Shift-scoped station access is exempt from two-step sign-in:** it lasts one shift, can only attach a page to a card the volunteer scans, and shows nothing beyond the name on that card.
  - **Access ends** the day the role ends (on the site at once; in the Diwan Telegram group 7 days later). The Secretary reviews who holds what every quarter, and every grant and removal is logged.
  - **Personal data is seen only where the job needs it:** member profiles by Membership and the Executive Board; the mailing list by Media and the Managing Editor; writers' names by the Managing Editor only.
  - **Assignment:** roles are given only after an application or election and an appointment on record, by an officer on the member's page.
- **The roles, by seat:**
  - **The Executive Board:** Elections Committee member (scoped to one election).
  - **The Editor-in-Chief (Qirtas):** Managing Editor; Copy Chief and copy editors (both languages); a section editor for each of News, Voices, Letters, Gallery, Video and Games, each with up to two assistant editors; readers; staff writer, staff photographer and staff artist (standing masthead roles, with credits on pieces too); a guest editor (scoped to one Edition).
  - **Qalam:** the Qalam lead (waits until 2028); Qalam mentors and Qalam students (scoped to one run).
  - **The Director of Media:** Next Stop producer, Next Stop host, design lead, photo and video lead, social media lead, and web lead (renamed from "Technical Administrator"), all named in MED-01; Next Stop crew (scoped to an episode).
  - **The Artistic Director:** no standing team. Each production's roles are scoped and shown as its credits: director and assistant director, stage manager and assistant stage manager, producer, dramaturg, designers (set, costume, light, sound), crew, front-of-house manager, and cast (actors, a reading's narrator, understudies). Ushers and the check-in desk are volunteer shifts.
  - **The Director of Events:** event leads (scoped to one event); event teams through shifts.
  - **The Director of Membership:** the Tour lead (appointed); an alumni lead (from 2027–28), who looks after the Associate Members who are graduates (reunions, the alumni list, inviting graduates as speakers and mentors); station volunteers (scoped to one shift).
  - **The Director of Partnerships:** a club relations lead.
  - **Outside:** the Faculty Advisor (two-step required); Advisory Board members (they read the library and the Council's minutes); the Partner Lead and the partner's team.
  - **Retired:** Arabic Editor, Onboarding Lead, Records and Recognition Lead (onboarding and service letters are automatic), Production Lead, Event Coordinator, Venues and Logistics Lead, Event Staff, Submissions Manager, Section Editor.
- **How teams are shown,** with one team-list component everywhere:
  - **The Council page:** the nine seats, each with its holder or "Open", and who covers it.
  - **About → Our people:** each department's team under its seat.
  - **The Qirtas masthead,** grouped as US mastheads are: "Published by the AUIB Society of Arts and Letters"; the Editor-in-Chief; the Managing Editor; the Copy Chief and copy editors; each section with its editor and assistant editors (or "Covered by the Editor-in-Chief"); the staff writers, photographers and artists; the readers.
  - **Next Stop:** its team, and credits on each episode.
  - **The Company:** each production's credits, like a playbill.
  - **An event's page:** its lead, and after the event, "With" its team.
  - **Names:** lists use preferred names and the person's Arabic form. Members under 18 appear only with a parent's consent. Team members may hide their name from public lists; seat holders and section editors may not.
- **The first semester:** everyone newly joining a team serves a first semester on probation, and the person who appointed them then confirms them. Directors and elected seats have none.
- **Get involved lists open roles only:** Council and team roles, event teams, Qalam mentors and auditions. It has no shifts (they exist only on events) and no skill matching, and it is rendered on the server.
- **One application system (the American standard for student-organization hiring):**
  - **Openings:** each has its own page, posted in the Diwan by the seat that hires for the role, with up to eight questions, whether it asks for links to work, and who may apply. A director seat opens only after the Executive Board approves it by resolution.
  - **The application:** signed-in Members only. It has a draft that can be saved; availability; the language the applicant will be written to in; links to work when asked; an optional accommodation request; and, for a director seat, consent to Student Life's GPA check, signed with "Sign as …". A receipt is emailed.
  - **Statuses,** in Your account → Your applications: received, interview, shortlisted, offer, accepted, appointed, not chosen, declined, withdrawn. Withdrawing keeps the application, as withdrawn.
  - **Review:** by the hiring seat and a second reviewer, each scoring 1–5 with notes or recusing. Interviews are scheduled in the Diwan, use the same questions for every candidate, and are recorded in the review screen. Auditions are openings on Get involved: signing up is an application with a time slot and a few questions, scored in the review screen, and posted at least two weeks ahead; casting goes out as offers.
  - **Offers:** accepted or declined from the account within 7 days; an unanswered offer lapses as declined. A team role is assigned on acceptance and starts its first semester. A director is appointed only after the Executive Board's resolution and Student Life's "eligible".
  - **Afterward:** applicants not chosen are emailed within 14 days of the closing date. Staff alerts carry counts, never names. Applications are deleted 12 months after the decision; a hire's record becomes part of their service record.
- **The director open call:** four openings, one per seat (Artistic Director, Events, Partnerships, Membership), to which one application can go with seats ranked by preference.
  - **Timing:** they open after the Executive Board approves them and close Thu Dec 10. Interviews come before finals or in the first week of January, and appointments are approved by Thu Jan 14, 2027.
- **Qirtas postings now:** the News, Voices, Gallery and Video editors, a Copy Chief and readers. The Letters editor is filled. The Games editor and the Qalam lead wait.
- **The eight May applicants:** the President writes to each in the language they applied in, inviting them to join and apply by Sun Nov 22; the spreadsheet is then deleted.

## 9. Qirtas
- **Independence:** Qirtas has its own masthead (auibsal.org/qirtas/masthead, built from the roles people hold). The President, as Publisher, never selects work, and Media promotes Qirtas but never decides its content.
- **Six sections** (examples, not fixed lists):
  - **News:** reports, features, interviews, profiles, event coverage, explainers.
  - **Voices:** reviews, columns, opinion, letters to the editor, debates, recommendations. No party politics, religion, sect or ethnicity.
  - **Letters:** poetry, fiction, creative nonfiction, drama, translation.
  - **Gallery:** art, photography, illustration, comics, calligraphy, photo essays.
  - **Video:** members' films and video stories, recorded performances (the Company may submit), animation.
  - **Games:** the word, word search, crossword and anagrams, generated daily by the site in both languages, numbered from No. 1 and checked by the editors. The Managing Editor checks them until a Games editor exists. Members send no games.
- **The masthead:** one editor per section, accountable for it, with up to two assistant editors (team roles) and any number of contributors. Until a section editor is appointed, the Editor-in-Chief covers the section.
  - **The Copy Chief** and copy editors copy edit every text piece before it runs.
  - **The Managing Editor** handles intake for every outside submission, holds writers' names while a piece is read blind and never reads it during blind reading (giving the second approval after the decision is allowed), and puts together the Sunday Paper.
  - **The confidentiality agreement:** everyone signs it before reading.
- **Editing:** every piece needs two approvals by two different people: the section editor (or whoever covers the section), then the Editor-in-Chief or the Managing Editor. Corrections are made in place with a note and listed in the public corrections log (/qirtas/corrections). Each piece is in one language, with an optional link to its translation, and every piece is public.
- **Bylines:** the writer's name from the Register, a pen name, or "Anonymous". For a pen name or Anonymous the Editor-in-Chief must know the writer and keeps the identity confidential.
  - **Under-18s:** members under 18 may write, but nothing shows or names them without a parent's consent.
  - **Guests** are bylined with a short line saying who they are.
- **Two lanes, the American standard** (newspapers for staff work, literary magazines for open submissions):
  - **The staff lane:** staff writers, photographers and artists, and editors (mainly News, Voices columns and Video). A pitch, or an assignment from the section editor; written in the newsroom under the writer's own name; edited, copy edited and given its two approvals; then published. Never blind.
  - **The contributor lane:** Write for Qirtas, for any member or guest (mainly Letters and Gallery). The Managing Editor does intake (the name stripped); two readers score it blind (a third if their scores differ by 20 or more); the section editor decides; then it is edited with the writer, copy edited and given its two approvals.
  - **Letters to the editor and outside opinion pieces** (Voices) are never blind: the writer's identity is verified before they run.
- **Write for Qirtas** (auibsal.org/qirtas/submit; /qirtas/write redirects there) is the one door for outside work.
  - **Terms:** the submission terms (one's own work, no AI-generated text or images, rights) are set in SAL-EDT-01.
  - **For now** it takes only Letters and Gallery: for Haven until Sun Dec 6, then for the standing call (the standing flow and Edition 1), so the door never closes. News, Voices and Video take no outside submissions until the owner reopens them, and their pages carry no "send your work" link.
  - **The page** leads with Haven's title, line, call and deadline. A signed-in member sees their two most recent drafts there; everything they have sent lives in Your account → Work.
  - **Revise and resend:** the section editor may ask for one revision; it goes back to that editor, keeps its SUB number and isn't read blind again.
  - **Unpublished submissions** are deleted twelve months after the decision.
- **Two layers, as American student publications run them:** Qirtas online is the paper, published as pieces are ready (the standing flow). **Editions** («الإصدار») are its journal: numbered, two a year (fall and spring), each printed and digital, like Harvard Review or a college literary magazine.
  - **What an Edition holds:** the semester's best Letters, Gallery, Voices essays and reviews, its best long-form News features and profiles, a crossword, and Video as stills with a QR code; never breaking news. Pieces come from the standing flow and from the Edition's own themed call, if it has one; an Edition's theme links to its topic.
  - **Who chooses:** the editors select the contents, helped by the blind scores, and the Editor-in-Chief and the Managing Editor approve the table of contents together; nothing is chosen by an algorithm. Once it is approved, the site builds the Edition: the web edition, the print file, the contents, contributors' notes and the masthead as it stood that semester.
  - **The cover** is new each time, commissioned from a student artist through an open call (an opening on Get involved, eight weeks before the Edition), credited and thanked with copies; the nameplate, the Edition's number, title and season keep their places. The inside always uses Qirtas's journal design (Markazi Text for reading, Ubuntu for display), with the same parts: contents, an editor's note, the sections, contributors' notes and the masthead.
  - **Print:** one book with two front covers (dos-à-dos): English opens from the left and Arabic from the right, each half as long as its pieces need, with Gallery in the middle for both. A5, a multiple of 4 pages, saddle-stitched up to 64 pages and perfect bound above, 100 gsm text and 300 gsm covers, color for Gallery; the run is the confirmed need, with copies for each contributor, printing asked of Student Life.
  - **The digital Edition** is a reading experience, not a flipbook (which fails screen readers and phones): the cover opens to the contents; each piece has its own address with print-like layout; Gallery is full-bleed, Video plays in place, the crossword can be played, poets may add an audio reading, and translations sit side by side. The Arabic edition reads right to left. Every piece cites its Edition and page; the print file can be downloaded.
  - **Each Edition is launched at an event** (a reading), and leads the next Sunday Paper.
  - **Numbering:** Edition 1 («الإصدار 1») is spring 2027, published before finals; Edition 2 is fall 2027; then one each semester.
- **Haven** («ملاذ», Dreams and memories) is Qirtas's pilot («الإصدار التجريبي»), digital, fall 2026: the first themed call, beside the standing call. Its calls to action lead the front page, Editions and Write for Qirtas.
  - **The call:** a poem, a short story, a creative essay or an artwork about a memory, a dream or both. Up to 40 lines of poetry (up to three poems count as one entry), 2,500 words of prose, or three images (JPG, PNG or PDF, 10 MB each, each with a title and a one-line caption).
  - **Entries:** up to two per person, in Arabic or English, one language each (a translation is its own entry, with the rights to the original). Not published before except on the writer's own social media; simultaneous submissions are allowed and withdrawn if taken elsewhere.
  - **Who:** members of every class and guests 18 or older. Members under 18 may send work, but nothing shows or names them without a parent's consent. Only student Members are eligible for the Prize.
  - **Dates:** submissions close Sun Dec 6, 2026, 11:59 p.m. Baghdad time; writers hear back within the week; the pilot is published Wed Dec 16, 2026, before finals end; it leads the Jan 3, 2027 Sunday Paper.
- **Topics** are a short list kept by the editors; a topic page goes public only once it has three pieces, and nothing links to it before then.
- **"From the Society":** every announcement the Society sends (§14) is published in this labeled stream, on Qirtas's front page and at its own address, dated and in both languages. Media owns it; it is never in News, never bylined and never chosen by editors. Qirtas may cover an announcement as its own piece. The Society's own news never appears as News.
- **The 22 pieces made on Oct 14** were compiled with an AI writing tool, so none runs as written:
  - **The 15 about AUIB news since spring 2026** (Mar 31 to Oct 14) go through the staff lane. Each is assigned to a staff writer, who reports and writes it anew from the Qirtas chat's fact sheet and AUIB's own announcement. It runs under the writer's byline, dated on or close to its event (the owner's choice against SPJ, which dates a piece by its publication). Piece 5 (the Times Higher Education shortlist; KAUST won on Nov 4) and piece 15 (the plan to 2031, with no event) are left to the News editor, as new items or not at all. The AI text is deleted once each piece is rewritten.
  - **The Society's posts** become two "From the Society" notices dated Nov 8: "auibsal.org is open" and "The Society's documents are online" (the Member Handbook among them). Charter Day is out.
  - **Deleted:** the three pre-2026 pieces.
- **The May applicants** (a Microsoft Form) each get a letter from president@ inviting them to join and apply on Get involved by Sun Nov 22, with the role the Editor-in-Chief has in mind. The form, its responses and any copies are deleted now.
- **Online** as pieces are ready.
- **The Sunday Paper:** the monthly newsletter, sent by hand on the first Sunday, from qirtas@ with replies there. It is one of the two topics of the Society's mailing list (§14).
  - **Each issue,** in this order: the editor's letter; the month's pieces; "From the Society" (the month's announcements, one line each with a link); Events (the coming month's); the open roles; a call to write. Everything but the letter is filled in from the site when it is sent.
  - **Sending:** the Managing Editor writes the letter in the Diwan (Qirtas → The Sunday Paper), in English and Arabic, sends a test to the Editor-in-Chief, whose go is the approval, then sends one edition per language to the topic. Sent issues are archived publicly at /sunday-paper.
  - **The first issue, Dec 6:** put together from Nov 30, with the test on Dec 3.
- **The Mutanabbi Prize:** one prize in two categories, given at the Annual Meeting each April from 2028, for the year to March. Winners are featured in the spring Edition, and the reward is a certificate with no cash.
  - **Qirtas category:** the best work published in Qirtas by a student Member (not Associate or Honorary), April 1 to March 31; the first covers launch to March 31, 2028. Anonymous or pen-name work is eligible when the Editor-in-Chief knows the writer, and a winner chooses whether to be named.
  - **Qalam category:** the best work by a Qalam student, first given in April 2029.
  - **Judging:** editors draw up a shortlist in each category. One outside judge scores each work out of 100, blind. Voting members vote online for one work per category (Qalam students' names hidden), and vote shares are scaled so the top work scores 100. The final score is 70% judge and 30% members; a tie goes to the judge. The Editor-in-Chief and the Secretary check the count.
  - **Recusal:** editors, the judge and Council members recuse from anything they are connected to.
  - **Ballots** are kept one year after the results, like election ballots.
  - **Retired:** the Qirtas Awards, the other five awards, the chapbook and hand-made puzzles.
- **More rules for Qirtas:**
  - **The Prize** judges everything published that year, online or in an Edition; winners appear in the spring Edition.
  - **Unpublishing:** a piece comes down only for safety, legal reasons or a serious error, decided by the Editor-in-Chief, with a note left in its place (the Student Press Law Center's standard).
  - **AI:** no AI-written text or images in anything Qirtas publishes, staff included; spellcheck, grammar checkers and dictionaries only; no machine- or AI-translated text.
  - **No comments** on pieces; readers answer through letters to the editor.
  - **Games** are generated a week ahead and checked once a week.
  - **Licenses:** each piece defaults to CC BY-NC-ND, and the writer may choose another.
  - **Copies for the record:** each printed Edition goes to Iraq's National Library and Archives, AUIB's Library and the Society's archive.
- **The newsroom's standards** (SPJ and US student newsrooms): anonymous sources only when a source faces real harm and the information matters, with the Editor-in-Chief's approval and the source known to two editors; every News fact checked against a second source or document before the second approval, with the checker noted; writers disclose ties to what they cover, and editors reassign or note it.
- **Qirtas's identity:** its own nameplate ("Qirtas" with «قرطاس», in Ubuntu Light) and the line "AUIB's paper of news, letters and art", inside the Society's brand. Every section's front page follows the one pattern, with its editor named from the masthead and its call as the action. Each contributor has a page listing their pieces (by preferred or pen name; Anonymous pieces left out; minors only with consent). The colophon ("Set in Ubuntu and Markazi Text. Written in Baghdad.") appears on Qirtas's pages and in each Edition, not in the site-wide footer.
- **Writers hear at each step:** received (with the record number), in reading, the decision (accepted, declined with a kind standard note, or revise and resend), edits to approve, and published with the link.

## 10. Events
- **One events manager, one standard event.** Every event (Council and general meetings, the Tour's days, Second Chapter, Qalam sessions, each Edition's launch) is made in Notion's Events database and copied to the site, where Events (auibsal.org/events) shows it and takes RSVPs and check-in. Nothing is built for one event or one kind of event anywhere.
- **The standard page:** title, date and time, place, description, image, lead, host (the Society or the partner it is held for) and links. Every description ends with how to ask for an accommodation and by when.
- **Access:** Open (anyone, no RSVP), RSVP, Members (check-ins count toward voting) or Private (invited only, such as a partner's private event). Council meetings are Members events, since members may observe them (§7), with the closed session held apart.
- **Standard parts only:** RSVP and check-in, a needs list, volunteer shifts (only on an event; they log no hours), a partner checklist, and links from the night (photos, recordings, the Qirtas piece, minutes).
  - **Capacity:** RSVPs close at the room's posted capacity, with a waitlist.
  - **Debriefs:** each event links its debrief, kept in Notion without names.
- **Booking:** RSVPs ask only about accessibility needs, and diet when food is served. A released place goes to the next on the waitlist by email until two hours before the start; after that, places are filled at the door. Unclaimed places are released 10 minutes before the start.
- **One-event jobs** (box custodians, cashiers, ushers, check-in) are volunteer shifts on the event, signed up for with no application, as US volunteer slots are. Only an event lead and a Company production role are appointed through Get involved.
- **Publishing:** an event is published only with a lead and a confirmed place. Leads:
  - the Secretary for Council and general meetings and the Founding Meeting;
  - the President for the Dec 1 pilot;
  - the Director of Events (the Vice President while the President is away, if the seat is open) for the Apr 23 trip;
  - the Director of Events names a lead for the rest.
- **Off campus:** an event can't be published until Student Life's written approval is recorded on it (date and who approved), and participants give trip consent when they RSVP.
- **Coverage:** the Director of Media's team covers events with photography consent and adds the links; each lead requests coverage when planning. Minutes and resolutions are linked to their meeting's event.
- **Notion's Events database:**
  - **Arabic rows** mirror their English rows' access, off-campus setting and status.
  - **Spring dates** stay in Planning until their room is confirmed.
  - **Properties:** Access (renamed from "Way in"), Lead (from "Owner") and Host change with the site, which reads both names.
- **After an event,** its page links its photos and any recording within a week (each Edition's launch reading is recorded and posted to YouTube with the readers' releases).
- **Calendars:** a public calendar feed of all public events ("Subscribe in Google or Apple Calendar") on the Events page, and "Add to calendar" on every event. The semester's calendar is published three weeks before classes start, and later events at least two weeks ahead. Spring events keep the Tuesday slot.
- **Each event page states its access** plainly (step-free or not, seating, food and its main allergens). Check-in keeps working without a connection and syncs later. A released waitlist place is held for the next person for 12 hours (or until two hours before the start). Everyone who RSVP'd gets one reminder email the day before, with "Can't come? Cancel".
- **Off-campus trips** ask an emergency contact with the trip consent, deleted a week after the trip, and the consent includes the standard acknowledgment of risk and the conduct expected (never a waiver of rights the law doesn't allow).

## 11. The Typewriter Tour and invitations
- **The 2027 Tour:** four days, Sunday to Wednesday of the spring club fair week, 11:00 a.m. to 2:00 p.m. (or Student Life's Ramadan hours), with no food or drink at the station.
  - **The fair day** is at the Food Court (34–35), on the date Student Life sets.
  - **The other three days,** in order: CEID/ELA (building 56); the medical sciences cluster (00 Healthcare Technology, 01 Labs, 02 Pharmacy, 05 Dentistry, classrooms 03, 04 and 06); and LH, the lecture hall on the west edge by the outer road (rooms LH 1A, 2A and so on).
  - **Not stops:** no Thursday or Friday; Saturday only for invited or RSVP events. The Library (47), the College of Arts and Sciences (65) and the College of Law (82) are not stops.
- **No paper at the Tour.** The writer joins on auibsal.org by QR code, and a trained volunteer with per-shift "station" access photographs the typed page and attaches it by scanning the writer's live card. The access ends with the shift and is logged; it is tested at the Dec 1 event. The writer takes the original home.
  - **Who keeps a page:** a Member, or a visitor 18 or older on a guest account made at the station.
  - **Faculty, staff and alumni** send "Request Associate membership" at the station; their page is held privately, attached on approval, and deleted if the request is declined.
  - **Writers under 18** keep their page private until a parent consents.
  - **Student IDs:** the Society never asks for a student ID number; the AUIB email is the account's identifier and is never shown publicly.
- **The Tour lead** is a team role on the membership team, appointed by the Director of Membership (a first semester applies). The lead runs the Tour and the typewriter at the fall club fair table.
- **Needs:** 300 numbered A5 sheets, 265 stickers, 4 posters, a date stamp, a power bank, 10 pens for Arabic pages, a cart, 4 ribbons, a service, a borrowed spare and an Arabic machine, a table and two chairs per stop per day (4 sets), 4 laminated prompt cards (two per language), 4 QR signs, a scrap pad and 4 printed tally sheets.
- **Page numbers:** TOUR-<year>-<three digits>, with the stop as its own field. 2026 pages keep their TT26- reference.
- **The spring 2026 pages:** scanned, with consent from the import file. The slips are shredded, and the originals are offered back at the membership table; any not collected are shredded at the end of fall 2026. Pages with no email stay private: a writer claims one through Help Desk and an editor attaches it by hand. Pages still unclaimed after the spring 2027 Tour are deleted.
- **The spring 2026 invitation:** sent from the site on Sat Nov 7, 2026 by the President, to the Tour writers (168 sent, 13 bounced, 155 delivered).
  - **Ten of the 13 bounces were typing errors,** corrected on Nov 11. Two of those writers had already joined, and their pages are attached. The other eight got the invitation as their own list ("Typewriter Tour, spring 2026: corrected addresses"), tested on the President and sent on Nov 11.
  - **Three addresses are still unknown** (amer.1241347, asmaa.1241540, murtada.1230198). Those pages stay private and claimable through Help Desk.
- **The fall 2026 club fair sign-ups** get the same invitation once their paper sheets are logged on the site; the sheets are then shredded. Their list keeps its place, empty, until then.
- **The invitation lists are temporary.** Once the fall list is sent, the lists, the Tour import and their test-and-send page are removed from the site. Later invitations to join go out as announcements to the mailing list. From 2027, any such invitation is sent by the Director of Membership.
- **Everyone invited is on the mailing list** (§14). A page keeps its words and stop on the site, under the writer's control. Only the invitation's extra copy of words and stop, and the Tour invitation's Resend segment, are deleted 30 days after the send (Dec 7 for the Tour list).
- **The playbooks** (MEM-03, and PTN-02 for Second Chapter) are updated by each lead within two weeks of every run.

## 12. Documents and forms
- **The document set.** Codes follow the owning Council seat (GOV is the members' own). 01 is the family's general manual (the position manual the next holder takes over), and 02 and up are its programs. Codes have two digits and are never reused, and a document exists only if it has its own owner or audience.

| Code | Document | Kept by | What it holds |
|---|---|---|---|
| SAL-GOV-01 | Constitution | Secretary | Name, purpose, classes and non-discrimination, the Council, elections, meetings, advisors, removal, amendments, dissolution, Robert's Rules, no money |
| SAL-GOV-02 | Bylaws | Secretary | Election and meeting procedure (incl. online voting), hiring and the first semester, the needs procedure, records |
| SAL-GOV-03 | Policy Manual | Secretary | Code of Conduct, safeguarding (incl. Qalam), complaints, photography and consent, charity collections, privacy in practice, sustainability, the retention schedule |
| SAL-GOV-04 | Privacy Notice | Secretary | The site's privacy policy (public, /privacy) |
| SAL-GOV-05 | Terms of Use | Director of Media | The site's terms, incl. submissions and copyright (/terms) |
| SAL-GOV-06 | Accessibility Statement | Director of Media | The site's accessibility commitment (/accessibility) |
| SAL-GOV-07 | Vulnerability Disclosure Policy | Director of Media | How to report a security problem (public, /security), from CISA's template |
| SAL-EXB-01 | Leadership Handbook | Secretary | The seats and officers, meetings in practice, needs, agreements and consents, where things live, handover; pointers to every other book |
| SAL-EXB-02 | Annual Plan 2026–27 | President | The year's goals, the five measures (Notion's Measures database, five rows), the calendar; keeps its code each year |
| SAL-EVT-01 | Events Manual | Director of Events | The semester calendar, the standard event, access and parts, ways to run an event, leads, capacity, checklists, coverage |
| SAL-MEM-01 | Membership Manual | Director of Membership | The Register, recruiting, joining by class, guests, the first semester, Get involved, staff hours and letters, certificates, Hudhud removals |
| SAL-MEM-02 | Member Handbook | Director of Membership | For members (public): joining, classes, taking part, voting, the Code of Conduct in brief |
| SAL-MEM-03 | Typewriter Tour Playbook | Director of Membership | The Tour's run-of-show and procedures |
| SAL-PTN-01 | Partnerships Manual | Director of Partnerships | Applying, the Council's vote and ending; the register; the partner's team and guests; the checklist; sponsors in kind; the Advisory Board's contacts |
| SAL-PTN-02 | Second Chapter Playbook | Director of Partnerships | The drive and sale, the charity, the cash procedure, handover and impact report |
| SAL-MED-01 | Media Manual | Director of Media | Channels and accounts, email, announcements, Telegram and Hudhud, Instagram, YouTube, LinkedIn, coverage, photos and consent |
| SAL-MED-02 | Brand and Identity | Director of Media | The brand kit in `packages/brand` (§15) |
| SAL-MED-03 | Next Stop Show Bible | Director of Media | Format, cast and crew, filming, releases, care rules, YouTube and Reels |
| SAL-ART-01 | Arts Manual | Artistic Director | The Artistic Director, rights and licensing, venues and safety, performances at any event |
| SAL-ART-02 | The Company Production Handbook | Artistic Director | Auditions, casting, the season, rehearsals, crew, safety, performances |
| SAL-EDT-01 | Editorial Standards and Stylebook | Editor-in-Chief | Independence, ethics, corrections, submission terms, house style for everything the Society publishes (public) |
| SAL-EDT-02 | Qirtas Staff Manual | Editor-in-Chief | The masthead, sections, Write for Qirtas, the pipeline, the Editions, the Sunday Paper (internal) |
| SAL-EDT-03 | Qalam Program Handbook | Editor-in-Chief | The summer program and its plan for working with minors |
| SAL-EDT-04 | Mutanabbi Prize Rules | Editor-in-Chief | Categories, eligibility, shortlisting, judging, the members' vote, the award |

- **Retired codes:** SAL-POL, SAL-HBK, SAL-STR, SAL-PRP, SAL-BRD, SAL-PLT, SAL-QRT, SAL-CMP, SAL-OPS, and SAL-GOV-03 as Roles and Staffing.
- **Every document:**
  - **Form:** a Notion page, not a file; PDFs are exported only when a printed or emailed copy is needed, and never stored. English and Arabic editions are separate rows sharing one code and one slug (no "-ar"), and the site serves the reader's language.
  - **Style:** Version 1 with no change notes; headings stand alone; it ends with its last section ("Thank you." closes only printed pieces); seats only, no holders' names.
  - **The header line under the title:** the code · the keeper · the status · a short link to the other edition ("SAL-MEM-01 · Kept by the Director of Membership · Version 1, proposed until the Council adopts it · العربية"; Arabic «SAL-MEM-01 · يحفظها مدير العضوية · النسخة 1، مقترحة حتى يعتمدها المجلس · English»).
    - **GOV-01 and GOV-02** say "until the Founding Meeting adopts it".
    - **GOV-04 to GOV-06** say "Effective November 8, 2026 · Version 1, proposed"; **GOV-07** says "Effective the day it is published · Version 1, proposed".
    - **On adoption** the status becomes "Version 1 · Effective <date>". There is no "Dated" line.
- **Publishing before adoption:** the public documents appear in the library marked "proposed", both editions together. Staff manuals and internal documents (such as the Annual Plan and EDT-02) are never published.
- **Policy changes:** material changes to GOV-04 and GOV-05 are emailed to members at least 14 days before they take effect. Accessibility requests (GOV-06) are answered within three working days.
- **Records are not documents:** the Founding Proposal, minutes, reports and adoption records are kept in Notion by name, with no code.
  - **The Founding Proposal** is a one-page cover memo to the Office of Student Life: who the Society is, where it stands, the six governing documents (GOV-01 and GOV-02 for review), the Founding Meeting's rules, and what the Society asks. It is separate from the Annual Plan.
  - **decisions.md** is the one decision record; there is no decisions database in Notion.
- **No forms pages: every form is a step in the site** (the American standard for student-organization platforms, which build each form into its task). Each agreement, consent, declaration and record is asked for where it is needed, signed there (E-SIGN and UETA) and kept in the signer's Your account → Documents:
  - **Joining:** the Code of Conduct; a parent's consent for a member under 18 (a single-use link to the parent).
  - **Roles:** on accepting a role, the role agreement, the conflict-of-interest declaration and, for Qirtas, the confidentiality agreement; leaving a role, the handover; the new role holder's checklist; a service letter is a button on the record.
  - **Events:** "Pitch an event" on Get involved; trip consent when RSVPing to an off-campus event; the debrief after the event; an incident report from the event's page.
  - **Get involved:** applications; interview and audition scores in the review screens; on accepting a Company casting offer, the Company agreement.
  - **Next Stop and coverage:** the media release, by single-use link when someone is booked for a shoot or appears in coverage.
  - **Partners:** the partnership memorandum, inside the partner application.
  - **Qalam:** the mentor agreement; the parent's consents for taking part, photos and publishing, signed by each parent through their own single-use link (the school gives the parents' emails with its application, and the teacher gets a copy of each signed consent). Signing makes the parent's guest account with the "Parent" role and the student's guest account with the "Qalam student" role.
  - **Governance:** a concern, from Contact ("Raise a concern"); a motion or petition for a members' meeting, in Your account, collecting members' signatures; nominations and ballots in elections.
- **Names, not numbers.** Each signed document type has a stable name and version (for example "media-release", version 1), which the signature record, /verify and the retention rules point to. Each signing also gets its own record number (AGR, §12's table) and a verification code, shown on the signer's copy, so every signed copy can be told apart. The F-numbers and auibsal.org/forms retire: a one-time table in the Leadership Handbook maps each old number to its new name so anything already signed still resolves, and every shared /forms address redirects to its new home. The handbook's register becomes "Agreements and consents", by name, and holds only what people sign: `code-of-conduct`, `role-agreement`, `conflict-of-interest-declaration`, `confidentiality-agreement`, `handover`, `members-meeting-motion`, `event-pitch`, `concern`, `media-release`, `partnership-memorandum`, `company-agreement`, `publication-agreement`, `trip-consent`, `parent-consent`, `qalam-mentor-agreement`, `qalam-parent-consent` and `qalam-publishing-consent`. Letters, notices, minutes, score sheets, reports, lists and checklists keep stable names too (`audition-application`, `semester-report` and so on) but are templates or records, listed in the templates index, never in the register. Signed copies live in Your account → Documents.
- **Paper** is only a backup (photographed into the record the same day), plus the two-person cash count.
- **One source:** the site's list of agreements and consents matches the handbook exactly, and CI checks it.
- **Electronic signatures,** one standard everywhere (forms, memoranda, consents, nominations):
  - **Signing:** the signer is signed in (parents and outsiders open a single-use link), agrees to sign electronically, sees the legal name on their account and clicks "Sign as …" (nobody types a name, §4).
  - **The record:** the site records the name, number, time, IP address, the exact document version and its SHA-256 fingerprint. It shows a signature block, emails the signer a copy, and makes the record checkable at /verify.
- **One template, many outputs:**
  - **Content** is written once, in the list of agreements and consents.
  - **Design** is made once in `packages/brand` (form, letter, membership card, certificate).
  - **Rendering:** the site renders them, the printed copy is the same page printed from the browser, and Google Wallet carries the same fields.
  - **The card and certificate** keep the live site's designs: the card's guilloche and live QR panel, and the certificate's rosette seal from the serial with a QR to /verify.
- **Letters** (service letters, thank-you letters, invitations and the rest) share one American business-letter template:
  - **Date:** no weekday ("November 7, 2026" / «7 تشرين الثاني 2026»).
  - **Greeting:** "Dear Mr. Najm:" (a comma only in personal letters to members, "Dear Lina,"); Arabic «السيد علي نجم المحترم،» or «عزيزتي لينا،».
  - **Closing:** "Sincerely," / «مع خالص التحية،», then the signer's name and seat.
  - **Foot:** room for a verification code and QR.
- **Certificates:** two kinds (finishing Qalam, and the Mutanabbi Prize in each category), A4 landscape, each with a verification code and check page. A Qalam student's check page shows only the first name, last initial, school and year. Service is a letter, and honorary membership an invitation.
- **Numbers and codes** (permanent identifiers with no meaning built in):

| What | Format | Example |
|---|---|---|
| Documents | SAL-<family>-<two digits> | SAL-GOV-01 |
| Kinds of agreement and consent | a name and version | media-release, version 1 |
| Each signed agreement or consent | AGR-<year>-<four digits>, on signing | AGR-2026-0001 |
| Each application (roles, auditions, Qalam) | APP-<year>-<four digits>, on sending | APP-2026-0001 |
| Each Write for Qirtas submission | SUB-<year>-<four digits>, on sending | SUB-2026-0001 |
| Member and guest numbers | five digits, one series (§4) | No. 00042 |
| Certificates | CERT-<year>-<three digits> | CERT-2028-001 |
| Letters | LTR-<year>-<three digits> | LTR-2026-001 |
| Council resolutions | RES-<year>-<three digits>, gapless, on adoption | RES-2026-001 |
| Tour pages | TOUR-<year>-<three digits> | TOUR-2027-001 |
| Partnership memoranda | MOU-<year>-<three digits> | MOU-2026-001 |
| Verification codes | random, separate from the record | auibsal.org/verify/<code> |
| Semesters | <semester>-<year> | fall-2026 |
| The Edition | Edition <n>, <year> | Edition 1, 2027 |
| The Sunday Paper | by month | November 2026 |
| Daily games | No. <n>, from launch day | No. 1 |
| Event addresses | <title>-<date> | writing-workshop-2026-12-08 |

- **Records with names:** staff records that name people (interview and audition scores, incident reports) and every letter are Diwan records with permissions and retention. The Company's rights file is on the site.
- **Retention:** one schedule in the Policy Manual (what, how long, who keeps it, how it is destroyed), enforced by the site. The Privacy Notice shows its personal-data rows and links to it.

| What | Kept for |
|---|---|
| Parent consents | until the member turns 18, plus three years |
| RSVPs | two years |
| Conflict-of-interest declarations | the role's term, plus one year |
| Trip consents | one year |
| Media releases | while the material is used, plus one year |
| Audition and interview scores | one semester after the decision (interview notes follow their application) |
| Applications | 12 months after the decision |
| Unpublished Write for Qirtas submissions | 12 months after the decision |
| Removal notices | 30 days |
| The activity log | 12 months |
| Ballots and the list of who voted (elections and the Prize) | one year after the results |
| Invitation lists' copies of words and stops | 30 days after the send |
| Qalam consents and attendance / incident records | three years / seven years |
- **Every September,** each keeper confirms or updates their documents before the Council's first meeting; documents stay Version 1 with no change notes, and the Council's minutes record what was updated.
- **A data-breach procedure** in the Policy Manual: who checks and decides, and telling affected people and Student Life within 72 hours of knowing.
- **One agreement template** in plain language for every agreement (memoranda, the Company agreement, releases, the role agreement): who, what each side does, how long, how it ends, disputes to the Council then Student Life, and the signature block; reviewed by Student Life where AUIB requires.
- **The role agreement,** signed on accepting any role (people who already held a role when it was introduced are asked to sign it on Today at their next sign-in; nothing is recorded for them until they do): the Code of Conduct and, for work made in the role (design, code, photos, video, writing for the Society), the maker keeps copyright and gives the Society a lasting license to use it.
- **Receipts and undo:** every action that creates a record shows a confirmation that stays on the page and sends an email receipt with its record number and a link. People can undo what is still theirs to undo (cancel an RSVP before the start, withdraw a submission before its decision or an application, withdraw a consent or release for the future). Irreversible steps need a second step on the page, never a pop-up.

## 13. The site (auibsal.org)
- **What it is:** everything built goes live, revised to this file, and what isn't built yet goes live as it is finished. It has no Treasurer, budget, ledger, claims, spending, advertising or charity-collection features, no "Programs" section and no series. Events show needs, not costs. The Council page lists the nine seats with full titles.
- **The menu:** Events · Qirtas · The Company · Next Stop · Get involved («شارك معنا») · About, with a Join button.
  - **Signed in,** Join becomes the account menu (the person's preferred name): Your account, The Diwan (role holders only), Your card and Sign out; on phones it sits at the bottom of the main menu. Signing out ends the session on that device and says so.
  - **Qirtas's own menu:** the sections (News · Voices · Letters · Gallery · Video · Games), then Editions · Masthead · Topics (once one is public) · The Mutanabbi Prize, with Submit as the one solid button. Its footer: Corrections, From the Society, the Sunday Paper sign-up and Write for Qirtas's guidelines.
  - **Saving:** pieces, events, openings and episodes have a Save button. Saves are private, kept in Your account → Saved, and nothing counts them publicly.
  - **About:** the one sentence, the motto, what the Society does, how it is run, a short History, then its cards.
  - **Contact** holds the photo and video removal form. A removal request hides the item at once; it is taken down within two business days unless declined with a reason. The media release covers everyone who appears.
  - **Removed:** AUIB's academic calendar (one link instead), Gallery selections, text-size buttons, the Sources box (sources are inline links) and "Sign in with SAL".
- **Menus, buttons and choices:** menus, tabs and action buttons sit in horizontal rows, wrapping on small screens; choices are a vertical list. They are built once in the brand kit.
- **Addresses:** public pages by task, the staff area by seat.
  - **Public:** /join (the Tour at /join/typewriter-tour), /sign-up, /sign-in, /events, /qirtas (/qirtas/editions, /qirtas/submit, /qirtas/corrections, /qirtas/masthead, /qirtas/from-the-society; /qirtas/issues redirects to /qirtas/editions), /company, /next-stop, /about, /about/council, /about/press, /library, /partners (/partners/apply), /privacy, /terms, /accessibility, /verify, /sunday-paper.
  - **Signed in:** /account ("Your account", «حسابك»), one hub for everyone with an account, its tabs shown by class and role (guests see fewer): Today (what's next and to-dos to sign or finish), Events (RSVPs, tickets, waitlists, check-ins), Work (drafts, submissions, published pieces, six-word pages, credits on episodes and productions), Applications (roles, director seats, auditions, Qalam mentoring), Saved, Roles and service (roles, hours, service letters), Documents (everything signed, each with its check link), Elections (while one is open), Card and Settings (names, language, Arabic form, notifications, mailing topics, security, data download and deletion). A partner's team keeps its own /partners/dashboard.
  - **Who sees what:** public pages for anyone; Your account for the person; the Diwan only for role holders, by seat, with event leads and production roles seeing only their own event or production; the partner dashboard only for a partner's people.
  - **The Diwan, by Council seat:**
    - /diwan (Desk);
    - /diwan/council (meetings and minutes, elections, announcements, requests, concerns, disclosures, the library, needs);
    - /diwan/qirtas (newsroom, the Sunday Paper, Qalam, the Prize);
    - /diwan/media (Next Stop, channels, design at /diwan/media/design);
    - /diwan/company;
    - /diwan/events;
    - /diwan/partnerships (the register and its "With the support of" list);
    - /diwan/membership (the Register, guests, invitations, the Tour, openings, service).
  - **Filters** use query strings (/events?month=2026-11, /search?q=).
  - **Redirects:** any address that has been shared (in an email, post, poster or QR code) and then changes gets a permanent redirect (308), for example /membership → /account, /qirtas/write → /qirtas/submit, and every renamed event address. An address never shared simply changes. Pages people share keep their address.
- **What the site keeps of people:** only what it uses (§4). The retired profile details are deleted, and the Register has no bulk export. Personal data (members, guests, parents, Qalam students) lives only on the site, never in Notion.
- **Analytics and cookies:** cookieless analytics only (Vercel Web Analytics); no Google Analytics, Tag Manager or cookie banner. The cookies, all listed by name in GOV-04 (a new cookie is added there before it ships):
  - `sb-…-auth-token`: sign-in, until sign-out;
  - `NEXT_LOCALE`: the language, for the session;
  - `sal_theme`: the theme, one year;
  - `sal_ways`: the staff view;
  - Cloudflare's security cookies, when its checks run.
- **Security:**
  - **Headers:** a Permissions-Policy (the camera only, for scanning cards) and X-Frame-Options DENY, matching the content policy.
  - **Reporting:** security.txt points to security@.
  - **Data:** Supabase's AI data features are off, and unused production secrets are deleted.
  - **Monitoring:** the platforms' own logs, plus one free uptime check of the home page and sign-in that alerts media@ (no personal data).
  - **Grants and reviews:** the public role may call only the functions it needs; one security review a year against OWASP ASVS Level 2, each September, with every platform's settings checked.
  - **Backups:** daily, through Supabase Pro asked as a need; personal data is never exported to make backups.
- **Speed:** every public page meets Core Web Vitals at the 75th percentile on a mid-range phone (largest paint under 2.5 s, response to taps under 200 ms, layout shift under 0.1), checked in CI and on real visitors with Vercel Speed Insights (cookieless, to be added beside Web Analytics). Images in AVIF or WebP at the size shown, with sizes set; YouTube loads only when tapped; fonts trimmed.
- **Cloudflare stays in front of the site (proxied),** with every feature that protects it (the firewall, bot protection, DDoS protection, SSL Full (strict), caching of files), the real visitor address passed through, and Vercel's firewall as a second layer. The features that rewrite pages after the site builds them (Email Address Obfuscation, Rocket Loader, page minifying) stay off, because the site's script policy blocks what they inject and rewritten pages break React; the role addresses on the site are public by design, and Zoho filters spam.
- **Where data lives:** GOV-04 states the regions of the database and of Vercel.
- **The five measures** are counted from the site's own records and shown as counts on the Diwan's Desk, with no tracking of people.
- **Search** covers pieces, Editions, events, episodes and documents in both languages, with no people in public results. **Being found:** Google Search Console and Bing, structured data on events (Event), episodes (TVEpisode) and Editions (Periodical), English and Arabic pages linked for search (hreflang), and a preview image for every page. **Short addresses** (auibsal.org/haven, /tour, /join) go on everything printed, beside the QR.
- **Your account:** one notifications page (each kind of message by channel, with account and security emails always on); Today shows each person's next steps and clears them when done.
- **How the interface behaves:** the main button sits at the end of its row (right in English, left in Arabic), with Cancel as a link before it, full width at the bottom on phones; buttons say what happens, in sentence case ("RSVP", "Send your work", "Apply", "Sign"), never "Submit", "OK" or "Click here"; forms have labels above fields in one column, optional fields marked, errors checked on leaving a field and listed at the top, and drafts saved as you go; the language switch keeps its corner (top right in English, top left in Arabic), named in its own language, never a flag, and keeps you on the same page; pages three levels deep show a breadcrumb; important confirmations stay on the page; lists show their outline while loading, and every empty list says what will appear and how to add the first; tap targets are at least 44 points.
- **Accessibility:** the site won't publish an image without alt text or a video without captions in its language.
- **The code:** semantic versions on GitHub Releases, with notes for staff only; Renovate weekly; Node's active long-term-support line, with major updates once a semester; one retention scheduler (pg_cron); internal names renamed to the Society's language in one planned migration (no "programmes" or "journal"). Preview deployments stay off until Vercel Pro is provided, then return for every pull request.
- **The frame every page shares:**
  - **The header:** the logo (home), the menu, search, the language switch, the theme toggle, then Join or the account menu.
  - **The public footer,** four short columns: The Society (About, the Council, Press, Partners, Contact); Take part (Join, Get involved, Events, Write for Qirtas); Read and watch (Qirtas, Editions, Next Stop, The Company, The Sunday Paper sign-up); Policies (Privacy, Terms, Accessibility, Code of Conduct, Security). Then the social links, "Raise a concern", the postal address, "Paperless by default. Books reused through Second Chapter." and "© 2026 AUIB Society of Arts and Letters. All rights reserved." (a range, 2026–<year>, from 2027). Qirtas's pages add that each piece belongs to its writer under the license shown on it.
  - **Private spaces** (Your account, the partner dashboard, the Diwan) are workspaces with a slim footer: Help, Privacy, Terms, Report a problem; the Diwan's also shows the site's version and build.
  - **The partner dashboard** stays its own workspace, like the Diwan but only for the partnership, with tabs for Events, Checklist, Guests, Team and Memorandum.
  - **Guests** see Today, Events, Work, Documents and Settings in Your account.
  - **The Diwan's seats** run down a side list on a computer (the Desk first) and across the top on a phone.
- **Pages and actions:** each page has one main action (Home: Join; Qirtas: Submit; Events: RSVP; an Edition: Read; Next Stop: Watch the latest; the Company: Audition when open, otherwise See the season; Get involved: Apply; Partners: Become a partner). Every section's front page opens the same way: its title, one sentence, its action, then its lists. The home page shows, when each has something: the motto and Join; the next three events; the newest Edition or current call; the latest from Qirtas; Next Stop's latest; open roles; From the Society.
- **About,** in order: the one sentence, the motto (al-Mutanabbi's full verse in Arabic with its translation, and the story of the name: Qirtas is the paper of al-Mutanabbi's verse, the line the motto comes from), what the Society does, how it's run, a short history, the Society by the numbers (counted by the site), the Council, the Faculty Advisor once there is one, the independence statement ("The AUIB Society of Arts and Letters is a registered student organization at the American University of Iraq – Baghdad. Its views and publications are its own and not those of the University."), and the documents.
- **Help:** a Help page answering the twenty most common questions, a "Words we use" page explaining the Society's terms, and "Report a problem" on every page, reaching the web lead in the Diwan.
- **Contact:** one page that routes by topic (a question, the press, a letter to the editor, Next Stop, accessibility, privacy, a removal, a concern, a partnership) to the right role address, showing the answer time; signed-in people's details come from their account.
- **The Library,** grouped by who it's for, from each document's "For" field in Notion's Documents (Everyone, Members, Staff, set by its keeper; Staff documents never leave the Diwan), each document with its code, keeper, status and a two-line summary, searchable, both editions together; staff manuals only in the Diwan.
- **Policies at short addresses:** /code-of-conduct (public; it shows SAL-GOV-03, Art. II, with no separate document) and /security (SAL-GOV-07), beside /privacy, /terms and /accessibility; each keeps its effective date at the top, and GOV-07's is the day it is published.
- **Credits:** /about/credits lists the software, fonts and icons the site uses with their licenses (generated), and About → Our people credits the web team. The repository is public (for openness and the free checks a public repository gets: branch rulesets and the weekly OpenSSF Scorecard) but not open source: all rights are reserved to the Society, no one may reuse the code without a written agreement, every contribution is under the role agreement, and nothing secret or personal ever goes in it.
- **Partners and sponsors on the site:** partners in alphabetical order with equal-size logos, grouped by kind (clubs; culture and the press; charities; schools and universities; others), then "With the support of", then Become a partner; no tiers or ranking. Sponsors in kind appear at one small size on their event and its thank-you only.
- **Tools and settings:**
  - **A review before any new service or add-on that holds data** (what, where, privacy terms, cost now and later, owner account, how to leave), approved by the Director of Media and recorded; a stack page in the docs lists every service with its plan, owner account, renewal date and exit; a yearly feature audit in September retires what wasn't used.
  - **Supabase:** email confirmation and leaked-password protection on, short token lifetimes, network restrictions where the plan allows, and a monthly look at the advisors on the Desk. Its sign-in emails go through Resend from hello@auibsal.org in the Society's template and the person's language.
  - **Resend:** open and click tracking off; bounce and complaint webhooks into the site; one sending-only API key per use, rotated yearly.
  - **A permissions table** in the Leadership Handbook, generated from the code, for the quarterly access review. Shared credentials go in Bitwarden (its free plan first).
  - **Speed Insights** is added (only Web Analytics is installed today).
- **Subdomains:** the site and people's mailboxes stay on auibsal.org (www redirects to it); bulk mail goes from news.auibsal.org; a free public status page lives at status.auibsal.org, fed by the uptime check; nothing else gets a subdomain, since paths do the rest.
- **Templates:** the design page lists every template (emails, letter, certificate, card, posts, posters, playbill, an Edition's cover and inside, Next Stop's package) with its owner and where it's used.

## 14. Channels and email
- **Who runs them:** every channel is run by the Director of Media, owned by a Society account (never a personal one), with two officer admins and two-step verification wherever offered.
  - **Telegram is the exception:** Telegram ties ownership to a person, so the members' group, the Diwan group and Hudhud are owned by the President's account. The Vice President, the Secretary and the Director of Media are full admins, and ownership is transferred in writing at each handover.
- **What the Society sends, by kind** (each has one home, and nothing is sent twice):
  - **Announcements** (openings, calls, elections and results, a new episode or production, policy changes): written once in the Diwan (The Council → Announcements), in English and Arabic. Media drafts; the President approves and sends after a test to the President in both languages (any change clears the test); the Vice President while the President is away.
    - **Sending one** publishes it in "From the Society" (§9) and, unless it is marked "post only", sends one Resend broadcast per language to the "Society news and events" topic, posts it in the members' group's Announcements topic and sends Hudhud's notice to each linked member who keeps notices on. Media makes the Instagram post or story from it.
    - **At most one announcement email a week;** anything else waits for the Sunday Paper.
  - **Events** live on their own page. People hear of them through the Events page, Hudhud's post (three weeks ahead) and reminder (two days before), the Sunday Paper, and the semester's events announcement; those who RSVP get emails about changes, cancellations and waitlist places. An event is never an announcement email of its own.
  - **The Sunday Paper,** monthly, to its own topic (§9).
  - **Personal and staff messages:** account, security, application, form and RSVP emails go to one person and have no topic; staff alerts go to the team's topic in the Diwan group and the Diwan's Desk, never by bulk email.
- **The mailing list (CAN-SPAM; the Gmail and Yahoo sender rules):** one audience for every bulk email, with two topics a reader can leave separately: "The Sunday Paper" and "Society news and events". Every email has one-click unsubscribe from everything and a no-login preferences page.
  - **Who is on it:**
    - members, on both topics from sign-up (opt-out box);
    - guests, only if they tick the box at sign-up;
    - the public, choosing their topics, by double opt-in at /sunday-paper (a signed-in member is never asked);
    - the spring 2026 Tour writers and fall 2026 fair sign-ups, who agreed in person, recorded with that consent, their source and stop.
    - Bounced and unsubscribed addresses are never added back.
  - **What Resend holds:** only the email, first name, language and topics. Source and stop stay on the site and are reported as counts only.
  - **Where staff see it:** Media → Channels shows each topic's counts by language, with no names; the list itself is seen only by Media and the Managing Editor (§8).
  - **The first sends:** Haven's call is the first announcement, sent once the list is built and by Sun Nov 22; the first Sunday Paper goes on Sun Dec 6 (put together from Nov 30, tested Dec 3).
  - **Bounces and complaints** are suppressed automatically.
- **Email (Zoho Mail free, owned by the Society; the American standard for student organizations):**
  - **Role addresses only.** Mail follows the seat, never a person's name. No personal-name aliases (no shaheen@). Bots have no address: Hudhud points people to Help Desk or hello@.
  - **Five mailboxes,** one person each, passed on with the seat: president@, vp@, secretary@, editor@ (the Editor-in-Chief) and media@ (the Director of Media). The password and two-step backup are reset at each handover. The free plan has no IMAP, so mail is read on the web or in Zoho's app.
  - **Groups,** which use no mailbox; each lists who receives it, and every member can send as the group:
    - **hello@** (the front door for the public, partners and appeals): the Vice President and the Secretary. Anyone can send to it.
    - **council@:** every Council member (the five mailboxes, plus each appointed director's AUIB email). Only Society addresses can send to it.
    - **qirtas@** (the Sunday Paper and Qirtas's contact): the Editor-in-Chief and the Managing Editor (by AUIB email). Anyone can send to it.
    - **Each seat without a mailbox,** as a group delivering to whoever holds or covers it: events@ and company@ (the President, or the Vice President while the President is away), partners@ (the Vice President), membership@ (the Secretary). Once a director is appointed, their AUIB email replaces the covering officer. If Zoho doesn't allow outside members, Zoho Mail Lite seats are asked of Student Life as a need. Anyone can send to them.
    - **elections@:** the Secretary until the Elections Committee is appointed, then its three members.
  - **Aliases** on a mailbox:
    - **secretary@:** privacy@ (the Privacy Notice's contact), postmaster@, abuse@, dmarc@.
    - **editor@:** letters@ (letters to the editor), corrections@, tips@ (news tips).
    - **media@:** press@, security@ (security.txt), accessibility@ (GOV-06 requests), nextstop@ (people appearing in or pitching to the show).
    - **membership@:** alumni@ (until an alumni lead is appointed).
  - **Who writes from where:**
    - **Seat holders** write as the Society from their seat's address or group, signed with their name and seat.
    - **Team members and directors without a mailbox** write from their AUIB email (never a personal one), copying the seat's group, so the record stays with the seat.
    - **The site** writes to each person at their account email (the AUIB address for students; a confirmed personal address for graduates and guests).
    - **The public** sees only Society addresses; no personal address appears on the site or in a signature.
  - **What sends from where,** through Resend, always with replies to a monitored address (never "no-reply"): the site's emails and broadcasts from hello@, the Sunday Paper from qirtas@, and letters from the signer's seat address. The welcome is part of the confirmation email. Personal addresses are never used for Society business.
  - **Every bulk email** carries the postal address: "AUIB Society of Arts and Letters, c/o Office of Student Life, American University of Iraq – Baghdad, Airport Road, Baghdad, Iraq" («جمعية الفنون والآداب في الجامعة الأمريكية، بعناية مكتب شؤون الطلبة، الجامعة الأمريكية في بغداد، طريق المطار، بغداد، العراق»).
  - **The signature,** in the email's language: the sender's name and seat; "AUIB Society of Arts and Letters"; "The paper and the pen."; "auibsal.org · @auibsal"; "Paperless by default. Books reused through Second Chapter."
- **The emails (the kit's templates, one catalog):**
  - **Grouping:** they are grouped as Account and security, Membership, Get involved, Events, Qirtas, Governance, Agreements and records, Mailing list, and Staff alerts, each named plainly in sentence case.
  - **Retired:** the standalone Welcome (it's part of the confirmation email); "Call Opened"; the Tour and plain invitations once the fall list is sent; "Reply Talking", "Reply Offered" and "Replies Digest", replaced by the application emails.
  - **Renamed:** the Associate request emails are "Associate request received / approved / declined".
  - **Added:**
    - **Get involved:** application received, interview invitation (with a calendar file), offer, appointed, not chosen, withdrawn.
    - **Members:** confirm your email (24-hour reminder), finish your profile (days 2 and 7), "Get involved" (day 3), "Your first event" (day 10), graduating, turned 18, data export ready.
    - **Parents:** consent request and reminders, consent received.
    - **Events:** trip consent, and "Thanks for coming" with a one-question survey.
    - **Governance:** policy change notice (14 days ahead), Executive Board vote request, resolution adopted.
    - **The mailing list:** the announcement, and preferences updated.
  - **Unsubscribing:** account, security and transaction emails can't be unsubscribed from, and say so; every bulk email has the postal address and one-click unsubscribe.

- **Telegram:**
  - **The members' group "AUIB Society of Arts and Letters":** for Members of every class (guests and partners' people write to hello@), with Hide Members on.
    - **Topics:** Announcements (closed; only Hudhud and admins post), The Common Room (any language) and Help Desk. There is no Council topic; a pinned link points to the Council page, and staff talk never happens here.
    - **Description:** "The paper and the pen at @AUIB_BAG. Events: auibsal.org/events · Join: auibsal.org/join". @AUIB_BAG is AUIB's Telegram handle; @auibaghdad is only for Instagram.
    - **Its welcome message** links the Code of Conduct.
  - **Moderation:** a reminder, a warning, a 24-hour mute, then removal; spam and threats are removed at once. The Director of Membership decides appeals, sent to hello@.
  - **The staff group "The Diwan":** every current role holder, removed 7 days after their last role ends. Each person's role is shown as their member tag. There is a topic for each team (Council, Qirtas, Media, Events, Membership, Partnerships), and each staff alert goes to its team's topic. Nothing about a named person is posted there; that goes by direct message between Council members.
  - **Telegram's own features come first:** join requests, anti-spam, slow mode, Hide Members, member tags, topics, pins and the welcome message.
- **Hudhud (@auibsal_bot)** automates only what Telegram can't:
  - approving join requests from linked members and declining others with a private note;
  - account linking;
  - posting and editing announcements and reminders;
  - private notices and removals.
  - **Posting rules:**
    - each group post is in English with an «العربية» button to the Arabic page;
    - new events no earlier than three weeks ahead;
    - a reminder two days before, and none on the day;
    - posts are edited or deleted when an event changes or comes off the site.
  - **Removals:** anyone in the members' group not linked to a member's account gets a private notice (on joining or first posting) and is removed 7 days later. Exempt are Student Life's staff, the Faculty Advisor and the admins, kept as a list by Membership in the Diwan. Questions go to Help Desk, and appeals to hello@.
  - **Settings:** no settings or moderation commands in the chats. Group settings (audience, reply language, topics) are set in the Diwan (Media → Channels), and `/setup` only connects a group once.
  - **Rights: every Telegram admin right is on and used** except Remain Anonymous and Add New Admins:
    - **Change Group Info:** keeps the description and photo in sync with the Diwan.
    - **Delete Messages:** its own changed posts, and spam.
    - **Ban Users:** the removals.
    - **Invite Users via Link and Process Join Requests:** joining.
    - **Pin Messages:** the pinned notices.
    - **Edit Member Tags:** role tags, and "Student Life".
    - **Manage Stories:** the event-day story.
    - **Send Welcome Messages:** a welcome to each new member in their own language.
    - **Manage Topics:** posts into the right topic.
    - **Manage Live Streams:** announcing streams (a bot can't run one).
    - **Add New Admins: off.** A bot that can make admins could hand over both groups if its token leaked, so officers add and remove admins by hand at each handover; the token is kept only in the site's secrets and rotated at each handover.
  - **Private chats:** a short menu (start, link, my events, settings, help) in the member's language, and the daily word only by choice, using the site's editor-checked word.
  - **The sticker set** has eleven stickers.
- **Instagram (@auibsal):** for publicity only. Sign-ups, RSVPs and questions are pointed to Help Desk or hello@.
  - **Bio:** "The paper and the pen at @auibaghdad.", with the links auibsal.org, /events and /join.
  - **Six highlights,** in order: Events, Qirtas, The Company, Next Stop, Join (with the Tour), Partners (with Second Chapter). Covers are plain crimson with the icon only.
  - **The launch sequence:** day 1 "Come in" (carousel and a story linking to /join); day 2 the Haven carousel (a story linking to /qirtas/submit); day 4 the launch film; day 6 "Get involved", once the openings are up. Haven's call is also the first email announcement, once the mailing list is built.
  - **The launch film** (vertical, about 27 seconds; English and Arabic versions; on-screen text only, no voice), remade to feel made for students, impressive, literary and fun at once: the motto typed on paper; "Write for Qirtas." over the live submit page; "Ride with Next Stop." as the bus pulls in; "Take the stage." as the Company's curtain opens; a montage of Qirtas's sections; then "Join the Society at auibsal.org/join", the page pulled out onto crimson and the sound logo. It keeps the original score, with every scene on the beat. The owner approves it and Media posts it.
  - **No "free" anywhere public:** the Society's videos, posts, site and emails never sell membership as free; everyone knows it is.
  - **The kit:** a "Write for Qirtas" post is added, and the old Edition's-call post is retired.
  - **Posts:** each event gets its own post, titled for what it is, once its room is confirmed. There is no standing weekly post. The semester calendar goes out once as a "This spring's events" carousel, and "Get involved" goes with the open call. A story may go out on an event's day.
  - **Icons:** Instagram and the members' group use the Bookmark in white on crimson; the Diwan group uses it in white on ink; Hudhud keeps the hoopoe.
- **YouTube (@auibsal):** Next Stop's episodes and specials and Qirtas's longer films, embedded on the site. Short clips go to Instagram Reels. Footage lives on three Society-owned drives (working, backup and archive).
- **LinkedIn (@auibsal):** a Society page, posting about once a month, for partners, alumni and staff.
- **The platforms, settled:** Instagram, YouTube and LinkedIn for publishing; Telegram (the members' group, the Diwan and Hudhud) for talk. **Not used:** TikTok, X, Threads, Facebook, WhatsApp, Snapchat, and no public Telegram channel (the members' group's Announcements topic does that job).
- **One profile everywhere:** "AUIB Society of Arts and Letters", @auibsal, the Bookmark in white on crimson, the motto line as the bio, auibsal.org as the link (Instagram keeps its three links and no link-in-bio service); each platform's banner from one template in the kit.
- **Posting:** at least two posts a week in the semester (an event, a piece from Qirtas or a call), planned a month ahead in Notion's Plans; templates for every kind of post in the kit, in both languages and both sizes; shared (collab) posts with @auibaghdad and partner clubs for big moments.
- **YouTube:** playlists by show and season, a channel trailer, the sound logo opening landscape videos, chapters, English and Arabic captions, the end screen, and comments off.
- **LinkedIn:** the one sentence as the About; the Editions and the annual report as the main posts; role holders invited to list their roles; partners tagged with their consent.
- **Old posts:** checked once: accurate ones stay as history; small errors are fixed in the caption with a note; anything with a retired name, "free", wrong facts or people without a release is archived (hidden, not deleted). The fall 2026 club fair footage stays unposted.
- **Archives:** once a semester, the Instagram, Telegram and YouTube downloads go into the Society's archive.
- **Practice on every channel:**
  - alt text on images and captions on videos (ADA, WCAG 2.2 AA);
  - staff never post as the Society from personal accounts;
  - errors are corrected in place with a note, and deleted only for safety, privacy or a removal request;
  - no following, liking or reposting party-political content;
  - only each platform's own scheduling tools;
  - headlines in one color with no accent word.
- **Email standards:** DMARC moves to quarantine and then reject after 30 days of clean reports; every email has a plain-text version; the mailing list sends from news.auibsal.org, with replies to hello@ and qirtas@; the list starts with recently active members before everyone, keeping complaints under 0.1%.
- **The Sunday Paper** goes at 10:00 a.m. Baghdad time on the first Sunday, scheduled the evening before after the test; each issue has its own address and appears in search.
- **Hudhud's Sunday note:** one post each Sunday in the semester (any week with an event or an open call; a week with neither gets no note) in the members' group listing the week's events and open calls, plus the two-day reminders, in place of a post for each new event.
- **Every email carries:** one clear subject; the action first, then the detail; one button; the record number where there is one; why the person is getting it; and, unless it's account or security, a link to preferences. Sender names: "AUIB Society of Arts and Letters" for the site and announcements, "Qirtas" for the Sunday Paper, a person's name and seat for letters. Bulk emails start with "View in your browser", and unsubscribing lands on a page that confirms it and offers topics. Every email can be previewed in both languages on the Diwan's design page, with a test to yourself.
- **Staff alerts:** urgent ones at once; the rest in one daily digest.
- **The name held everywhere:** @auibsal is registered, without posting, on TikTok, X, Threads, Facebook and Snapchat, each pointing to auibsal.org.

## 15. Brand and design (SAL-MED-02)
- **The source:** the brand kit in `packages/brand` in the monorepo is the source, shown to staff at /diwan/media/design and to the public at /about/press. Its Notion rows say where it lives, and Brand essentials in Guides is the staff quick guide.
- **The Design System** "AUIB Society of Arts and Letters" is the only Claude artifact: a read-only copy, refreshed whenever the kit changes. Where they differ, the monorepo wins.
- **Type:** Ubuntu, called "Ubuntu" in both languages (never "Ubuntu Arabic"); the Arabic files are served under the one family name with an Arabic unicode-range. Markazi Text is used for the reading text of Qirtas pieces in both languages, replacing Literata; headlines, the nameplate and the interface stay Ubuntu, and the Diwan uses Ubuntu. Mrs Saint Delafield is for signatures only.
- **Video (the American standard for student media):**
  - **The sound logo:** the Society's own sound, rebuilt for it from the typewriter ending of the fall 2026 club fair video and kept in the brand kit (never a stock sound): the carriage slides, clunks and rings its bell, with no music under it (about 2 seconds). It plays with the logo alone on crimson: the Bookmark slides in on the carriage and lands on the bell. A reel's call to action (such as auibsal.org/join) comes just before it.
  - **The end card:** every vertical video ends on it, with the sound logo.
  - **Format:** everything at 25 frames per second (Iraq's 50 Hz lighting, so no flicker); landscape 1920 × 1080; vertical 1080 × 1920, with text kept clear of the top 220 and bottom 400 pixels; sound mixed to −14 LUFS with true peaks at or below −1 dBTP; captions burned in on vertical videos, and as a caption file in each language on YouTube.
  - **The kit's video files:** the sound logo as a 48 kHz, 24-bit WAV and as two clips, vertical and 16:9 (held for 3 seconds to open landscape productions), and Next Stop's package (§3): the opening titles, the four part cards, the take card and the two verdicts, the name captions (landscape and vertical, with transparency), the credits and end screen, the reel ending and the thumbnail template, each in English and Arabic.
  - **Openings:** one sound logo, two placements. Vertical videos (Reels, Shorts, stories) have no intro: they open on the hook and end on the sound logo. Landscape productions (Next Stop episodes, the Company's recorded productions, YouTube films) open with it, held for 3 seconds on flat crimson, then their cold open and their own title, and end on their credits and end screen.
  - **Standard parts,** built once in the kit: the question card (white, with crimson text), name captions in Ubuntu, burned-in subtitles in white, and the end card.
  - **Credits:** follow American film and series practice. Reels credit the people and crew in the caption, with "Music: original, AUIB Society of Arts and Letters". Opening titles run the presenting line first ("AUIB Society of Arts and Letters presents"), then the host, and the director last, as "Directed by" (a director is credited by name, never by a Society title; every name comes from the site, §4). Next Stop and long films end with a slow credit roll in this order: Directed by, Produced by, Host, Guests, Director of Photography, Edited by, Original Music, Title Design, then "Filmed on location at the American University of Iraq – Baghdad with the support of the Office of Student Life", "A production of the AUIB Society of Arts and Letters" and "© <year> AUIB Society of Arts and Letters. All rights reserved." The YouTube end screen follows (the last 20 seconds: a still of the host with the episode's guest, the show's logo, Subscribe and the next episode).
  - **Rights:** whoever films, edits or makes music keeps their copyright and gives the Society a license to publish; everyone on camera signs the media release. Music is original or licensed for the use, never a song without rights.
- **Icons:** one Lucide set (1.5 px line, square ends), used alone when the meaning is plain and with a word when it could be misread. Every icon has a screen-reader label. Never in a headline or as decoration, and never the Bookmark. No emoji.
- **Components:** built once in the kit (form page, letter, membership card, certificate, menus and choices). The printables page keeps only paper-only things:
  - name badges;
  - the photography notice;
  - the sticker pack;
  - three posters (the Society poster, the Typewriter Tour poster and the Haven poster).
- **Design files:**
  - **One version** of each piece, with no code on the design; the code goes in the file name ("SAL-MED-02-Haven-poster-EN.pdf").
  - **Color:** print in CMYK (PDF, FOGRA39 for coated paper); screens in RGB.
  - **Generated, never stored:** every file is generated by the kit's script.
- **The posters,** A2, each in separate English and Arabic editions with the lockup:
  - **The Typewriter Tour poster** (two sides): the Hemingway photograph (Lloyd Arnold, 1939, public domain) on the front, with "For sale: baby shoes, never worn." attributed to Hemingway. The back has the paperless Tour's rules, typewriter tips, the QR to /join, and the motto with "AUIB Society of Arts and Letters".
  - **The Society poster:** the motto and "Join at auibsal.org/join" with the QR, nothing else.
  - **The Haven poster:** paper-colored with no texture; the lockup at the top on the side the language reads from; "Haven" («ملاذ») large in Ubuntu; the call in Markazi Text; "Submit your work now." beside the QR to /qirtas/submit.
    - **Sizes:** A2 for single-language boards; an A4 handout (English front, Arabic back); and an A3 landscape sheet with the two A4 editions side by side (English left, Arabic right).
    - **Printing:** at Student Life, each size on paper of the same size (the A4 handout on A4, the A3 sheet on A3), with no bleed or cutting. The office printer can't print to the paper's edge, so both designs keep an even 10 mm white margin. (Two A4s to an A3 with bleed can't be done: A3 is exactly two A4s and the largest paper.)
    - **The carousel:** 1080 × 1350, an English slide then an Arabic slide.
    - **Telegram:** posters and calls go to Telegram at 1080 × 1350, with the URL written as tappable text and no QR code (QR codes are for paper only).
  - **Every poster:** no personal photo, name, degree or email; no signing, disclaimer, archiving, anthology or prize.
- **State colors:** one success, one warning and one error color in the kit, tested for contrast in both themes and used only for states, never as accents.
- **Motion:** 150, 250 and 400 ms with one ease-out curve; motion only to show where something came from or went; no autoplaying carousels, parallax or loops; page changes cross-fade where browsers support it; nothing moves with reduced motion on.
- **The press page** (/about/press): the one sentence and a fact sheet, the logo pack (every lockup, English and Arabic, color and white, SVG and PNG, with a one-page guide to using the logo), an approved photo library with credits and releases, recent announcements, and press@. Press releases in AP style, in both languages, for a few milestones a year (the Founding Meeting, each Edition, the Company's first production). Big moments go to AUIB's communications office a week ahead.
- **Relationships:** a short list in Notion of offices, partners, speakers and judges (organizations and seats only), each thanked after they help and sent the annual report.
- **Certificates** carry two signatures from the seats concerned (the President and the Editor-in-Chief for the Prize and Qalam) and the verification code; from 2028 the Prize's and Qalam's are also issued as Open Badges 3.0.
- **/verify** uses long random codes, is rate-limited and never indexed, and shows only what the record needs.
- **A yearly brand check** each September by the design lead, of every live design against the kit.

## 16. Where things live, accounts and chats
- **"The Diwan" means the staff.** Every staff space carries the name: the Notion teamspace, /diwan on the site and the staff Telegram group. Members' own spaces are "Your account" («حسابك»). Every piece of information has one home; everywhere else it appears is a copy.

| Home | What lives there |
|---|---|
| **Notion** (staff only) | Events (the events manager), Plans (what Media plans to post, with no text or names), every document, needs, tasks, projects, meetings and minutes; copied to the site. Announcements and Qirtas's pieces are written on the site, never in Notion. The Diwan shows these read-only and keeps only what is the site's own. |
| **The site** | Accounts, the Register, the partner register, RSVPs and check-in, elections and ballots, applications, Qirtas's newsroom (written, edited, read blind and published there), six-word pages, staff hours and service, confidential forms, the mailing list. |
| **Telegram** | Talking: the members' group, Hudhud, the Diwan group. Nothing is recorded there. |
| **Instagram, YouTube, LinkedIn** | Publishing. |
| **Email** | The mailboxes and groups above; the site's emails; the mailing list. |
| **The monorepo** (github.com/auibsal/monorepo) | The code and the brand kit (SAL-MED-02), plus the read-only mirror of this file and the glossary. |

- **Never Notion:** partners and members never use it.
- **No personal storage:** no Google Drive, and no Society files in personal storage. The Society's files in the President's OneDrive move into Notion (the Tour scans into the site), and the folder is then deleted.
- **Rows, not pages,** for small records (needs, shifts, credits, hours, roles); big records keep their own pages.
- **Notion's plan:** the free Plus plan Notion gives student organizations.
- **Accounts and hosting:** the tool accounts (Vercel, Supabase, Resend, Cloudflare, GitHub, Zoho, Notion) stay as they are for now: owned by the President's AUIB email, with officers added as admins and two-step verification on. Who owns them later is the owner's decision; nothing is moved or newly created until then.
  - **Admin access** passes with the role; ownership stays with the account's owner.
  - **Credentials:** the passwords, recovery codes and two-step backups are kept by the account owner and shared with the admins only where they need them; they are never kept in personal notes or chats, and are reset at each handover. Two-step sign-in is required for every Council role holder on the site.
- **Claude chats:** one per department, each reading this file first:
  - Governance and the Executive Board (GOV, EXB);
  - Events (EVT);
  - Membership and Partnerships (MEM, PTN);
  - Media (MED);
  - Qirtas and Qalam (EDT);
  - the Company and the arts (ART);
  - the site chat "auibsal.org" (Claude Code: the site, the Diwan, Hudhud and the monorepo, part of Media). It works from the repo mirror of this file. The site's policies, GOV-04 to GOV-06, are governance documents kept by their owners.
  - Older chats are deleted once their carry-overs are filed.
- **Notion's sweep:** each quarter, the Secretary's access review searches Notion for names, emails and IDs and deletes them on sight.
- **The domain** auto-renews, with a registrar lock and reminders to president@ and the web lead.
- **The tool accounts** move to Society addresses (president@ as owner, the Vice President second) during 2027, before the founder leaves the Society.

## 17. Calendar 2026–27
- **AUIB's week:** classes run Sunday to Wednesday, 8:00 a.m. to 2:00 p.m. (some until 5:00 p.m.). On Thursdays only ELA students and some labs are on campus. Friday is off, and Saturday is only for invited or RSVP events. The Society schedules around it, and holds no events in finals week (fall 2026 finals end Thu Dec 17).
- **Fall 2026:**
  - **Sun Nov 15:** Next Stop's filming request goes to Student Life (the Secretary).
  - **Wed Nov 18, 2:15–3:45 p.m.: the first Council meeting** (agenda sent Mon Nov 16). It ratifies the founding team's actions and every decision in this file up to the meeting; sets the semester calendar and the room; plans general meetings; records the President's absence; approves the open call; and covers the founding team's GPA check, the Faculty Advisor invitation and the Founding Proposal's timeline. The launch is reported, not decided.
  - **Sun Nov 22:** the May applicants' deadline to apply on Get involved; two-step sign-in set up at the next sign-in by every role that sees personal data; Haven's call sent as the first announcement (by this date).
  - **Wed Nov 25:** the founding team's GPA list goes to Student Life, and the Faculty Advisor invitation goes out.
  - **Tue Dec 1, 2:30–4:00 p.m.: the pilot,** a reading with a guest (the station access is tested).
  - **Wed Dec 2, 2:15–3:00 p.m.:** general meeting.
  - **Sun Dec 6:** the first Sunday Paper; Haven's submissions close at 11:59 p.m.
  - **Tue Dec 8, 2:30–4:00 p.m.:** a writing workshop. Its room, and the pilot's, is confirmed on Nov 18.
  - **Wed Dec 9, 2:15 p.m.:** Council meeting. Next Stop's pilot episode is released the same day.
  - **Thu Dec 10:** the director openings close.
  - **Wed Dec 16:** Haven, Qirtas's pilot, is published.
  - **Sun Dec 20:** the President's notice to Student Life.
- **Spring 2027** (assuming classes start Sun Feb 7):
  - **Executive Board approval** of the directors by Thu Jan 14. The President is abroad Jan 24 – May 15.
  - **Tuesday events, 2:30–4:00 p.m., one room,** confirmed at the start of the semester: Feb 16, Feb 23, Mar 2, Mar 16, Mar 23, Apr 6, Apr 13, Apr 20, Apr 27, May 4, May 11 (none on Feb 9 or Mar 9).
  - **General meetings:** Feb 17, Mar 3, Mar 17, Mar 31, Apr 14, Apr 28, May 12.
  - **Tue Mar 30, 2:30–4:00 p.m.:** the Founding Meeting.
  - **Fri Apr 23:** the trip to al-Mutanabbi Street, the Earth Day event (backup Apr 30), with written Student Life approval.
  - **The Typewriter Tour:** the spring club fair week, on dates from Student Life.
  - **Before finals:** Qirtas's Edition 1, digital and printed, launched at a reading.
- **Later:**
  - **September 2027:** the Council sets the dates for the October 2027 first elections.
  - **Fall 2027:** Second Chapter at the club fair, the Company's staged reading, and Edition 2.
  - **Spring 2028:** the Company's first production, Edition 3, and the first Mutanabbi Prize at the April Annual Meeting.
  - **Summer 2028:** Qalam's first run.

## 18. Retired names
Never use these:
- **Events and formats:** the Salon, Book Circle, Open Pages, the Listening Room, Launch Night, open nights, station days, the Candidates' Reading, the Ribbon, the worst-poem contest, First Ink, Munazara, Mutanabbi Friday, Bad Poetry Night, Open Stage, Scratch Night, Motion Night, Mutanabbi Walk, Side Quest, BusTalks, Charter Night, Charter Day, the Evenings, the Specials, weekly evenings, four-week cycle, "the six programs", Standing Programs, flagships.
- **Programs and groups:** the Apprenticeship, the trial term, the Majlis, Productions, Gallery Wall, Waraq, the Nexus, Book of Members, Founders' Roll, The Green Room, The Archive (as a group name), AUIB SAL HQ.
- **Awards:** the Qirtas Awards; the Tabari, Jahiz, Nazik, Wasiti and Ibn al-Haytham Awards; the Qirtas Prizes; the chapbook.
- **Membership:** Fellows, Honorary Fellows, Life Members.
- **Meetings:** the General Assembly and the AGM (now general meetings and the Annual Meeting).
- **Qirtas:** Reviews (as a section name), The Month in Qirtas, Editor of Qirtas (now the Editor-in-Chief).
- **Roles:** Director of the Company, Director of Letters, Director of Stage and Arts, Director of Programs, Treasurer, Deputy Treasurer, Acting President, Program Lead (now an event lead), Submissions Manager, Section Editor (now a section's editor), Event Coordinator, Venues and Logistics Lead, Production Lead, Event Staff, Arabic Editor, Onboarding Lead, Records and Recognition Lead, Technical Administrator (now the web lead).
- **Other:** "What's on" (now Events), the General Secretary (now the Secretary; in Arabic «أمين السر», never «الأمين العام»), the paperless pledge, the Callboard (now Get involved), "Ubuntu Arabic", Qirtas's issues and "Issue 1" (now Editions; the Sunday Paper still has issues), "the printed year-in-review", "pilot issue" (Haven is the pilot).
