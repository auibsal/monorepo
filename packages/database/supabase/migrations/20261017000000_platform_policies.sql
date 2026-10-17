-- The platform's own policies, as public drafts in the documents registry
-- (auibsal.org/documents), code family SAL-PLT. Each applies the Society's
-- Policy Manual (SAL-POL-01) and the AUIB policies that bind a recognized
-- student organization to auibsal.org, the Nexus and the API. They stay
-- "Draft 1" until the Council adopts them and records the date; nothing
-- here is presented as adopted. English text only for now: the Arabic
-- pages fall back to it until the translations are done (PROGRESS.md).

insert into governance.society_documents
  (slug, code, title_en, title_ar, summary_en, summary_ar, audience, status, version, dated, sort, body_en)
values

('terms-of-use', 'SAL-PLT-01', 'Terms of Use', 'شروط الاستخدام',
 'The rules for using auibsal.org, the Nexus and the Society''s API.',
 'قواعد استخدام موقع auibsal.org والنِّكسَس وواجهة برمجة التطبيقات الخاصة بالجمعية.',
 'public', 'draft', 'Draft 1', '2026-10-17', 200,
$b$<p>These terms cover auibsal.org, the Nexus (nexus.auibsal.org), the Society's API (api.auibsal.org) and the Society's emails. They are run by the AUIB Society of Arts and Letters ("the Society", "SAL"), a student organization recognized by the Office of Student Life of the American University of Iraq – Baghdad (AUIB). The Society is not AUIB, and these platforms are not AUIB systems.</p>
<h2>1. Who may use the platforms</h2>
<ul>
<li>Anyone may read auibsal.org, play Waraq's games and subscribe to the newsletter.</li>
<li>Accounts in the Nexus are for AUIB students, staff and faculty, and for people verified as members of a partner organization. Sign-up uses an AUIB email address first; other addresses are verified before they reach member features.</li>
<li>One person, one account. Do not share your account or sign in as someone else.</li>
</ul>
<h2>2. The rules you agree to</h2>
<ul>
<li>The Acceptable Use and Community Guidelines (SAL-PLT-02).</li>
<li>For members: the Constitution, the Bylaws and the Policy Manual of the Society, and the Member Pledge you sign in the Nexus.</li>
<li>For AUIB students: AUIB's Student Conduct and Community Standards Policy and Student Rights and Responsibilities Charter, which apply to conduct "in online environments related to university activities".</li>
<li>The laws of Iraq.</li>
</ul>
<h2>3. Your work and your data</h2>
<ul>
<li>You keep the rights to what you create. What you submit to Waraq or another Society program is covered by the Submissions, Copyright and AI Policy (SAL-PLT-05).</li>
<li>How the Society handles personal data is set out in the privacy page (auibsal.org/privacy) and the Policy Manual, Part 6. How long data is kept is in the Data Retention Schedule (SAL-PLT-04).</li>
<li>You can see and correct your profile, and delete your account, from Profile and privacy in the Nexus. For a copy of your data, email hello@auibsal.org.</li>
</ul>
<h2>4. The Society's name and marks</h2>
<p>The Society's name, the Key monogram, its templates and its program names belong to the Society (Policy Manual 9.4). Do not use them to suggest the Society endorses something it has not. AUIB's name and marks belong to AUIB.</p>
<h2>5. Money</h2>
<p>The platforms take no payments of any kind. Nobody from the Society will ask you to pay or give card or bank details online. Report any such request (SAL-PLT-09).</p>
<h2>6. Availability</h2>
<p>The platforms are run by student volunteers on free services. They are provided as they are, without a promise that they will always be available or free of errors. The Society may change, pause or end a feature, and will say so on auibsal.org when a change affects members.</p>
<h2>7. Suspension</h2>
<p>The Society may limit or close an account that breaks these terms, following the Society's conduct procedure (Bylaws, Part 10) and, for AUIB students, AUIB's Student Conduct and Community Standards Policy. Accounts are not closed without telling the person why, except where a delay would cause harm.</p>
<h2>8. Changes</h2>
<p>The Council approves these terms and any change to them. The version and date at the top of this page show which text applies. Members are told of material changes by email.</p>
<h2>9. Contact</h2>
<p>hello@auibsal.org</p>$b$),

