
import Link from 'next/link';

export default function HandbookResolutionsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-federation-ivory font-sans selection:bg-red-500/30">
      
      {/* Official Header */}
      <header className="border-b border-federation-ivory/10 bg-black sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-federation-ivory text-black flex items-center justify-center font-bold text-2xl uppercase tracking-tighter">
              IDF
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
              <Link href="/handbook/02-resolutions" className="text-red-400 font-bold flex items-center gap-3">
                <span>02.</span> Resolutions
              </Link>
            </li>
            <li>
              <Link href="/handbook/03-engine" className="hover:text-white transition-colors flex items-center gap-3">
                <span>03.</span> Engine Mathematics
              </Link>
            </li>
          </ul>
        </aside>

        {/* Official Document Content */}
        <article className="flex-1 max-w-3xl">
          <div className="mb-12">
            <p className="text-red-500 font-mono text-sm mb-4 uppercase tracking-widest">Handbook / 02. Resolutions</p>
            <h1 className="text-5xl font-bold uppercase tracking-tight mb-6">Administrative Resolutions</h1>
            <div className="flex gap-4 text-xs font-mono opacity-50 border-y border-federation-ivory/10 py-3">
              <span>Latest Amendment: 2026 Congress</span>
              <span>•</span>
              <span>Document Ref: IDF-RES-02</span>
            </div>
          </div>

          <div className="prose prose-invert max-w-none">
            
            <h2 className="text-2xl font-bold uppercase tracking-widest border-l-4 border-red-500 pl-4 mb-8">
              Arrears in Payment & Compliance
            </h2>
            
            <div className="space-y-12">
              
              {/* Section 1: Olympiad Eligibility */}
              <section className="bg-white/5 p-6 border border-white/10 rounded-sm">
                <h3 className="text-red-500 font-mono text-xs uppercase mb-4 tracking-[0.2em]">Resolution: Tournament Standing</h3>
                <p className="font-serif text-lg leading-relaxed italic opacity-90 mb-4">
                  [span_2](start_span)"The General Assembly agrees that provincial chapters or clubs that have not fulfilled their financial dues before the Grand Iraqi Dominoes Olympiads shall be temporarily excluded."[span_2](end_span)
                </p>
                <p className="text-sm opacity-60">
                  [span_3](start_span)Exceptions may only be granted if the President is satisfied with the reasons provided for the delay.[span_3](end_span)
                </p>
              </section>

              {/* Section 2: Discretionary Action */}
              <section className="pl-4 border-l border-white/20">
                <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Executive Discretion</h3>
                <p className="font-serif text-lg leading-relaxed opacity-80">
                  [span_4](start_span)Final administrative action regarding outstanding debts lies solely with the President.[span_4](end_span) [span_5](start_span)To maintain eligibility for sanctioned events, all liabilities must be settled no later than three months prior to the biennial Championships.[span_5](end_span)
                </p>
              </section>

              {/* Section 3: Escalation of Penalties */}
              <section>
                <h3 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                   Protocol of Escalation
                </h3>
                <div className="space-y-6">
                  {/* Step 1 */}
                  <div className="flex gap-6">
                    <div className="w-12 h-12 rounded-full border border-red-500 flex items-center justify-center font-mono text-red-500 flex-shrink-0">01</div>
                    <div>
                      <p className="font-bold text-lg mb-1">One Year in Arrears</p>
                      <p className="opacity-70 leading-relaxed italic">
                        [span_6](start_span)The entity shall not receive data services from the Secretariat, shall not bid for sanctioned events, and shall lose access to the Global Rating Engine.[span_6](end_span)
                      </p>
                    </div>
                  </div>
                  {/* Step 2 */}
                  <div className="flex gap-6">
                    <div className="w-12 h-12 rounded-full border border-red-500 bg-red-500 flex items-center justify-center font-mono text-black font-bold flex-shrink-0">02</div>
                    <div>
                      <p className="font-bold text-lg mb-1">Two Years in Arrears</p>
                      <p className="opacity-70 leading-relaxed italic">
                        [span_7](start_span)The federation or club shall be subject to temporary exclusion and removal from the IDF Registry.[span_7](end_span)
                      </p>
                    </div>
                  </div>
                </div>
              </section>

            </div>

          </div>
        </article>

      </main>
    </div>
  );
}
