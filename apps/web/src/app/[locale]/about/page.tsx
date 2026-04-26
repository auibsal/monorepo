'use client';

import { Link } from '@/i18n/routing';

export default function AboutPage() {
  return (
    <div className="w-full">
      
      {/* HERO SECTION */}
      <section className="relative min-h-[60vh] flex flex-col items-center justify-center px-6 overflow-hidden border-b border-black/10">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 mix-blend-overlay pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-900/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>
        
        <div className="text-center max-w-4xl z-10 relative mt-16">
          <h2 className="text-xl md:text-2xl font-medium tracking-wide mb-4 opacity-80 text-association-black">

          </h2>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 uppercase leading-[1.1]">
            Elevating a Tradition. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-association-black to-gray-800">
              Engineering a Sport.
            </span>
          </h1>
          <p className="text-lg md:text-xl font-light opacity-70 max-w-2xl mx-auto leading-relaxed">
            The Iraqi Dominoes Association (IDA) is the supreme governing body dedicated to transitioning the nation's most beloved pastime into a mathematically rated, globally recognized competitive institution.
          </p>
        </div>
      </section>

      {/* THE 2026 MANDATE / OUR STORY */}
      <section className="py-24 px-6 lg:px-12 max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 items-center">
        <div className="w-full lg:w-1/2">
          <p className="text-sm uppercase tracking-widest text-red-500 font-bold mb-4">The Genesis</p>
          <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-wide mb-8">The 2026 Mandate</h2>
          <div className="space-y-6 font-light opacity-80 leading-relaxed text-lg">
            <p>
              For generations, dominoes has been the heartbeat of Iraqi cafe culture—a game of sharp intellect, unspoken partnerships, and fierce local pride. However, without a unified rulebook or a standardized tracking system, the true hierarchy of the nation's best players remained a matter of debate.
            </p>
            <p>
              Founded in 2026, the IDA was established to change that. By combining institutional governance with a proprietary, dynamic ELO mathematical algorithm, we removed the subjectivity from the sport.
            </p>
            <p>
              Today, the Federation sanctions venues, certifies arbiters, and maintains the immutable digital ledger that ranks thousands of players across every governorate, bridging the gap between local cafes and the international stage.
            </p>
          </div>
        </div>
        
        {/* Abstract Visual Representation */}
        <div className="w-full lg:w-1/2 flex justify-center relative">
          <div className="relative w-64 h-96 border-4 border-association-white rounded-xl bg-white shadow-2xl flex flex-col transform rotate-6 hover:rotate-0 transition-transform duration-700">
            <div className="flex-1 border-b-4 border-association-white flex justify-center items-center">
              <div className="w-12 h-12 rounded-full bg-association-white"></div>
            </div>
            <div className="flex-1 flex justify-center items-center">
              {/* Empty / Blank half */}
            </div>
          </div>
          <div className="absolute top-10 right-10 w-64 h-96 border-4 border-black/20 rounded-xl bg-transparent flex flex-col transform -rotate-12 -z-10">
             <div className="flex-1 border-b-4 border-black/20 flex items-center justify-center gap-4">
                <div className="w-8 h-8 rounded-full bg-black/20"></div>
                <div className="w-8 h-8 rounded-full bg-black/20"></div>
             </div>
             <div className="flex-1"></div>
          </div>
        </div>
      </section>

      {/* THE THREE PILLARS */}
      <section className="py-24 bg-black/5 border-y border-black/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-wide">The Pillars of the Federation</h2>
            <p className="font-light opacity-60 mt-4 max-w-xl mx-auto">Operating at the intersection of bureaucratic administration, technological innovation, and grassroots community building.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-10 border border-black/10 hover:border-black/40 transition-colors rounded-sm group">
              <div className="text-4xl mb-6 opacity-50 group-hover:opacity-100 transition-opacity">⚖️</div>
              <h3 className="text-xl font-bold uppercase mb-4 text-association-black">Regulatory Standardization</h3>
              <p className="font-light opacity-70 leading-relaxed text-sm">
                Unifying the fragmented "house rules" of local cafes into a single, definitive Master Dossier. We train and certify national Arbiters to uphold the integrity of the game at every sanctioned table.
              </p>
            </div>
            
            <div className="bg-white p-10 border border-black/10 hover:border-red-500/50 transition-colors rounded-sm group">
              <div className="text-4xl mb-6 opacity-50 group-hover:opacity-100 transition-opacity">🧮</div>
              <h3 className="text-xl font-bold uppercase mb-4 text-association-black">Mathematical Precision</h3>
              <p className="font-light opacity-70 leading-relaxed text-sm">
                Our bespoke digital platform utilizes a heavily weighted, dynamic ELO algorithm designed specifically for 2v2 play. Every sanctioned match outcome is permanently recorded, creating an undeniable national hierarchy.
              </p>
            </div>

            <div className="bg-white p-10 border border-black/10 hover:border-black/40 transition-colors rounded-sm group">
              <div className="text-4xl mb-6 opacity-50 group-hover:opacity-100 transition-opacity">🏛️</div>
              <h3 className="text-xl font-bold uppercase mb-4 text-association-black">Global Affiliation</h3>
              <p className="font-light opacity-70 leading-relaxed text-sm">
                Operating under the framework of the Ministry of Youth and Sports (MoYS) while aligning technical standards with the Federación Internacional de Dominó (FID) to prepare Iraqi players for the World Championship stage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* EXECUTIVE BOARD / LEADERSHIP */}
      <section className="py-24 px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-wide border-b border-black/20 pb-4 inline-block">
            The Executive Board
          </h2>
          <p className="font-light opacity-60 mt-4 max-w-2xl">
            The administrative and fiduciary authority of the IDA is vested in the Executive Board, tasked with driving the strategic and technological vision of the Federation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Profile Cards */}
          {[
            { title: "President", role: "Chief Executive Officer", focus: "Strategy & MoYS Liaison" },
            { title: "VP of Technology", role: "Platform Architect", focus: "Rating Algorithm & Database" },
            { title: "VP of Operations", role: "Sanctioning Director", focus: "Affiliates & Tournaments" },
            { title: "Secretary General", role: "Legal & Ethics", focus: "Rulebook & Arbitration" },
          ].map((member, index) => (
            <div key={index} className="flex flex-col border-l border-black/20 pl-6 hover:border-association-white transition-colors">
              <span className="text-xs font-bold uppercase tracking-widest text-red-500 mb-1">
                {member.role}
              </span>
              <h3 className="text-xl font-bold uppercase text-association-black mb-2">
                {member.title}
              </h3>
              <p className="text-sm font-light opacity-70">
                <strong className="opacity-100">Focus:</strong> {member.focus}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="py-24 text-center border-t border-black/10 bg-gradient-to-b from-transparent to-black/40">
        <h2 className="text-3xl font-bold uppercase tracking-wide mb-6">Take Your Place in History</h2>
        <p className="font-light opacity-80 max-w-xl mx-auto mb-10 text-lg">
          Whether you are a player seeking a national rank, or a venue looking to host official tournaments, the Federation welcomes you.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link 
            href="/register" 
            className="px-8 py-4 bg-association-white text-association-black font-bold uppercase tracking-wider rounded-sm hover:bg-white transition-colors"
          >
            Claim Player ID
          </Link>
          <Link 
            href="/affiliates" 
            className="px-8 py-4 border border-association-white text-association-black font-bold uppercase tracking-wider rounded-sm hover:bg-black/10 transition-colors"
          >
            Become an Affiliate
          </Link>
        </div>
      </section>

    </div>
  );
}
