import Link from 'next/link';

export default function ArbiterProgram() {
  return (
    <div className="max-w-5xl mx-auto py-16 px-6 lg:px-12 w-full">
      <header className="mb-16">
        <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-tight mb-4">
          The Arbiter Certification
        </h1>
        <p className="text-xl font-light opacity-80">
          Uphold the standard. Enforce the rules. Protect the algorithm.
        </p>
      </header>

      <div className="space-y-12 border-l border-federation-ivory/20 pl-8">
        <div>
          <h2 className="text-2xl font-bold uppercase mb-2">Tier 1: Local Arbiter</h2>
          <p className="font-light opacity-70 mb-4 max-w-3xl">
            Certified to officiate club-level matches and input live scores into the IDF database. Requires passing the Master Dossier written exam.
          </p>
        </div>
        
        <div>
          <h2 className="text-2xl font-bold uppercase mb-2">Tier 2: National Arbiter</h2>
          <p className="font-light opacity-70 mb-4 max-w-3xl">
            Authorized to oversee Regional Qualifiers and National Championships. Possesses the authority to issue disqualifications and arbitrate highly disputed technical fouls. Requires 50 hours of active local arbitration and a live technical review.
          </p>
        </div>
      </div>

      <div className="mt-16 bg-federation-ivory text-federation-obsidian p-8 rounded-sm">
        <h3 className="text-2xl font-bold uppercase mb-4">Begin Your Certification</h3>
        <p className="font-medium mb-6 max-w-2xl">
          Download the Official Rulebook, study the technical foul guidelines, and register to take the online Arbiter Entrance Examination.
        </p>
        <Link 
          href="/arbiters/exam" 
          className="px-6 py-3 border-2 border-federation-obsidian font-bold uppercase tracking-wider hover:bg-federation-obsidian hover:text-federation-ivory transition-colors inline-block"
        >
          Access Examination Portal
        </Link>
      </div>
    </div>
  );
}
