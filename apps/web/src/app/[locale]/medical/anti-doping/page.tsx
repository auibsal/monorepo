'use client';

import { Link } from '@/i18n/routing';

export default function AntiDopingPage() {
  return (
    <div className="max-w-5xl mx-auto py-24 px-6 lg:px-12 w-full">
      <Link href="/medical" className="text-xs font-bold uppercase tracking-widest text-federation-ivory/50 hover:text-federation-ivory transition-colors mb-8 inline-block">
        &larr; Medical Directorate
      </Link>
      
      <header className="mb-16">
        <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-tight mb-4 border-l-4 border-red-600 pl-6">
          Anti-Doping Policy
        </h1>
        <p className="text-lg font-light opacity-80 pl-7 max-w-3xl leading-relaxed">
          In accordance with Article 37 of the IDA Supreme Charter, the Federation unconditionally adopts the World Anti-Doping Agency (WADA) Code. Mental sports are highly susceptible to cognitive-enhancing pharmacology; we enforce a strict zero-tolerance policy.
        </p>
      </header>

      <div className="space-y-16 pl-0 sm:pl-7">
        
        {/* Prohibited Substances */}
        <section>
          <h2 className="text-2xl font-bold uppercase tracking-wide mb-6 text-red-500">Prohibited Substances (Cognitive Enhancers)</h2>
          <div className="bg-federation-ivory/5 border border-federation-ivory/10 p-8 rounded-sm">
            <p className="font-light opacity-80 mb-6 leading-relaxed">
              While anabolic steroids are rarely a factor in dominoes, nootropics and prescription stimulants are strictly regulated. The following classes of substances are banned in-competition:
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <li className="flex items-center gap-3 font-mono text-sm opacity-80"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Amphetamines (Adderall, Vyvanse)</li>
              <li className="flex items-center gap-3 font-mono text-sm opacity-80"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Methylphenidate (Ritalin)</li>
              <li className="flex items-center gap-3 font-mono text-sm opacity-80"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Modafinil & Armodafinil</li>
              <li className="flex items-center gap-3 font-mono text-sm opacity-80"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Specified Beta-Blockers</li>
            </ul>
          </div>
        </section>

        {/* TUE Process */}
        <section>
          <h2 className="text-2xl font-bold uppercase tracking-wide mb-6">Therapeutic Use Exemptions (TUE)</h2>
          <p className="font-light opacity-80 mb-4 leading-relaxed">
            Players with a documented, legitimate medical condition (such as ADHD) requiring the use of a prohibited substance must apply for a TUE no less than 30 days prior to a sanctioned Tier 1 or Tier 2 event.
          </p>
          <div className="flex gap-4 mt-6">
            <a href="#" className="px-6 py-3 border border-federation-ivory/30 text-xs font-bold uppercase tracking-widest hover:bg-federation-ivory hover:text-federation-obsidian transition-colors rounded-sm">
              Download TUE Form [PDF]
            </a>
          </div>
        </section>

        {/* Testing Protocol */}
        <section>
          <h2 className="text-2xl font-bold uppercase tracking-wide mb-6">In-Competition Testing</h2>
          <p className="font-light opacity-80 leading-relaxed mb-4">
            The Medical Directorate reserves the right to conduct randomized urine and saliva testing during the National Championships and Regional Qualifiers. Refusal to submit to a requested test carries the exact same penalty as a positive result: immediate disqualification, nullification of ELO gains, and a multi-year ban from IDA sanctioned play.
          </p>
        </section>

      </div>
    </div>
  );
}