('acceptable-use', 'SAL-PLT-02', 'Acceptable Use and Community Guidelines', 'الاستخدام المقبول وإرشادات المجتمع',
 'How to behave on the Society''s platforms, and what happens when someone does not.',
 'كيف نتصرّف على منصّات الجمعية، وماذا يحدث عند مخالفة ذلك.',
 'public', 'draft', 'Draft 1', '2026-10-17', 210,
$b$<p>The Society's platforms are places to share writing, art and events with the AUIB community. These guidelines apply to everything you post, send or upload on auibsal.org, the Nexus and through the API, and to messages sent in the Society's name.</p>
<h2>1. Be respectful</h2>
<ul>
<li>No harassment, bullying, threats or intimidation, including online (AUIB Student Conduct and Community Standards Policy 4.2.1 and 4.2.6).</li>
<li>No discrimination based on race, religion, gender, nationality, disability or other protected characteristics (4.2.2).</li>
<li>No sexual harassment (AUIB Student Rights and Responsibilities Charter 3.8.3).</li>
<li>Respect the diversity of thought, religion and cultural practice in our community (Charter 3.8.2).</li>
</ul>
<h2>2. Be honest</h2>
<ul>
<li>Do not pretend to be someone else, forge documents or give false information (Conduct Policy 4.2.4).</li>
<li>Submit only your own work. Plagiarism leads to withdrawal of the work (Policy Manual 9.5). Work drafted, written, translated or generated by AI is not eligible for Society programs (Policy Manual 10.1).</li>
</ul>
<h2>3. Respect privacy</h2>
<ul>
<li>Do not share other people's personal information, private messages or images without their consent (Charter 3.11.2).</li>
<li>Member data seen in the Nexus is for Society business only (Policy Manual 6.3). Do not copy, export or put it into AI tools (10.3).</li>
<li>Photographs and video follow the Policy Manual, Part 7: close-ups of people who have not agreed are not published, and anyone may ask for a photo of themselves to be removed.</li>
</ul>
<h2>4. Keep the platforms safe</h2>
<ul>
<li>No hacking, probing for weaknesses without permission, unauthorized access or attempts to get round access rules (Charter 3.11.1). Report security problems as SAL-PLT-08 describes.</li>
<li>No malware, spam, scraping of member data or automated sign-ups.</li>
<li>Use the API only as the API Terms (SAL-PLT-10) allow.</li>
</ul>
<h2>5. Content that is not allowed</h2>
<ul>
<li>Content that breaks the laws of Iraq or AUIB policy.</li>
<li>Content that incites violence or hatred, or that targets a group.</li>
<li>Sexually explicit content.</li>
<li>Promotion of political parties, religious or sectarian bodies, tobacco, alcohol or gambling in Society spaces (Policy Manual 11.3, Constitution).</li>
<li>Other people's copyrighted work without permission (Policy Manual 9.3).</li>
</ul>
<p>Creative writing and art may explore difficult subjects. Editors decide what Waraq publishes under its own guidelines; these rules are about conduct, not about the themes of the work.</p>
<h2>6. Reporting</h2>
<p>Report a post, message or behavior to hello@auibsal.org or to any officer, as SAL-PLT-09 describes. Reports are handled confidentially.</p>
<h2>7. What happens next</h2>
<ul>
<li>Content that causes harm is taken down first and discussed after (Policy Manual 12.5).</li>
<li>Conduct is handled under the Bylaws, Part 10. Outcomes range from a conversation to suspension of an account or membership.</li>
<li>Where AUIB students are involved, serious cases are referred to the Office of Student Affairs under AUIB's Student Conduct and Community Standards Policy (4.5). The Society does not replace AUIB's procedures.</li>
</ul>$b$),

