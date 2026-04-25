import { Link } from '@/i18n/routing';

export default function HandbookArbitersPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-federation-ivory font-sans selection:bg-red-500/30">
      
      {/* Official Header */}
      <header className="border-b border-federation-ivory/10 bg-black sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-federation-ivory text-black flex items-center justify-center font-bold text-2xl uppercase tracking-tighter">
              IDA
            </div>
            <div>
              <h1 className="text-xl font-bold uppercase tracking-widest leading-none text-white">International</h1>
              <h1 className="text-xl font-bold uppercase tracking-widest text-federation-ivory/70 leading-none">Dominoes Federation</h1>
            </div>
          </div>
          <nav className="hidden md:flex gap-8 text-sm font-bold uppercase tracking-widest text-federation-ivory/60">
            <Link href="/news" className="hover:text-white transition-colors">News</Link>
            <Link href="/ratings" className="hover:text-white transition-colors">Ratings</Link>
            <Link href="/handbook" className="text-white border-b-2 border-red-500 pb-1">Handbook</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-16 flex flex-col md:flex-row gap-16">
        
        {/* Directory Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <h3 className="text-xs font-bold uppercase tracking-widest text-federation-ivory/40 mb-6 pb-4 border-b border-federation-ivory/10">
            Contents / Handbook
          </h3>
          <ul className="space-y-4 text-sm font-mono opacity-80">
            <li>
              <Link href="/handbook/01-boycotts" className="hover:text-white transition-colors flex items-center gap-3">
                <span>01.</span> Boycotts & Ethics
              </Link>
            </li>
            <li>
              <Link href="/handbook/02-resolutions" className="hover:text-white transition-colors flex items-center gap-3">
                <span>02.</span> Resolutions
              </Link>
            </li>
            <li>
              <Link href="/handbook/03-engine" className="hover:text-white transition-colors flex items-center gap-3">
                <span>03.</span> Engine Mathematics
              </Link>
            </li>
            <li>
              <Link href="/handbook/04-arbiters" className="text-red-400 font-bold flex items-center gap-3">
                <span>04.</span> Arbiter Certification
              </Link>
            </li>
          </ul>
        </aside>

        {/* Official Document Content */}
        <article className="flex-1 max-w-4xl">
          <div className="mb-12">
            <p className="text-red-500 font-mono text-sm mb-4 uppercase tracking-widest">Handbook / 04. Arbiters</p>
            <h1 className="text-5xl font-bold uppercase tracking-tight mb-6">Arbiter's Manual & Certification</h1>
            <div className="flex gap-4 text-xs font-mono opacity-50 border-y border-federation-ivory/10 py-3">
              <span>Valid from: April 2026</span>
              <span>•</span>
              <span>Document Ref: IDA-ARB-MANUAL-26</span>
            </div>
          </div>

          <div className="space-y-16">
            
            {/* PREAMBLE */}
            <section className="prose prose-invert max-w-none">
              <p className="text-xl font-serif leading-relaxed opacity-90 border-l-2 border-federation-ivory/20 pl-6">
                The Arbiter is the absolute authority in the playing hall. Their role extends beyond the mere observation of dominoes being placed on the table; they are the custodians of mathematical fairness, the neutral enforcers of the clock, and the sole administrators of the Oracle DPN match logs. An Arbiter must exhibit flawless objectivity, zero tolerance for unsanctioned communication, and a complete mastery of the Federation's digital architecture.
              </p>
            </section>

            {/* PART 1: CLASSIFICATION OF TITLES */}
            <section>
              <h2 className="text-2xl font-bold uppercase tracking-widest border-b border-red-500/50 pb-4 mb-8">
                Part I: Classification of Titles
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 p-8 border border-white/10 relative overflow-hidden group hover:border-red-500/50 transition-colors">
                  <div className="absolute top-0 right-0 bg-white/10 px-3 py-1 font-mono text-xs">Level 1</div>
                  <h3 className="text-xl font-bold uppercase tracking-widest mb-4">Provincial Arbiter (PA)</h3>
                  <p className="opacity-70 text-sm leading-relaxed mb-4">
                    Authorized to officiate club-level matches, regional qualifiers, and amateur tournaments. Must demonstrate proficiency in utilizing the IDA digital scoring tablet and basic conflict resolution.
                  </p>
                  <ul className="text-xs font-mono opacity-60 space-y-2 list-disc list-inside">
                    <li>Prerequisite: 18+ years of age.</li>
                    <li>Pass rate required on PA Exam: 80%.</li>
                    <li>License Fee: $50 USD / Biennially.</li>
                  </ul>
                </div>

                <div className="bg-white/5 p-8 border border-white/10 relative overflow-hidden group hover:border-red-500/50 transition-colors">
                  <div className="absolute top-0 right-0 bg-red-500/20 text-red-400 px-3 py-1 font-mono text-xs">Level 2</div>
                  <h3 className="text-xl font-bold uppercase tracking-widest mb-4">National Arbiter (NA)</h3>
                  <p className="opacity-70 text-sm leading-relaxed mb-4">
                    Authorized to officiate national championships and high-stakes rating tournaments. Capable of managing multi-table venues and resolving complex mathematical clock disputes.
                  </p>
                  <ul className="text-xs font-mono opacity-60 space-y-2 list-disc list-inside">
                    <li>Prerequisite: Minimum 2 years as active PA.</li>
                    <li>Required Norms: 3 National-level tournaments.</li>
                    <li>Mandatory Anti-Cheating Certification.</li>
                  </ul>
                </div>

                <div className="bg-red-900/10 p-8 border border-red-500/30 md:col-span-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-red-500 text-black font-bold px-3 py-1 font-mono text-xs">Level 3 (Highest)</div>
                  <h3 className="text-2xl font-bold uppercase tracking-widest mb-4 text-red-400">International Arbiter (IA)</h3>
                  <p className="opacity-80 text-sm leading-relaxed mb-4 max-w-2xl">
                    The highest officiating honor bestowed by the IDA. International Arbiters hold jurisdiction over Grand Olympiads, intercontinental championships, and World Title matches. They possess the authority to disqualify players, override engine disputes, and initiate ethics tribunals.
                  </p>
                  <div className="flex gap-8 border-t border-red-500/20 pt-4 mt-4">
                    <div className="text-xs font-mono opacity-70">
                      <span className="block text-red-400 mb-1">Requirements:</span>
                      • 4 NA Norms in international events.<br/>
                      • Fluency in Arabic and English.<br/>
                      • Approval by the IDA Presidential Board.
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* PART 2: DUTIES AND PROTOCOLS */}
            <section>
              <h2 className="text-2xl font-bold uppercase tracking-widest border-b border-red-500/50 pb-4 mb-8">
                Part II: Official Duties & Protocols
              </h2>
              
              <div className="space-y-8">
                {/* Protocol 1 */}
                <div className="pl-6 border-l-2 border-white/20">
                  <h3 className="text-lg font-bold uppercase tracking-widest mb-2">1. Pre-Match Verification (The Wash)</h3>
                  <p className="opacity-80 leading-relaxed font-serif text-lg mb-4">
                    Before the initiation of the digital clocks, the Arbiter must personally verify the presence and integrity of all 28 tiles. The Arbiter oversees the "Wash" (shuffling), ensuring hands remain flat, tiles are fully mixed, and no player isolates tiles or tracks specific bones. 
                  </p>
                </div>

                {/* Protocol 2 */}
                <div className="pl-6 border-l-2 border-white/20">
                  <h3 className="text-lg font-bold uppercase tracking-widest mb-2">2. Electronic DPN Log Management</h3>
                  <p className="opacity-80 leading-relaxed font-serif text-lg mb-4">
                    The Arbiter operates the official match tablet. As players execute their moves, the Arbiter ensures the digital state mirrors the physical table with zero latency. If the DPN (Dominoes Portable Notation) log deviates from reality due to an illegal play, the Arbiter must pause the clock, rollback the digital state, and apply penalties.
                  </p>
                </div>

                {/* Protocol 3 */}
                <div className="pl-6 border-l-2 border-white/20">
                  <h3 className="text-lg font-bold uppercase tracking-widest mb-2">3. Anti-Collusion Observation (2v2 Standard)</h3>
                  <p className="opacity-80 leading-relaxed font-serif text-lg mb-4">
                    In doubles play, information sharing is strictly mathematical. The Arbiter is trained to detect non-verbal cues: unnatural hesitation, specific tile tapping, coughs coordinated with passes, or deliberate eye contact. 
                    <span className="block mt-2 text-red-400 italic">
                      "Any suspected physical communication between partners must result in an immediate warning, followed by game forfeiture upon a second infraction."
                    </span>
                  </p>
                </div>
              </div>
            </section>

            {/* PART 3: INFRACTIONS & PENALTIES */}
            <section>
              <h2 className="text-2xl font-bold uppercase tracking-widest border-b border-red-500/50 pb-4 mb-8">
                Part III: Infractions & Penalty Matrices
              </h2>

              <div className="bg-black border border-white/10 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-xs font-mono uppercase tracking-widest text-federation-ivory/50">
                      <th className="p-4 w-1/3">Infraction Type</th>
                      <th className="p-4 w-1/3">Immediate Action</th>
                      <th className="p-4 w-1/3">Penalty</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-serif opacity-90 divide-y divide-white/5">
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold">The Exposed Tile</td>
                      <td className="p-4">Arbiter pauses the clock. Tile remains face up on the table.</td>
                      <td className="p-4 text-red-400">Tile must be played at the earliest legal opportunity.</td>
                    </tr>
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold">False Knock / Illegal Pass</td>
                      <td className="p-4">Arbiter verifies player's hand holds a playable tile.</td>
                      <td className="p-4 text-red-400">Opposing team awarded 15 penalty pips; player forced to play.</td>
                    </tr>
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold">Clock Flagging</td>
                      <td className="p-4">Timer expires before tile connects to the chain.</td>
                      <td className="p-4 text-red-400">Immediate forfeiture of the current hand.</td>
                    </tr>
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold">Verbal Interference</td>
                      <td className="p-4">Player comments on the state of the board or remaining tiles.</td>
                      <td className="p-4 text-red-400">Yellow Card warning. Second offense = Match disqualification.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* CALL TO ACTION */}
            <section className="mt-16 text-center border-t border-white/10 pt-12">
              <h3 className="text-2xl font-bold uppercase tracking-widest mb-4">Begin Your Certification</h3>
              <p className="opacity-60 max-w-lg mx-auto mb-8">
                Aspiring arbiters must create an IDA account and pass the online preliminary examinations to register for the next provincial seminar.
              </p>
              <button className="bg-federation-ivory text-black font-bold uppercase tracking-widest px-8 py-4 hover:bg-white transition-colors text-sm">
                Access Training Portal
              </button>
            </section>

          </div>
        </article>

      </main>
    </div>
  );
}
