'use client';

import Link from 'next/link';

export default function MedicalHub() {
  return (
    <div className="w-full min-h-[85vh] flex flex-col">
      
      {/* HEADER SECTION */}
      <section className="relative pt-24 pb-16 px-6 overflow-hidden border-b border-federation-ivory/10">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 mix-blend-overlay pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-900/5 blur-[100px] rounded-full pointer-events-none -z-10"></div>
        
        <div className="text-center max-w-4xl mx-auto z-10 relative">
          <h2 className="text-xl md:text-2xl font-medium tracking-wide mb-4 opacity-80 text-federation-ivory" style={{ fontFamily: 'var(--font-ibm-plex-arabic)' }}>

          </h2>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight uppercase leading-none mb-6">
            Medical & Performance <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-federation-ivory to-gray-500">
              Directorate
            </span>
          </h1>
          <p className="text-lg font-light opacity-70 max-w-2xl mx-auto leading-relaxed">
            Safeguarding the integrity of the sport and the health of the athlete. The IDA Medical Directorate ensures strict compliance with international anti-doping standards while advancing research into the cognitive and physical demands of competitive dominoes.
          </p>
        </div>
      </section>

      {/* DEPARTMENT CARDS */}
      <section className="flex-grow max-w-7xl mx-auto w-full px-6 lg:px-12 py-24 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Anti-Doping Node */}
        <Link href="/medical/anti-doping" className="group relative bg-federation-obsidian border border-federation-ivory/10 p-12 overflow-hidden rounded-sm hover:border-red-500/50 transition-colors duration-500">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-bl-full -z-10 group-hover:bg-red-500/10 transition-colors duration-500"></div>
          <span className="text-4xl mb-6 block opacity-80">🚫</span>
          <h3 className="text-2xl font-bold uppercase tracking-wide mb-4 text-federation-ivory">Anti-Doping & WADA</h3>
          <p className="font-light opacity-70 leading-relaxed mb-8">
            The official IDA policy on prohibited substances, in-competition testing procedures, and Therapeutic Use Exemptions (TUEs). Maintaining a clean sport is our highest priority.
          </p>
          <span className="text-sm font-bold uppercase tracking-widest text-red-500 group-hover:text-red-400 transition-colors">
            View Policy &rarr;
          </span>
        </Link>

        {/* High Performance Node */}
        <Link href="/medical/performance" className="group relative bg-federation-obsidian border border-federation-ivory/10 p-12 overflow-hidden rounded-sm hover:border-federation-ivory/40 transition-colors duration-500">
          <div className="absolute top-0 right-0 w-32 h-32 bg-federation-ivory/5 rounded-bl-full -z-10 group-hover:bg-federation-ivory/10 transition-colors duration-500"></div>
          <span className="text-4xl mb-6 block opacity-80">🧠</span>
          <h3 className="text-2xl font-bold uppercase tracking-wide mb-4 text-federation-ivory">Athletic Performance</h3>
          <p className="font-light opacity-70 leading-relaxed mb-8">
            Scientific guidelines for optimizing cognitive endurance. Access the Directorate's protocols on physical conditioning, legal supplementation, and tournament nutrition.
          </p>
          <span className="text-sm font-bold uppercase tracking-widest text-federation-ivory/60 group-hover:text-federation-ivory transition-colors">
            Access Guidelines &rarr;
          </span>
        </Link>

      </section>
    </div>
  );
}
