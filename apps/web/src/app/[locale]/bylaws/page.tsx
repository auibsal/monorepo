'use client';

import { useState, useEffect } from 'react';

export default function OfficialBylawsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-red-600 selection:text-white font-sans overflow-x-hidden relative">
      
      {/* Background Grids */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none mix-blend-overlay fixed z-0"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none fixed z-0"></div>

      {/* HEADER SECTION */}
      <header className="relative z-10 pt-32 pb-16 px-6 md:px-12 lg:px-24 border-b border-white/10 bg-gradient-to-b from-black to-transparent">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-[1px] bg-red-600"></div>
          <div className="text-red-500 font-mono text-xs uppercase tracking-[0.4em]">Official Regulatory Document</div>
        </div>
        
        <h1 className="text-6xl md:text-7xl lg:text-8xl font-black uppercase leading-[0.9] tracking-tighter mb-8 text-white">
          The Bylaws.
        </h1>
        
        <div className="text-gray-400 font-mono text-sm md:text-base max-w-3xl leading-relaxed pl-6 border-l-2 border-white/10 space-y-4">
          <p>
            These Bylaws constitute the foundational framework and the official internal system of the Iraqi Domino Association.
          </p>
          <p>
            It defines the composition, legal mandate, and formal organization of the entity as a sovereign corporate body operating under the authority of the Iraqi National Sports Federations Law No. (24) of 2021.
          </p>
        </div>
      </header>

      {/* CONTENT SECTIONS */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 lg:px-24 py-20 flex flex-col gap-24">
        
        {/* PART I */}
        <section>
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-12 border-b border-white/10 pb-6 text-white">
            Part I - Definitions, General Provisions and Fundamental Commitments
          </h2>
          
          <div className="space-y-12">
            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 1: Definitions</h3>
              <ul className="space-y-3 font-mono text-sm text-gray-300">
                <li><strong className="text-white">1.1 The Ministry:</strong> The Iraqi Ministry of Youth and Sports.</li>
                <li><strong className="text-white">1.2 The Committee:</strong> The Iraqi National Olympic Committee.</li>
                <li><strong className="text-white">1.3 FID:</strong> Federación Internacional de Dominó.</li>
                <li><strong className="text-white">1.4 CAS:</strong> Court of Arbitration for Sport in Lausanne, Switzerland.</li>
                <li><strong className="text-white">1.5 The Association:</strong> The Iraqi Domino Association.</li>
                <li><strong className="text-white">1.6 Member Clubs:</strong> Licensed sports clubs practicing dominoes that are fully affiliated with the Association.</li>
                <li><strong className="text-white">1.7 Participating Affiliates:</strong> Venues, halls, or corresponding organizations maintaining domino infrastructure and sanctioned by the Association.</li>
                <li><strong className="text-white">1.8 The Player:</strong> A competitor registered in the lists of member clubs or teams, approved and certified in the Association's records.</li>
                <li><strong className="text-white">1.9 The Referee:</strong> An active arbiter formally certified and approved by the Association to oversee sanctioned matches.</li>
                <li><strong className="text-white">1.10 The Administrator:</strong> A supervisor or organizer operating within member clubs or the Association's official frameworks.</li>
                <li><strong className="text-white">1.11 General Assembly:</strong> The supreme legislative and electoral body of the Association.</li>
                <li><strong className="text-white">1.12 Executive Board:</strong> The strategic administrative body elected by the General Assembly.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 2: Name, Legal Status, and Seat</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">2.1</strong> The Association is a non-governmental, non-profit organization enjoying an independent moral personality.</li>
                <li><strong className="text-white">2.2</strong> The Association is established for an unlimited duration, with the status of a legal person.</li>
                <li><strong className="text-white">2.3</strong> The principal seat and headquarters of the Association are strictly located in Baghdad, Iraq. Operational branches, offices, or committees may be opened in other regions, governorates not organized in a region, or districts according to need and as approved by the Executive Board.</li>
                <li><strong className="text-white">2.4</strong> The Association possesses exclusive rights to its name in both Arabic and English, as well as its symbols, logo, and any official translations, which shall be registered with the Registrar of Companies to guarantee intellectual property rights.</li>
                <li><strong className="text-white">2.5</strong> The Association inherently possesses the independent, sovereign right to choose, design, and display its official flag, emblem, and visual identity without external interference.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 3: Official Languages</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">3.1</strong> Arabic and English are the official operational and legislative languages of the Association. In the case of divergence or legal dispute between the Arabic and English texts of these Bylaws, the Arabic text registered with the Ministry and the Committee shall prevail.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 4: Governing Principles and Commitments</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">4.1</strong> The Association operates in a manner that does not contradict the Iraqi Constitution and the laws in force.</li>
                <li><strong className="text-white">4.2</strong> The Association strictly commits to the Olympic Charter, the Paralympic Constitution (where applicable to specific domino variants), the regulations and rules set by the FID.</li>
                <li><strong className="text-white">4.3</strong> The Association commits to the International Anti-Doping Code and the International Code of Sports Ethics of the International Olympic Committee.</li>
                <li><strong className="text-white">4.4</strong> The Association pledges adherence to the principles of good governance for sports organizations and the implementation of these Bylaws.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* PART II */}
        <section>
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-12 border-b border-white/10 pb-6 text-white">
            Part II - Mission, Objectives, and Means
          </h2>

          <div className="space-y-12">
            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 5: Mission and Role of the Association</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">5.1</strong> Dominoes is recognized as an ancient intellectual and cultural game, representing a combination of sport, mathematical probability, and strategic thinking.</li>
                <li><strong className="text-white">5.2</strong> The fundamental mission of the Association is the diffusion, regulation, and development of dominoes among all regions of Iraq, as well as raising the level of cultural knowledge on a sporting, scientific, and educational basis.</li>
                <li><strong className="text-white">5.3</strong> The Association serves as the sole supreme governing body responsible for the sport of dominoes, its national championships, and mathematically rated events within the Republic of Iraq.</li>
                <li><strong className="text-white">5.4</strong> The Association assumes exclusive rights for the formulation of official ratings, mathematical ranking algorithms, and the authorization of sanctioned competitions.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 6: Legal Objectives of the Association</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">6.1 Promotion:</strong> To work on spreading the game of dominoes throughout Iraq, facilitating the means of practicing it, raising its standard, managing it, organizing its activities, protecting it, and advertising it.</li>
                <li><strong className="text-white">6.2 Representation:</strong> To represent Iraq by preparing and qualifying national teams to participate in Arab, regional, continental, and international competitions held inside and outside the country to achieve high sports accomplishments.</li>
                <li><strong className="text-white">6.3 Development:</strong> To qualify technical and executive cadres and raise their standard to compete with advanced countries.</li>
                <li><strong className="text-white">6.4 Integrity:</strong> Prohibit the use of doping in the field of sports as stipulated in the International Anti-Doping Code, in coordination with local and international organizations. Furthermore, the Association commits to preventing any methods or procedures that would endanger the integrity of matches, strictly combating fraud, collusion, and match-fixing.</li>
                <li><strong className="text-white">6.5 Culture:</strong> Spread sports culture, raise awareness of its benefits in the country, prevent riots inside and outside playing venues, prevent any form of racial discrimination, and care for the environment.</li>
                <li><strong className="text-white">6.6 Financial Independence:</strong> To maximize the Association's financial resources through legal means.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 7: Means of Achieving Objectives</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">7.1 Coordination:</strong> Coordinate and cooperate with the Ministry of Youth and Sports and local and foreign organizations.</li>
                <li><strong className="text-white">7.2 Event Management:</strong> Organize and manage sports events throughout Iraq to ensure the widest possible participation of athletes and select the best players to represent the country.</li>
                <li><strong className="text-white">7.3 Regulation:</strong> Establish the foundations and principles for organizing training affairs, refereeing, and player contracts.</li>
                <li><strong className="text-white">7.4 Education:</strong> Hold technical, training, and refereeing courses to develop the Association's cadres.</li>
                <li><strong className="text-white">7.5 National Teams:</strong> Prepare, develop, and manage the national sports teams that represent the country in international forums and provide the operational requirements to reach the desired goals.</li>
                <li><strong className="text-white">7.6 Recognition:</strong> Reward champions commensurate with their achievements, as well as those deemed to have served the sport and the objectives of the federation.</li>
                <li><strong className="text-white">7.7 Administration:</strong> Manage the affairs of the game and develop its resources from all technical, financial, and organizational aspects.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 8: Corporate Powers of the Association</h3>
              <p className="font-mono text-sm text-gray-300 mb-4">For the purpose of achieving its strategic and sporting goals, the Association possesses the legal and corporate authority to execute the following:</p>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">8.1</strong> Acquire, construct, rent, lease, and receive gifts regarding immovable property, movable property, and rights of any kind under mutually agreed terms.</li>
                <li><strong className="text-white">8.2</strong> Initiate promotional, digital, and public relations campaigns to raise public awareness of the intellectual rigor of dominoes and promote the goals of the Association.</li>
                <li><strong className="text-white">8.3</strong> Receive allocations, grants, donations, and gifts from any governmental or non-governmental entity (person or institution).</li>
                <li><strong className="text-white">8.4</strong> Organize operations and activities to raise funds, receive donations, and orchestrate cultural and social activities whose revenues are allocated strictly to advancing the Association's objectives.</li>
                <li><strong className="text-white">8.5</strong> Appoint and activate the work of volunteers, or hire paid employees and independent contractors of any kind in connection with advancing the Association's operational capabilities.</li>
                <li><strong className="text-white">8.6</strong> Grant the necessary licenses to operate sanctioned domino halls, academies, and electronic venues subject to the conditions established by the Executive Board.</li>
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 p-8">
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 9: Federation Principles & Anti-Discrimination</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">9.1</strong> The Association is a democratically established and fully independent organization, based fundamentally on the principle of equal rights among its members.</li>
                <li><strong className="text-white">9.2</strong> The Association unequivocally rejects and strictly prevents any form of racial discrimination against a geographic region, private person, or group on account of race, skin color, ethnic, national or social origin, age, wealth, disability, religion, or political opinions.</li>
                <li><strong className="text-white">9.3 Female Empowerment:</strong> The Association shall undertake all measures necessary to guarantee equal access to the sport. All relevant parties, clubs, and halls are legally obligated to take all appropriate measures to eliminate discrimination against women, promote the practice of the sport as a basic right, and actively raise the participation of female players to ensure foundational gender equality.</li>
                <li><strong className="text-white">9.4</strong> The Association is committed strictly to the protection of personal data regarding all its stakeholders and registered players.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* PART III */}
        <section>
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-12 border-b border-white/10 pb-6 text-white">
            Part III - Membership Rules and Conditions
          </h2>

          <div className="space-y-12">
            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 10: Affiliate Members and Tiers</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">10.1</strong> Membership within the Association is structurally divided into two tiers: Full Members and Participating Affiliates.</li>
                <li><strong className="text-white">10.2 Full Members:</strong> Primarily consist of licensed Iraqi sports clubs that practice the sport of dominoes (or a game within it). Full Members hold the absolute right to nominate representatives to the Executive Board and possess full voting rights within the General Assembly.</li>
                <li><strong className="text-white">10.3 Participating Affiliates:</strong> Venues, branches, or corresponding organizations which maintain operational infrastructure for dominoes in their respective territories, provided they fulfill the conditions and controls specified in these Bylaws. Participating Affiliates hold the right to exercise privileges including organizing rated events and making proposals to the General Assembly, but do not possess voting rights.</li>
                <li><strong className="text-white">10.4</strong> All Members must observe all rules, regulations, and decisions of the Association and ensure their own subordinate bodies and players comply completely with them.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 11: Affiliation Procedures</h3>
              <p className="font-mono text-sm text-gray-300 mb-4">11.1 Affiliation to the Association is enacted by submitting a formal request, which must be accompanied by the following documents:</p>
              <ul className="space-y-3 font-mono text-sm text-gray-300 list-none pl-4 border-l border-white/10">
                <li><strong className="text-white">11.1.1</strong> A copy of the club or organization's official license certificate.</li>
                <li><strong className="text-white">11.1.2</strong> A formal statement of the headquarters, facilities, and special playing venues.</li>
                <li><strong className="text-white">11.1.3</strong> The names of the members of the applicant's administrative body.</li>
                <li><strong className="text-white">11.1.4</strong> Payment of the official affiliation fee in accordance with Association regulations.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 12: Approval, Rejection, and Loss of Membership</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">12.1</strong> Sports clubs and venues are not legally considered members of the Association until approved by the General Assembly; however, the Executive Board may permit an applicant to participate in activities pending this approval.</li>
                <li><strong className="text-white">12.2</strong> In the event of non-approval of affiliation, the Association must issue a reasoned decision communicated to the applicant via an official letter. This decision is subject to objection at the National Center for Sports Settlement and Arbitration after exhausting the Association's internal objection mechanisms.</li>
                <li><strong className="text-white">12.3</strong> Any Member Affiliate whose membership is terminated holds the right to appeal to the National Center for Sports Settlement and Arbitration within two weeks of the date of being officially notified of the decision.</li>
                <li><strong className="text-white">12.4</strong> The Executive Board holds the power to suspend the membership of member clubs or halls in the event of a violation of the law, pending the convening of the General Assembly meeting.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* PART IV */}
        <section>
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-12 border-b border-white/10 pb-6 text-white">
            Part IV - Organization & Organs
          </h2>

          <div className="space-y-12">
            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 13: The General Assembly</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">13.1</strong> The General Assembly is the highest legislative and supreme authority of the Association.</li>
                <li><strong className="text-white">13.2 Composition:</strong> The General Assembly shall consist of member clubs participating in Association championships, maintaining a strict majority percentage. It must also include elected representatives of male and female national team players (aged 18 and above), elected representatives of internationally or Asian-badged referees and classified coaches, Iraqi members of international boards, and guarantee the representation of the female element.</li>
                <li><strong className="text-white">13.3 The Annual Meeting Mechanics:</strong> The General Assembly shall convene its ordinary annual meeting in the month of January. Official invitations to attend the meeting must be sent to all members at least thirty (30) days prior to the date of convening, and the invitation shall be explicitly published on the official website (iraqidomino.org).</li>
                <li><strong className="text-white">13.4 Quorum and Voting:</strong> The deliberations and work of the General Assembly are legally valid only in the presence of half plus one (50%+1) or more of the members who have the right to vote. Decisions are taken by a show of hands and by a simple majority vote of the attending voting members. In the event of a tie, the President's vote shall prevail.</li>
                <li><strong className="text-white">13.5 Powers & Duties:</strong> It exercises the absolute power to approve and modify the Association Bylaws, requiring a mandatory majority of two-thirds of valid votes of those Members present. It approves the general policy, the annual budget, and the financial and administrative reports.</li>
                <li><strong className="text-white">13.6</strong> The General Assembly acts as the final internal appellate organ for decisions taken by the Executive Board or the President. It holds the exclusive right to elect the members of the Executive Board, dismiss them, and direct disciplinary penalties.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 14: The Executive Board</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">14.1</strong> The Executive Board is the strategic, administrative, and oversight body of the Association, exercising both executive and legislative functions between General Assembly sessions.</li>
                <li><strong className="text-white">14.2 Term and Eligibility:</strong> The membership term is four (4) calendar years. A member may run for consecutive terms, provided they do not exceed two consecutive terms or three non-consecutive terms, and their age must not exceed seventy-five (75) years. Candidates must be Iraqi, and be practitioners or experts strictly prohibited from officially playing or refereeing while in office.</li>
                <li><strong className="text-white">14.3 Educational & Professional Eligibility:</strong> Candidates for the Presidential Body (President, Vice-President, Secretary-General) must hold at least a Bachelor's degree or an equivalent higher degree, combined with verified years of professional experience in the field of dominoes or sports administration. All other candidates for the Executive Board must hold at least a preparatory certificate.</li>
                <li><strong className="text-white">14.4 Strategic Authority:</strong> The Executive Board approves regulations concerning tournaments, ratings, and the mathematical ELO algorithm. It prepares the annual budget estimates and is responsible for providing all requirements for national teams to reach peak sports achievement.</li>
                <li><strong className="text-white">14.5 Administrative Appointments:</strong> The Executive Board must contract a Financial Secretary and a Secretary-General from outside the General Assembly, based on the President's proposal and majority approval; they shall attend meetings without voting rights.</li>
                <li><strong className="text-white">14.6 Prohibition of Dual Roles:</strong> It is impermissible to combine membership in the Executive Board of the Association with membership in the executive or administrative body of any other national sports federation. Any elected member must resign from conflicting roles.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 15: The President of the Association</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">15.1</strong> The President officially represents the Association in all legal, financial, and external capacities before the government, the judiciary, and in international forums.</li>
                <li><strong className="text-white">15.2</strong> The President holds the authority to sign contracts, financial reports, disbursement authorizations, and the annual program. While explicit operational delegations may be granted to the Executive Board, the President chairs all meetings of the General Assembly (except electoral meetings) and the Executive Board.</li>
                <li><strong className="text-white">15.3</strong> In the absence of the President, the Vice-President acts on their behalf.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* PART V */}
        <section>
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-12 border-b border-white/10 pb-6 text-white">
            Part V - Ethics, Disciplinary Actions, and Settlement of Disputes
          </h2>

          <div className="space-y-12">
            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 16: The Ethics Committee</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">16.1</strong> To ensure integrity and adherence to the International Code of Sports Ethics, the General Assembly shall form an Ethics Committee consisting of no less than three and no more than seven (7) members, guaranteeing female representation.</li>
                <li><strong className="text-white">16.2</strong> This committee shall hold members accountable according to an ethics code drafted by the Executive Board and ratified by the General Assembly.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 17: Internal Arbitration and Appeals</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">17.1</strong> The Association shall form an Internal Arbitration Committee to look into and resolve sports disputes that arise within the federation.</li>
                <li><strong className="text-white">17.2</strong> Any decision taken by an Association organ regarding technical fouls, competition algorithms, or standard disciplinary actions must first be challenged exclusively by way of an internal appeal to this Internal Arbitration Committee and, ultimately, the General Assembly.</li>
              </ul>
            </div>

            <div className="bg-red-900/10 border border-red-500/20 p-8">
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 18: National and International Arbitration</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">18.1 Domestic and Institutional Disputes:</strong> The Association and its members are legally bound by the mechanisms and decisions of the National Center for Sports Settlement and Arbitration in Iraq. Disputes regarding membership termination or affiliation rejection must be directed to this National Center within two weeks (14 days) of official notification, strictly after exhausting the Association's internal remedies.</li>
                <li><strong className="text-white">18.2 International and Representational Disputes:</strong> In cases concerning international representation, cross-border technical disputes, or directives from the FID, disputes may escalate to the CAS. CAS will resolve the dispute in a final and binding manner in accordance with the Code of Sports-related Arbitration.</li>
                <li><strong className="text-white">18.3</strong> An appeal before CAS may only be brought after all internal Association procedures and national remedies have been fully exhausted. The time limit for any such external appeal to CAS is twenty-one (21) days from the receipt by the appellant of the finalized internal decision.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* PART VI */}
        <section>
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-12 border-b border-white/10 pb-6 text-white">
            Part VI - Financial Provisions, Administration & Transparency
          </h2>

          <div className="space-y-12">
            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 19: Sources of Revenue</h3>
              <p className="font-mono text-sm text-gray-300 mb-4">19.1 The financial resources of the Association shall be composed of the following:</p>
              <ul className="space-y-3 font-mono text-sm text-gray-300 list-none pl-4 border-l border-white/10">
                <li><strong className="text-white">19.1.1</strong> Subscription fees from Affiliate Members and revenues generated from participation in various sporting events and mathematically rated tournaments.</li>
                <li><strong className="text-white">19.1.2</strong> Governmental grants allocated within the general budget of the state, as well as grants from sponsoring companies, or from the FID and continental federations in accordance with the law.</li>
                <li><strong className="text-white">19.1.3</strong> Donations, gifts, and legal loans.</li>
                <li><strong className="text-white">19.1.4</strong> Revenues derived from investments, corporate sponsorships, self-financing initiatives, television broadcasting rights, and digital or sports marketing.</li>
                <li><strong className="text-white">19.1.5</strong> Returns from property investments, leases, and musataha (building rights).</li>
                <li><strong className="text-white">19.1.6</strong> Any other legally permissible revenue streams approved by the General Assembly.</li>
              </ul>
              <p className="font-mono text-sm text-gray-300 mt-4">
                <strong className="text-white">19.2</strong> The granting party holds the right to establish mechanisms for its financial grants to reach the Association directly through the Association's special accounts in official banks.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 20: Banking and Fiscal Operations</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">20.1</strong> The Association is legally obligated to deposit, withdraw, and transfer its cash funds strictly in its own name at one of the accredited Iraqi banks.</li>
                <li><strong className="text-white">20.2</strong> The Executive Board must formally notify the relevant governmental authorities within one week if the accredited bank is changed.</li>
                <li><strong className="text-white">20.3</strong> The fiscal year of the Association shall commence on the first of January of each year and strictly conclude on the thirty-first of December of the same year.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 21: Auditing and Financial Oversight</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">21.1</strong> All accounts, financial records, and operations of the Association are strictly subject to the audit and oversight of the Federal Board of Supreme Audit.</li>
                <li><strong className="text-white">21.2</strong> The Executive Board shall appoint a certified, independent financial auditor to review the annual budget estimates and final accounts before their formal presentation to the General Assembly.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 22: Board Compensation</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">22.1</strong> The President and the elected members of the Executive Board shall not receive salaries in exchange for the performance of their duties.</li>
                <li><strong className="text-white">22.2</strong> Their service is considered strictly voluntary; however, they are entitled to compensation for travel, accommodation, and other justified expenses incurred while carrying out official tasks entrusted to them, as specified in the financial regulations of the Association.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* PART VII */}
        <section>
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-12 border-b border-white/10 pb-6 text-white">
            Part VII - Operational Licensing, Governance, and Exclusivity
          </h2>

          <div className="space-y-12">
            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 23: Exclusivity of the Federation</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">23.1</strong> In accordance with Iraqi sports law, it is not permissible to have more than one federation governing the game or sport of dominoes within the Republic of Iraq. The Association holds sole domestic authority.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 24: Digital Presence and Good Governance Transparency</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">24.1</strong> The Association is legally required to maintain an official website on the national electronic network at iraqidomino.org to publish its information, regulations, and activities to the public.</li>
                <li><strong className="text-white">24.2</strong> The Association must maintain official email addresses hosted within this website's domain for all formal correspondence.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 25: Regulation of Sanctioned Domino Halls, Academies, and Clubs</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">25.1</strong> The Association shall establish mandatory conditions, instructions, and fees for granting official operational licenses to practice the sport in clubs, specialized halls, and academies.</li>
                <li>
                  <strong className="text-white">25.2</strong> To maintain their sanctioned license, domino halls and operational venues are strictly bound by the following conditions:
                  <ul className="space-y-3 font-mono text-sm text-gray-300 list-none pl-4 border-l border-white/10 mt-3">
                    <li><strong className="text-white">25.2.1</strong> The venue must be structurally ready and adequately prepared to receive players and host official tournaments in accordance with the Association's environmental standards.</li>
                    <li><strong className="text-white">25.2.2</strong> The venue is legally obligated, upon request, to provide a suitable, quiet, and appropriate environment for the training sessions of the national team players without imposing any restrictions or conditions.</li>
                    <li><strong className="text-white">25.2.3</strong> The venue must commit to paying the required annual subscription fees to the Association Fund to maintain its Participating Affiliate status.</li>
                    <li><strong className="text-white">25.2.4</strong> The venue administration is strictly responsible for verifying the ages of the players operating within the hall to ensure compliance with the game's laws and age-bracketed tournament regulations.</li>
                  </ul>
                </li>
                <li><strong className="text-white">25.3</strong> The Association retains the right to establish its own sovereign academies and training centers specific to the sport of dominoes, in coordination with governmental and non-governmental entities.</li>
                <li><strong className="text-white">25.4</strong> Member clubs shall retain all their rights as members of the federation in the event they change their legal entity into commercial companies.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* PART VIII */}
        <section>
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-12 border-b border-white/10 pb-6 text-white">
            Part VIII - Elections, Amendments & Final Provisions
          </h2>

          <div className="space-y-12">
            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 26: The Electoral Process and Committee</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">26.1</strong> The members of the Executive Board shall be elected by direct secret ballot from among the members of the General Assembly.</li>
                <li><strong className="text-white">26.2</strong> To guarantee absolute democratic transparency, the General Assembly shall form an independent Electoral Committee from outside its membership immediately after each electoral process.</li>
                <li><strong className="text-white">26.3</strong> The President and the Deputy of this Electoral Committee must be recognized legal professionals. This committee is strictly responsible for supervising the elections, certifying the results, and announcing them.</li>
                <li><strong className="text-white">26.4</strong> Official invitations to attend the electoral conference must be directed to the Ministry, the Committee, and the FID.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 27: Amendments to the Bylaws</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">27.1</strong> These Bylaws may only be amended by the General Assembly.</li>
                <li><strong className="text-white">27.2</strong> Any proposed amendment must be submitted to the Secretariat at least thirty (30) days prior to a General Assembly meeting.</li>
                <li><strong className="text-white">27.3</strong> Ratification of any amendment requires a mandatory supermajority of two-thirds (2/3) of the valid votes of the Members present. Following ratification, the amended Bylaws shall be submitted to the FID for international recognition and the relevant Iraqi state authorities.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 mb-4">Article 28: Dissolution of the Association</h3>
              <ul className="space-y-4 font-mono text-sm text-gray-300 list-none">
                <li><strong className="text-white">28.1</strong> The Association may only be dissolved by a special resolution of the General Assembly convened specifically for this purpose.</li>
                <li><strong className="text-white">28.2</strong> The decision to dissolve the Association requires a supermajority of three-quarters (3/4) of the total voting Members.</li>
                <li><strong className="text-white">28.3</strong> In the event of dissolution, and after the settlement of all outstanding legal and financial obligations, the remaining assets of the Association shall be transferred to the Committee or a recognized charitable sporting institution as determined by the General Assembly, and shall not be distributed among the members.</li>
              </ul>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
