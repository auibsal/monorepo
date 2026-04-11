'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function FederationCharter() {
  const [activeSection, setActiveSection] = useState('');

  // Interactive Scroll Spy to highlight the active section in the sidebar
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('section[id]');
      let currentSectionId = '';

      sections.forEach((section) => {
        const sectionTop = section.getBoundingClientRect().top;
        // If the section is near the top of the viewport
        if (sectionTop <= 150) {
          currentSectionId = section.getAttribute('id') || '';
        }
      });

      setActiveSection(currentSectionId);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toc = [
    { id: 'part-1', title: 'Part I - General Provisions' },
    { id: 'part-2', title: 'Part II - Mission and Principles' },
    { id: 'part-3', title: 'Part III - Membership' },
    { id: 'part-4', title: 'Part IV - Organization & Organs' },
    { id: 'part-5', title: 'Part V - Settlement of Disputes' },
  ];

  return (
    <div className="max-w-7xl mx-auto py-16 px-6 lg:px-12 w-full flex flex-col md:flex-row gap-12 relative">
      
      {/* Interactive Sidebar (Table of Contents) */}
      <aside className="w-full md:w-1/4 md:sticky md:top-32 h-fit mb-12 md:mb-0">
        <Link 
          href="/" 
          className="text-xs font-bold uppercase tracking-widest text-federation-ivory/50 hover:text-federation-ivory transition-colors mb-8 inline-block"
        >
          &larr; Return to Headquarters
        </Link>
        <h3 className="text-sm font-bold uppercase tracking-widest border-b border-federation-ivory/20 pb-4 mb-6">
          Charter Index
        </h3>
        <nav className="flex flex-col gap-4">
          {toc.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`text-left text-sm uppercase tracking-wide transition-all duration-300 ${
                activeSection === item.id 
                  ? 'text-federation-ivory font-bold translate-x-2' 
                  : 'text-federation-ivory/60 hover:text-federation-ivory'
              }`}
            >
              {item.title}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Charter Content */}
      <article className="w-full md:w-3/4 space-y-24">
        
        {/* Header */}
        <header className="border-b-2 border-federation-ivory/30 pb-12">
          <h2 className="text-xl md:text-2xl font-medium tracking-wide mb-4 opacity-80" style={{ fontFamily: 'var(--font-ibm-plex-arabic)' }}>
            الميثاق التأسيسي للاتحاد
          </h2>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight uppercase leading-none mb-6">
            The Supreme Charter <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-federation-ivory to-gray-500">
              of the Federation
            </span>
          </h1>
          <p className="text-lg font-light opacity-80 leading-relaxed max-w-3xl">
            This document constitutes the foundational constitutional framework of the Iraqi Dominoes Federation (IDF). [span_0](start_span)It defines the composition, legal mandate, and formal organization of the entity as a sovereign corporate body[span_0](end_span).
          </p>
        </header>

        {/* PART I */}
        <section id="part-1" className="scroll-mt-32">
          <div className="mb-8 border-l-4 border-federation-ivory pl-6">
            <h2 className="text-3xl font-bold uppercase tracking-wide">Part I - General Provisions</h2>
          </div>
          <div className="space-y-8 pl-0 sm:pl-7">
            
            <div>
              <h3 className="text-xl font-semibold mb-3">Article 1: Name, Legal Status, and Seat</h3>
              <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
                <p>
                  [span_1](start_span)<strong className="text-federation-ivory font-semibold">1.1</strong> The Iraqi Dominoes Federation (hereafter the IDF) is a non-governmental, non-profit organization[span_1](end_span).
                </p>
                <p>
                  [span_2](start_span)<strong className="text-federation-ivory font-semibold">1.2</strong> The IDF is an association of unlimited duration, with the status of a legal person[span_2](end_span).
                </p>
                <p>
                  [span_3](start_span)<strong className="text-federation-ivory font-semibold">1.3</strong> The principal seat and headquarters of the IDF are located in Baghdad, Iraq[span_3](end_span). [span_4](start_span)Operational offices may be opened in other governorates or cities, if deemed necessary and approved by the Executive Council[span_4](end_span).
                </p>
                <p>
                  [span_5](start_span)<strong className="text-federation-ivory font-semibold">1.4</strong> The IDF possesses exclusive rights to its name in both Arabic and English, as well as in any official translations[span_5](end_span).
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">Article 2: Official Languages</h3>
              <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
                <p>
                  [span_6](start_span)<strong className="text-federation-ivory font-semibold">2.1</strong> Arabic and English are the official operational and legislative languages of the IDF[span_6](end_span). [span_7](start_span)In the case of divergence or legal dispute between the Arabic and English texts of this Charter, the Arabic text registered with the Iraqi Ministry of Youth and Sports shall prevail[span_7](end_span).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PART II */}
        <section id="part-2" className="scroll-mt-32">
          <div className="mb-8 border-l-4 border-federation-ivory pl-6">
            <h2 className="text-3xl font-bold uppercase tracking-wide">Part II - Mission and Principles</h2>
          </div>
          <div className="space-y-8 pl-0 sm:pl-7">
            
            <div>
              <h3 className="text-xl font-semibold mb-3">Article 3: Mission and Role of the IDF</h3>
              <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
                <p>
                  [span_8](start_span)<strong className="text-federation-ivory font-semibold">3.1</strong> Dominoes is recognized as an ancient intellectual and cultural game, representing a combination of sport, mathematical probability, and strategic thinking[span_8](end_span).
                </p>
                <p>
                  [span_9](start_span)<strong className="text-federation-ivory font-semibold">3.2</strong> The fundamental mission of the IDF is the diffusion, regulation, and development of dominoes among all regions, as well as the raising of the level of cultural knowledge on a sporting, scientific, and educational basis[span_9](end_span).
                </p>
                <p>
                  [span_10](start_span)<strong className="text-federation-ivory font-semibold">3.3</strong> The IDF serves as the supreme governing body responsible for the sport of dominoes, its national championships, and mathematically rated events within the Republic of Iraq[span_10](end_span). [span_11](start_span)The IDF assumes exclusive rights for the formulation of official ratings, mathematical ranking algorithms, and the authorization of sanctioned competitions[span_11](end_span).
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">Article 4: Federation Principles</h3>
              <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify bg-federation-ivory/5 p-6 rounded-sm border border-federation-ivory/10">
                <p>
                  [span_12](start_span)<strong className="text-federation-ivory font-semibold">4.1</strong> The IDF is a democratically established and fully independent organization, based fundamentally on the principle of equal rights among its members[span_12](end_span).
                </p>
                <p>
                  [span_13](start_span)<strong className="text-federation-ivory font-semibold">4.2</strong> The IDF unequivocally rejects any kind of discrimination against a geographic region, private person, or group on account of race, skin colour, ethnic, national or social origin, age, wealth, disability, religion, or political opinions[span_13](end_span).
                </p>
                <p>
                  [span_14](start_span)<strong className="text-federation-ivory font-semibold">4.3</strong> The IDF shall undertake all measures necessary to guarantee equal access to the sport and to assure gender balance inside IDF organs and management[span_14](end_span).
                </p>
                <p>
                  [span_15](start_span)<strong className="text-federation-ivory font-semibold">4.4</strong> The IDF is committed strictly to the protection of personal data regarding all its stakeholders and registered players[span_15](end_span).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PART III */}
        <section id="part-3" className="scroll-mt-32">
          <div className="mb-8 border-l-4 border-federation-ivory pl-6">
            <h2 className="text-3xl font-bold uppercase tracking-wide">Part III - Membership</h2>
          </div>
          <div className="space-y-8 pl-0 sm:pl-7">
            
            <div>
              <h3 className="text-xl font-semibold mb-3">Article 5: Affiliate Members</h3>
              <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
                <p>
                  [span_16](start_span)<strong className="text-federation-ivory font-semibold">5.1</strong> Member Affiliates are regional associations, venues, or corresponding organizations which maintain operational infrastructure for dominoes activities in their respective territories and which have been formally admitted to the IDF[span_16](end_span).
                </p>
                <p>
                  [span_17](start_span)[span_18](start_span)<strong className="text-federation-ivory font-semibold">5.2</strong> Member Affiliates hold the right to exercise all privileges arising from IDF rules, including the right to organize official rated events and the right to make proposals for inclusion in the agenda of the General Assembly[span_17](end_span)[span_18](end_span).
                </p>
                <p>
                  [span_19](start_span)<strong className="text-federation-ivory font-semibold">5.3</strong> All Members must observe all rules, regulations, and decisions of the IDF and ensure their own subordinate bodies and players comply completely with them[span_19](end_span).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PART IV */}
        <section id="part-4" className="scroll-mt-32">
          <div className="mb-8 border-l-4 border-federation-ivory pl-6">
            <h2 className="text-3xl font-bold uppercase tracking-wide">Part IV - Organization & Organs</h2>
          </div>
          <div className="space-y-8 pl-0 sm:pl-7">
            
            <div>
              <h3 className="text-xl font-semibold mb-3">Article 6: The General Assembly</h3>
              <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
                <p>
                  [span_20](start_span)<strong className="text-federation-ivory font-semibold">6.1</strong> The General Assembly is the highest legislative authority of the IDF[span_20](end_span).
                </p>
                <p>
                  [span_21](start_span)<strong className="text-federation-ivory font-semibold">6.2</strong> It exercises the absolute power to approve and modify the IDF Charter, requiring a mandatory majority of two-thirds of valid votes of those Members present[span_21](end_span). [span_22](start_span)It acts as the final internal appellate organ for all decisions taken by the Executive Council or the President[span_22](end_span).
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">Article 7: The Executive Council and President</h3>
              <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
                <p>
                  [span_23](start_span)<strong className="text-federation-ivory font-semibold">7.1</strong> The President officially represents the IDF in all legal, financial, and external capacities[span_23](end_span). [span_24](start_span)The President holds the sole authority to sign documents and assume obligations for the Federation, though explicit delegations may be granted to the Management Board[span_24](end_span).
                </p>
                <p>
                  [span_25](start_span)<strong className="text-federation-ivory font-semibold">7.2</strong> The Executive Council is the strategic and oversight body of the IDF, exercising both executive and legislative functions[span_25](end_span). [span_26](start_span)It approves regulations concerning tournaments, ratings, and the mathematical ELO algorithm[span_26](end_span).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PART V */}
        <section id="part-5" className="scroll-mt-32">
          <div className="mb-8 border-l-4 border-red-700 pl-6">
            <h2 className="text-3xl font-bold uppercase tracking-wide">Part V - Settlement of Disputes</h2>
          </div>
          <div className="space-y-8 pl-0 sm:pl-7">
            
            <div>
              <h3 className="text-xl font-semibold mb-3 text-red-500">Article 8: Appeals and Arbitration</h3>
              <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
                <p>
                  [span_27](start_span)<strong className="text-federation-ivory font-semibold">8.1</strong> Any final decision taken by an IDF organ regarding technical fouls or disciplinary action may be challenged exclusively by way of an internal appeal to the General Assembly[span_27](end_span). 
                </p>
                <p>
                  [span_28](start_span)<strong className="text-federation-ivory font-semibold">8.2</strong> In cases concerning international representation, disputes may be escalated to the Court of Arbitration for Sport (CAS) in Lausanne, Switzerland, which will resolve the dispute in a final and binding manner in accordance with the Code of Sports-related Arbitration[span_28](end_span). [span_29](start_span)An appeal before the CAS may only be brought after all internal IDF procedures and remedies have been fully exhausted[span_29](end_span).
                </p>
                <p>
                  [span_30](start_span)<strong className="text-federation-ivory font-semibold">8.3</strong> The time limit for any such external appeal is twenty-one days from the receipt by the appellant of the finalized IDF decision[span_30](end_span).
                </p>
              </div>
            </div>
          </div>
        </section>

      </article>
    </div>
  );
}
