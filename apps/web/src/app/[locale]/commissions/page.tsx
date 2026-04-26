import { Link } from '@/i18n/routing';
import { Users, Cpu, ShieldCheck, BookOpen, Gavel } from 'lucide-react';

export default function HandbookCommissionsPage() {
  return (
    <div className="min-h-screen bg-association-white text-association-black font-sans selection:bg-red-500/30">
      
      {/* Official Header */}
      <header className="border-b border-white/10 bg-black sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white text-black flex items-center justify-center font-bold text-2xl uppercase tracking-tighter">
              IDA
            </div>
            <div>
              <h1 className="text-xl font-bold uppercase tracking-widest leading-none text-white">Iraqi Dominoes</h1>
              <h1 className="text-xl font-bold uppercase tracking-widest text-white/70 leading-none">Association</h1>
            </div>
          </div>
          <nav className="hidden md:flex gap-8 text-sm font-bold uppercase tracking-widest text-white/60">
            <Link href="/news" className="hover:text-white transition-colors">News</Link>
            <Link href="/ratings" className="hover:text-white transition-colors">Ratings</Link>
            <Link href="/handbook" className="text-white border-b-2 border-red-500 pb-1">Handbook</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-16 flex flex-col md:flex-row gap-16">
        
        {/* Directory Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6 pb-4 border-b border-white/10">
            Contents / Handbook
          </h3>
          <ul className="space-y-4 text-sm font-mono opacity-80">
            <li><Link href="/handbook/01-boycotts" className="hover:text-white transition-colors"><span>01.</span> Boycotts & Ethics</Link></li>
            <li><Link href="/handbook/02-resolutions" className="hover:text-white transition-colors"><span>02.</span> Resolutions</Link></li>
            <li><Link href="/handbook/03-engine" className="hover:text-white transition-colors"><span>03.</span> Engine Mathematics</Link></li>
            <li><Link href="/handbook/04-arbiters" className="hover:text-white transition-colors"><span>04.</span> Arbiters</Link></li>
            <li><Link href="/handbook/05-laws" className="hover:text-white transition-colors"><span>05.</span> Laws of the IDA</Link></li>
            <li><Link href="/handbook/06-variations" className="hover:text-white transition-colors"><span>06.</span> Heritage Variations</Link></li>
            <li>
              <Link href="/handbook/07-commissions" className="text-red-400 font-bold flex items-center gap-3">
                <span>07.</span> Non-Elected Commissions
              </Link>
            </li>
          </ul>
        </aside>

        {/* Official Document Content */}
        <article className="flex-1 max-w-4xl">
          <div className="mb-12">
            <p className="text-red-500 font-mono text-sm mb-4 uppercase tracking-widest">Handbook / 07. Non-Elected Commissions</p>
            <h1 className="text-5xl font-bold uppercase tracking-tight mb-6">Non-Elected Commissions</h1>
            <div className="flex gap-4 text-xs font-mono opacity-50 border-y border-white/10 py-3">
              <span>Effective Date: 2026 Congress</span>
              <span>•</span>
              <span>Document Ref: IDA-COM-07</span>
            </div>
          </div>

          <div className="space-y-16">
            
            {/* PREAMBLE & GENERAL REGULATIONS */}
            <section className="prose  max-w-none">
              <p className="text-lg font-serif leading-relaxed opacity-90 border-l-2 border-white/20 pl-6">
                While the Presidential Board and General Assembly are elected bodies representing the provincial chapters, the IDA requires specialized, merit-based commissions to manage the technical, ethical, and mathematical complexities of the sport. Non-Elected Commission members are appointed directly by the President based on expertise and serve concurrent terms.
              </p>
            </section>

            {/* COMMISSION 1: SYSTEMS & TECHNICAL */}
            <section>
              <div className="flex items-center gap-4 border-b border-white/20 pb-4 mb-8">
                <Cpu className="text-red-500" size={28} />
                <h2 className="text-2xl font-bold uppercase tracking-widest">1. Systems & Technical Commission (STC)</h2>
              </div>
              
              <div className="bg-white/5 border border-white/10 p-6 rounded-sm">
                <h3 className="text-sm font-bold uppercase tracking-widest mb-4 opacity-60">Mandate & Responsibilities</h3>
                <p className="opacity-80 font-serif mb-6 leading-relaxed">
                  The STC is the architectural guardian of the Association's digital ecosystem. It is solely responsible for maintaining the integrity, speed, and real-time synchronization of the competitive arenas.
                </p>
                <ul className="space-y-3 font-mono text-sm opacity-70 list-none pl-0">
                  <li className="flex items-start gap-3">
                    <span className="text-red-500">▶</span>
                    Maintenance and continuous training of the IS-MCTS WebAssembly Engine.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500">▶</span>
                    Oversight of the Supabase real-time broadcast channels during multiplayer tournaments.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500">▶</span>
                    Deployment and stability of the Next.js frontend rendering for the public Superapp interfaces.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500">▶</span>
                    Liaising with corporate partners, specifically The IDEA IQ Inc., for server infrastructure provisioning.
                  </li>
                </ul>
              </div>
            </section>

            {/* COMMISSION 2: FAIR PLAY & ETHICS */}
            <section>
              <div className="flex items-center gap-4 border-b border-white/20 pb-4 mb-8">
                <ShieldCheck className="text-red-500" size={28} />
                <h2 className="text-2xl font-bold uppercase tracking-widest">2. Fair Play Commission (FPC)</h2>
              </div>
              
              <div className="bg-white/5 border border-white/10 p-6 rounded-sm">
                <h3 className="text-sm font-bold uppercase tracking-widest mb-4 opacity-60">Mandate & Responsibilities</h3>
                <p className="opacity-80 font-serif mb-6 leading-relaxed">
                  The Fair Play Commission is the investigative arm of the IDA. It analyzes statistical anomalies in player performance to detect collusion, engine-assisted play, or purposeful match-fixing in rated events.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-white/10 pt-6">
                  <div>
                    <h4 className="font-bold text-sm uppercase tracking-widest mb-2 text-red-400">Digital Auditing</h4>
                    <p className="text-xs font-serif opacity-70 leading-relaxed">
                      Cross-referencing DPN match logs with the Oracle Engine to identify players whose move accuracy exceeds a 98% correlation with the PyTorch neural network over sustained periods.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm uppercase tracking-widest mb-2 text-red-400">Tribunal Authority</h4>
                    <p className="text-xs font-serif opacity-70 leading-relaxed">
                      Possesses the unilateral authority to temporarily suspend accounts pending investigation, strip Elo points, and issue lifetime bans from the physical and digital arenas.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* COMMISSION 3: ARBITERS' COUNCIL */}
            <section>
              <div className="flex items-center gap-4 border-b border-white/20 pb-4 mb-8">
                <Gavel className="text-white/50" size={28} />
                <h2 className="text-2xl font-bold uppercase tracking-widest text-white/90">3. Arbiters' Council (AC)</h2>
              </div>
              
              <div className="bg-black border border-white/10 p-6 rounded-sm">
                <p className="opacity-80 font-serif mb-6 leading-relaxed">
                  Tasked with the rigorous education, examination, and licensing of all Provincial, National, and International Arbiters. The AC updates the Arbiter's Manual annually to reflect newly observed cafe tactics or edge-case board locks.
                </p>
                <div className="flex items-center justify-between text-xs font-mono opacity-50 bg-white/5 p-4">
                  <span>Current Roster: 12 Certified International Arbiters</span>
                  <Link href="/handbook/04-arbiters" className="hover:text-red-400 transition-colors">View Certification Protocol →</Link>
                </div>
              </div>
            </section>

            {/* COMMISSION 4: HERITAGE & ARCHIVES */}
            <section>
              <div className="flex items-center gap-4 border-b border-white/20 pb-4 mb-8">
                <BookOpen className="text-white/50" size={28} />
                <h2 className="text-2xl font-bold uppercase tracking-widest text-white/90">4. Heritage & Archives Commission (HAC)</h2>
              </div>
              
              <div className="bg-black border border-white/10 p-6 rounded-sm">
                <p className="opacity-80 font-serif leading-relaxed mb-4">
                  A cultural body dedicated to researching and documenting regional rule variations, historical cafe tournaments, and the etymology of dominoes terminology across Iraq. The HAC maintains the official dictionary of terms (e.g., "Wash", "Skunk", "The Lock") and curates the unsanctioned rule sets available in casual digital lobbies.
                </p>
              </div>
            </section>

          </div>
        </article>

      </main>
    </div>
  );
}