('cookies', 'SAL-PLT-03', 'Cookie and Consent Policy', 'سياسة ملفات تعريف الارتباط والموافقة',
 'Which cookies the platforms set, why, and how to choose.',
 'ما ملفات تعريف الارتباط التي تضعها المنصّات، ولماذا، وكيف تختار.',
 'public', 'draft', 'Draft 1', '2026-10-17', 220,
$b$<p>Cookies are small files a website stores in your browser. The Society's platforms use as few as they can. Nothing that tracks you is set until you allow it, and you can change your mind at any time from Cookie settings at the foot of every page on auibsal.org.</p>
<h2>1. Always on (needed for the site to work)</h2>
<table><thead><tr><th>Cookie</th><th>Set by</th><th>Why</th><th>Kept</th></tr></thead><tbody>
<tr><td>sal_consent</td><td>auibsal.org</td><td>Remembers your cookie choices</td><td>One year</td></tr>
<tr><td>NEXT_LOCALE</td><td>auibsal.org, the Nexus</td><td>Remembers English or Arabic</td><td>Until you change language or clear your cookies</td></tr>
<tr><td>sb-…-auth-token</td><td>The Nexus (shared with auibsal.org)</td><td>Keeps you signed in; also hides ads for signed-in members</td><td>Until you sign out</td></tr>
<tr><td>Security cookies (for example __cf_bm)</td><td>Cloudflare</td><td>Protects the site from bots and attacks</td><td>Up to 30 minutes</td></tr>
</tbody></table>
<p>The sign-in and sign-up forms use Cloudflare Turnstile to check that a person, not a bot, is using them.</p>
<h2>2. Analytics (only if you allow it)</h2>
<p>auibsal.org counts visits with Google Analytics, loaded through Google Tag Manager from the site's own address. Its cookies (_ga and _ga_…) are set only after you allow Analytics. Without your consent, Google receives no cookies and the site sends only signals that you declined. Analytics data is kept for two months. The Nexus has no analytics.</p>
<h2>3. Advertising (only if you allow it)</h2>
<p>Waraq's pages show ads to visitors who are not signed in (SAL-PLT-06). Google AdSense fills spaces that no Society or sponsor ad takes. AdSense sets advertising cookies and chooses ads for you only if you allow Advertising. Otherwise it shows limited ads that use no cookies. Society and sponsor ads use no cookies at all.</p>
<h2>4. Stored in your browser, not cookies</h2>
<ul>
<li>Your progress and streaks in Waraq's daily games, on your device only.</li>
<li>In the Nexus, if you turn on notifications, a subscription your browser creates so the Nexus can notify you.</li>
</ul>
<h2>5. How consent works</h2>
<ul>
<li>Every Google signal (analytics storage, ad storage, ad user data, ad personalization) starts as denied on every page, through Google consent mode.</li>
<li>Your answers are stored in the sal_consent cookie and sent to Google consent mode on every page.</li>
<li>Declining is as easy as allowing, and the site works fully either way.</li>
</ul>
<h2>6. Contact</h2>
<p>hello@auibsal.org</p>$b$),

