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
        
        {/* Cleaned up Typography - No Spans */}
        <h1 className="text-6xl md:text-7xl lg:text-8xl font-black uppercase leading-[0.9] tracking-tighter mb-8 text-white">
          The Bylaws.
        </h1>
        
        <p className="text-gray-400 font-mono text-sm md:text-base max-w-2xl leading-relaxed pl-6 border-l-2 border-white/10">
          These Bylaws constitute the foundational framework and the official internal system of the Iraqi Domino Association. It defines the composition, legal mandate, and formal organization of the entity as a sovereign corporate body operating under the authority of the Iraqi National Sports Federations Law No. (24) of 2021.
        </p>
      </header>

      {/* CONTENT SECTIONS */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 lg:px-24 py-20 flex flex-col gap-24">
        
        {/* PART I */}
        <section>
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-8 border-b border-white/10 pb-4 text-white/90">
            Part I: General Provisions & Commitments
          </h2>
          <div className="space-y-6 font-mono text-sm text-gray-300 leading-relaxed">
            <p>
              The Association is a non-governmental, non-profit organization enjoying an independent moral personality. It is established for an unlimited duration, with the status of a legal person. The principal seat and headquarters of the Association are strictly located in Baghdad, Iraq. Operational branches, offices, or committees may be opened in other regions, governorates not organized in a region, or districts according to need and as approved by the Executive Board.
            </p>
            <p>
              The Association inherently possesses the independent, sovereign right to choose, design, and display its official flag, emblem, and visual identity without external interference. Arabic and English are the official operational and legislative languages of the Association. In the case of divergence or legal dispute between the Arabic and English texts of these Bylaws, the Arabic text registered with the Ministry and the Committee shall prevail.
            </p>
            <ul className="list-disc pl-6 space-y-3 mt-6">
              <li>The Association operates in a manner that does not contradict the Iraqi Constitution and the laws in force.</li>
              <li>The Association strictly commits to the Olympic Charter, the Paralympic Constitution (where applicable to specific domino variants), the regulations and rules set by the FID.</li>
              <li>The Association commits to the International Anti-Doping Code and the International Code of Sports Ethics of the International Olympic Committee.</li>
              <li>The Association pledges adherence to the principles of good governance for sports organizations and the implementation of these Bylaws.</li>
            </ul>
          </div>
        </section>

        {/* PART II & III */}
        <section>
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-8 border-b border-white/10 pb-4 text-white/90">
            Part II & III: Mission, Exclusivity, and Membership
          </h2>
          <div className="space-y-6 font-mono text-sm text-gray-300 leading-relaxed">
            <p>
              Dominoes is recognized as an ancient intellectual and cultural game, representing a combination of sport, mathematical probability, and strategic thinking. The fundamental mission of the Association is the diffusion, regulation, and development of dominoes among all regions of Iraq, as well as raising the level of cultural knowledge on a sporting, scientific, and educational basis.
            </p>
            <div className="bg-white/5 border border-white/10 p-6 my-8">
              <h3 className="text-red-500 font-bold uppercase tracking-widest mb-4">Sovereign Authority</h3>
              <p>
                The Association serves as the sole supreme governing body responsible for the sport of dominoes, its national championships, and mathematically rated events within the Republic of Iraq. The Association assumes exclusive rights for the formulation of official ratings, mathematical ranking algorithms, and the authorization of sanctioned competitions.
              </p>
            </div>
            <h3 className="text-white font-bold uppercase tracking-widest mt-8 mb-4">Membership Structure</h3>
            <ul className="list-disc pl-6 space-y-3">
              <li>Membership within the Association is structurally divided into two tiers: Full Members and Participating Affiliates.</li>
              <li>Full Members primarily consist of licensed Iraqi sports clubs that practice the sport of dominoes (or a game within it). Full Members hold the absolute right to nominate representatives to the Executive Board and possess full voting rights within the General Assembly.</li>
              <li>Participating Affiliates are venues, branches, or corresponding organizations which maintain operational infrastructure for dominoes in their respective territories. Participating Affiliates hold the right to exercise privileges including organizing rated events and making proposals to the General Assembly, but do not possess voting rights.</li>
              <li>All Members must observe all rules, regulations, and decisions of the Association and ensure their own subordinate bodies and players comply completely with them.</li>
            </ul>
          </div>
        </section>

        {/* PART IV */}
        <section>
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-8 border-b border-white/10 pb-4 text-white/90">
            Part IV: Structural Organs
          </h2>
          <div className="space-y-6 font-mono text-sm text-gray-300 leading-relaxed">
            <h3 className="text-white font-bold uppercase tracking-widest mb-2">The General Assembly</h3>
            <p className="mb-6">
              The General Assembly is the highest legislative and supreme authority of the Association. It shall consist of member clubs participating in Association championships, maintaining a strict majority percentage. It must also include elected representatives of male and female national team players (aged 18 and above), elected representatives of internationally or Asian-badged referees and classified coaches, Iraqi members of international boards, and guarantee the representation of the female element.
            </p>
            <ul className="list-disc pl-6 space-y-3 mb-8">
              <li>The General Assembly shall convene its ordinary annual meeting in the month of January.</li>
              <li>Official invitations to attend the meeting must be sent to all members at least thirty (30) days prior to the date of convening, and the invitation shall be explicitly published on the official website (iraqidomino.org).</li>
              <li>The deliberations and work of the General Assembly are legally valid only in the presence of half plus one (50%+1) or more of the members who have the right to vote.</li>
              <li>It exercises the absolute power to approve and modify the Association Bylaws, requiring a mandatory majority of two-thirds of valid votes of those Members present.</li>
            </ul>

            <h3 className="text-white font-bold uppercase tracking-widest mt-8 mb-2">The Executive Board</h3>
            <p>
              The Executive Board is the strategic, administrative, and oversight body of the Association, exercising both executive and legislative functions between General Assembly sessions. The membership term is four (4) calendar years. A member may run for consecutive terms