('data-retention', 'SAL-PLT-04', 'Data Retention Schedule', 'جدول الاحتفاظ بالبيانات',
 'How long each kind of data on the platforms is kept, and when it is deleted.',
 'مدة الاحتفاظ بكل نوع من البيانات على المنصّات، ومتى تُحذف.',
 'public', 'draft', 'Draft 1', '2026-10-17', 230,
$b$<p>The Society keeps data only as long as it needs it (Policy Manual 6.1) and collects only what it needs: name, AUIB email, college, year and, if you choose, phone. It never collects ID numbers or bank details (6.2).</p>
<h2>1. Schedule</h2>
<table><thead><tr><th>Data</th><th>Kept</th><th>Source</th></tr></thead><tbody>
<tr><td>Member records</td><td>While you are a member; deleted one year after you leave, except your name and roles in the archive</td><td>Policy Manual 6.4</td></tr>
<tr><td>Your account</td><td>Until you delete it (Profile and privacy → Delete account)</td><td>This schedule</td></tr>
<tr><td>Ballots and election data</td><td>One year, then deleted</td><td>Bylaws B6.11</td></tr>
<tr><td>Waraq submissions</td><td>As Waraq's guidelines set out</td><td>Policy Manual 6.5</td></tr>
<tr><td>Conduct records</td><td>As the Bylaws set out</td><td>Bylaws B10.8</td></tr>
<tr><td>Event plans, risk checks, receipts and correspondence</td><td>Two years</td><td>Records schedule</td></tr>
<tr><td>Minutes, decisions, annual reports and accounts, Waraq issues, the Book of Members and the Book of Fellows</td><td>For as long as the Society exists</td><td>Records schedule</td></tr>
<tr><td>The charity ledger</td><td>Permanently; entries are never edited or removed, only corrected by reversing entries</td><td>Policy Manual, Part 5</td></tr>
<tr><td>Google Analytics data</td><td>Two months</td><td>SAL-PLT-03</td></tr>
<tr><td>Newsletter subscriptions</td><td>Until you unsubscribe</td><td>This schedule</td></tr>
<tr><td>Photographs and video</td><td>Taken down within 24 hours of a request</td><td>Policy Manual, Part 7</td></tr>
</tbody></table>
<p>TODO(content): retention periods for server logs, error reports (Sentry), email delivery records and database backups, once the Council confirms them.</p>
<h2>2. Your rights</h2>
<ul>
<li>See and correct your profile: Profile and privacy in the Nexus. For a copy of everything the Society holds about you, email hello@auibsal.org.</li>
<li>Delete your account: Profile and privacy → Delete account. Records the Society must keep (the archive and the charity ledger) are kept without your contact details.</li>
<li>Ask about any record: hello@auibsal.org.</li>
</ul>
<p>AUIB students also have the rights in AUIB's Student Rights and Responsibilities Charter 3.4.</p>$b$),

('submissions-and-copyright', 'SAL-PLT-05', 'Submissions, Copyright and AI Policy', 'سياسة المشاركات وحقوق النشر والذكاء الاصطناعي',
 'Who owns what you submit, what the Society may do with it, and the rules on AI.',
 'من يملك ما تقدّمه، وما يحقّ للجمعية فعله به، وقواعد الذكاء الاصطناعي.',
 'public', 'draft', 'Draft 1', '2026-10-17', 240,
$b$<p>This policy covers work submitted through the Nexus or the API to Waraq, the Prizes and other Society programs. It applies Policy Manual Parts 9 and 10.</p>
<h2>1. You keep the rights to your work</h2>
<p>Creators own their work. By submitting it, you give the Society permission to show, perform, publish and archive it for the purpose agreed, and nothing more (Policy Manual 9.1). Where a piece is accepted for publication, the Publication Agreement you sign in the Nexus sets out the details.</p>
<h2>2. Credit</h2>
<p>Everyone who works on a Society project is credited by name, unless they ask not to be (9.2).</p>
<h2>3. Other people's work</h2>
<ul>
<li>Plays, music and images used by the Society have the rights holder's permission or are in the public domain (9.3).</li>
<li>Translations name the source text and author, with a note on the rights.</li>
<li>Plagiarism leads to withdrawal of the work and may lead to action under the conduct procedure (9.5). For AUIB students, plagiarism is also academic dishonesty under the Student Rights and Responsibilities Charter 3.7.2.</li>
</ul>
<h2>4. Generative AI</h2>
<ul>
<li>Work submitted to Society programs must be your own. Work drafted, written, translated or generated by AI is not eligible. Spellcheck and basic grammar tools are fine (10.1).</li>
<li>AI detectors are unreliable and are never used as evidence on their own. Where there is a real concern, editors talk to the author and may ask for drafts (10.2).</li>
<li>Every submission asks you to confirm human authorship.</li>
<li>AI-generated images are not used in Society promotion without being labeled, and never to depict real people (10.4).</li>
</ul>
<h2>5. Blind review</h2>
<p>Readers never see who wrote a submission before a decision. The platform enforces this in the database.</p>
<h2>6. Withdrawing and removal</h2>
<ul>
<li>You may withdraw a submission at any time before a decision.</li>
<li>To ask for published work or a photo to be removed, follow SAL-PLT-09.</li>
</ul>$b$),

('advertising', 'SAL-PLT-06', 'Advertising and Sponsorship Policy', 'سياسة الإعلانات والرعاية',
 'Where ads appear, who may advertise, and what is never accepted.',
 'أين تظهر الإعلانات، ومن يحقّ له الإعلان، وما لا يُقبل أبدًا.',
 'public', 'draft', 'Draft 1', '2026-10-17', 250,
$b$<h2>1. Where ads appear</h2>
<ul>
<li>Only on Waraq's pages on auibsal.org, and only to visitors who are not signed in to the Nexus.</li>
<li>Never in the Nexus, in emails or on other pages.</li>
</ul>
<h2>2. Three kinds of ad</h2>
<ul>
<li><strong>Society ads:</strong> the Society's own events, open calls and invitations to join.</li>
<li><strong>Sponsor ads:</strong> from a partner in the partners register, only while the partner is active and has a signed memorandum in force that grants advertising.</li>
<li><strong>Google AdSense:</strong> fills spaces that no Society or sponsor ad takes, with Google's sensitive categories blocked to match this policy.</li>
</ul>
<h2>3. What is never accepted</h2>
<p>Sponsorship or ads from political parties, religious or sectarian bodies, tobacco, alcohol or gambling businesses, or any sponsor that would compromise the Society's independence (Policy Manual 11.3).</p>
<h2>4. Independence</h2>
<p>Sponsors get acknowledgement, never editorial influence (11.4). Ads are always labeled as ads. Sponsorship above 250,000 IQD needs a Council vote and, where required, Student Life approval.</p>
<h2>5. Privacy</h2>
<p>Ads chosen for you, and advertising cookies, only with your consent (SAL-PLT-03).</p>
<h2>6. Money</h2>
<p>Advertising income is recorded in the Treasury's records like any other income. The Council decides who receives AdSense payments and records it in the minutes.</p>
<h2>7. Complaints about an ad</h2>
<p>hello@auibsal.org. An ad that breaks this policy is taken down first and reviewed after.</p>$b$),

('accessibility', 'SAL-PLT-07', 'Accessibility Statement', 'بيان إمكانية الوصول',
 'The accessibility standard the platforms aim for, and how to report a barrier.',
 'معيار إمكانية الوصول الذي تهدف إليه المنصّات، وكيفية الإبلاغ عن عائق.',
 'public', 'draft', 'Draft 1', '2026-10-17', 260,
$b$<p>The Society wants everyone to be able to read, write for and take part in its programs.</p>
<h2>1. The standard</h2>
<p>auibsal.org and the Nexus aim to meet the Web Content Accessibility Guidelines (WCAG) 2.1 at level AA.</p>
<h2>2. What we do</h2>
<ul>
<li>Every release is checked automatically against WCAG 2.1 A and AA rules (axe) on the main journeys: home pages in English and Arabic, events, Waraq, sign-up and submitting work.</li>
<li>Both languages are first-class: Arabic pages read right to left, with a larger size and line height for Arabic text.</li>
<li>Pages work with a keyboard, every page has a skip link to the main content, and every functional icon has a text label.</li>
<li>Images the Society publishes carry text descriptions.</li>
</ul>
<h2>3. Known limits</h2>
<p>TODO(content): list known issues after the first manual audit with a screen reader in both languages.</p>
<h2>4. Report a barrier</h2>
<p>Email hello@auibsal.org with the page and what went wrong. We aim to reply within a week. AUIB students can also reach AUIB's student support services (AUIB Student Rights and Responsibilities Charter 3.6.2).</p>$b$),

('security', 'SAL-PLT-08', 'Security and Vulnerability Disclosure', 'الأمان والإفصاح عن الثغرات',
 'How the platforms are protected, and how to report a security problem safely.',
 'كيف تُحمى المنصّات، وكيف تبلّغ عن مشكلة أمنية بأمان.',
 'public', 'draft', 'Draft 1', '2026-10-17', 270,
$b$<h2>1. How the platforms are protected</h2>
<ul>
<li>Every read and write in the database is checked by row-level security, by permission rather than by role name.</li>
<li>Officers with sensitive roles (Council officers, directors, the Elections Committee) must use two-step sign-in.</li>
<li>Secret keys live only on the server that needs them, never in the website or the Nexus.</li>
<li>Third-party apps reach only the areas the Society grants them (SAL-PLT-10).</li>
<li>Blind review and secret ballots are enforced in the database, not only in the interface.</li>
</ul>
<h2>2. Reporting a vulnerability</h2>
<p>If you find a security problem, email hello@auibsal.org with "Security" in the subject. Please include what you found, how to reproduce it and what it could affect. auibsal.org/.well-known/security.txt gives the same contact.</p>
<p>We ask that you:</p>
<ul>
<li>give us reasonable time to fix the problem before telling anyone else;</li>
<li>do not access, change or delete other people's data, beyond the minimum needed to show the problem;</li>
<li>do not disrupt the service (no denial-of-service testing, no spam);</li>
<li>do not use social engineering against members or officers.</li>
</ul>
<p>We will acknowledge your report within a week, keep you informed, and credit you if you wish. The Society will not take action against good-faith research that follows these rules. This does not authorize anything AUIB's Acceptable Use policies or the law forbid on AUIB's own systems.</p>
<h2>3. If your account is at risk</h2>
<p>Change your password in the Nexus, turn on two-step sign-in, and tell hello@auibsal.org.</p>$b$),

('complaints-and-takedown', 'SAL-PLT-09', 'Complaints, Reports and Takedown', 'الشكاوى والبلاغات وطلبات الإزالة',
 'How to report content or conduct, ask for something to be removed, or complain about a decision.',
 'كيف تبلّغ عن محتوى أو سلوك، أو تطلب إزالة شيء، أو تعترض على قرار.',
 'public', 'draft', 'Draft 1', '2026-10-17', 280,
$b$<h2>1. Photos and video of you</h2>
<p>Anyone may ask for a photo or video of themselves to be removed. The Society takes it down within 24 hours, no reasons needed (Policy Manual 7.3). Use the request form on auibsal.org/programs/side-quest/care for Side Quest, or email hello@auibsal.org.</p>
<h2>2. Copyright</h2>
<p>If you believe content on the platforms uses your work without permission, email hello@auibsal.org with the address of the page, the work you own, and how to contact you. The content is taken down while the Society looks into it.</p>
<h2>3. Harmful content and conduct</h2>
<p>Report it to hello@auibsal.org or any officer. Content that causes harm is taken down first and discussed after (Policy Manual 12.5). Conduct is handled under the Bylaws, Part 10, and serious cases involving AUIB students are referred to AUIB's Office of Student Affairs (AUIB Student Conduct and Community Standards Policy 4.5).</p>
<h2>4. Complaints about a decision</h2>
<p>You can ask the Council to review a Society decision that affects you, such as an editorial decision on your work, a conduct outcome or the closure of an account. Write to the General Secretary through hello@auibsal.org. The Bylaws set out appeals within the Society. AUIB students also have the right to appeal under AUIB's procedures.</p>
<h2>5. Confidentiality</h2>
<p>Reports are seen only by the officers who need to act on them. Nobody is penalized for a report made in good faith.</p>
<h2>6. Response times</h2>
<ul>
<li>Photo and video removals: within 24 hours.</li>
<li>Other reports: acknowledged within a week.</li>
</ul>$b$),

('api-terms', 'SAL-PLT-10', 'API Terms and Developer Policy', 'شروط واجهة برمجة التطبيقات وسياسة المطوّرين',
 'The rules for apps that use Sign in with SAL and the Society''s API.',
 'قواعد التطبيقات التي تستخدم «تسجيل الدخول عبر الجمعية» وواجهة برمجة التطبيقات الخاصة بها.',
 'public', 'draft', 'Draft 1', '2026-10-17', 290,
$b$<p>These terms apply to anyone building an app that uses Sign in with SAL or calls api.auibsal.org. The reference is at api.auibsal.org.</p>
<h2>1. Approval</h2>
<ul>
<li>Every app must be approved by the Society before members can connect it. The Society decides which areas it may reach, and may switch it off at any time.</li>
<li>Apps are approved for teams the Society trusts, such as a program's own tools. Name a contact who answers for the app.</li>
</ul>
<h2>2. What your app may do</h2>
<ul>
<li>Act only for the member who connected it, and only for the purpose described when it was approved.</li>
<li>Reach only the areas granted. Membership records, elections and ballots, the charity ledger and roles are never available to apps.</li>
<li>Respect blind review: never try to learn or reveal who wrote a submission.</li>
</ul>
<h2>3. Data</h2>
<ul>
<li>Collect and keep only what the app needs, and delete it when a member disconnects the app or asks you to.</li>
<li>Never sell, share or publish member data, and never put member data or unpublished submissions into AI tools (Policy Manual 10.3).</li>
<li>Keep tokens and secrets safe: never in a public repository, a URL or a browser's local storage for confidential apps.</li>
</ul>
<h2>4. Fair use</h2>
<p>Do not overload the API, scrape it, or try to get round its limits or its access rules. The Society may add rate limits without notice.</p>
<h2>5. Branding</h2>
<p>You may say your app works with the Society. You may not use the Society's name or marks to suggest the Society made or endorses your app unless the Council agrees.</p>
<h2>6. Security</h2>
<p>Report any security problem as SAL-PLT-08 describes, and tell the Society without delay if member data your app holds may have been exposed.</p>
<h2>7. Changes and ending</h2>
<p>The API is at version 1. Breaking changes come with a new version and notice to approved apps. The Society may suspend an app that breaks these terms, at once if members are at risk. These terms apply together with the Terms of Use (SAL-PLT-01).</p>$b$),

('email-and-notifications', 'SAL-PLT-11', 'Email and Notifications Policy', 'سياسة البريد الإلكتروني والإشعارات',
 'What the Society sends, why, and how to choose what you receive.',
 'ما الذي ترسله الجمعية، ولماذا، وكيف تختار ما يصلك.',
 'public', 'draft', 'Draft 1', '2026-10-17', 300,
$b$<h2>1. What we send</h2>
<ul>
<li><strong>Account emails:</strong> sign-in links, confirmations and security notices. You always receive these while you have an account.</li>
<li><strong>Program emails:</strong> about things you take part in, such as event bookings, waitlist places, shifts and decisions on your submissions.</li>
<li><strong>The newsletter:</strong> a monthly digest from auibsal.org, only if you subscribe and confirm.</li>
<li><strong>Notifications in the Nexus:</strong> on your phone or computer, only if you turn them on.</li>
</ul>
<h2>2. Consent</h2>
<ul>
<li>The newsletter uses double opt-in: you are subscribed only after you confirm from the email we send.</li>
<li>Every newsletter has a one-click unsubscribe link.</li>
<li>In the Nexus, under Profile and privacy, you can turn program emails off, and turn notifications on or off for each device.</li>
</ul>
<h2>3. What we never do</h2>
<ul>
<li>Sell or share your email address.</li>
<li>Send ads by email.</li>
<li>Ask for passwords, payments, or card or bank details by email.</li>
</ul>
<h2>4. Official channels</h2>
<p>The Society's official channels are @auibsal, The Common Room on Telegram, the Society's AUIB email and the all-student email through Student Life (Policy Manual 12.1). Emails from the platform come from auibsal.org addresses. If in doubt, ask hello@auibsal.org.</p>
<h2>5. Language</h2>
<p>Emails are sent in the language you chose in the Nexus. Calls, notices and major announcements appear in Arabic and English together (Policy Manual 12.6).</p>$b$);
