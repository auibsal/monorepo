import Link from 'next/link';

export default function HandbookBoycottsPage() {
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
              <h1 className="text-xl font-bold uppercase tracking-widest leading-none">International</h1>
              <h1 className="text-xl font-bold uppercase tracking-widest text-federation-ivory/70 leading-none">Dominoes Federation</h1>
            </div>
          </div>
          <nav className="hidden md:flex gap-8 text-sm font-bold uppercase tracking-widest text-federation-ivory/60">
            <Link href="/news" className="hover:text-federation-ivory transition-colors">News</Link>
            <Link href="/ratings" className="hover:text-federation-ivory transition-colors">Ratings</Link>
            <Link href="/handbook" className="text-federation-ivory border-b-2 border-red-500 pb-1">Handbook</Link>
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
              <Link href="/handbook/01-boycotts" className="text-red-400 font-bold flex items-center gap-3">
                <span>01.</span> Boycotts & Ethics
              </Link>
            </li>
            <li>
              <Link href="/handbook/02-resolutions" className="hover:text-federation-ivory transition-colors flex items-center gap-3">
                <span>02.</span> Resolutions
              </Link>
            </li>
            <li>
              <Link href="/handbook/03-engine" className="hover:text-federation-ivory transition-colors flex items-center gap-3">
                <span>03.</span> Engine Mathematics
              </Link>
            </li>
            <li>
              <Link href="/handbook/04-arbiters" className="hover:text-federation-ivory transition-colors flex items-center gap-3">
                <span>04.</span> Arbiter Certification
              </Link>
            </li>
          </ul>
        </aside>

        {/* Official Document Content */}
        <article className="flex-1 max-w-3xl">
          <div className="mb-12">
            <p className="text-red-500 font-mono text-sm mb-4">Handbook / 01. Boycotts</p>
            <h1 className="text-5xl font-bold uppercase tracking-tight mb-6">Boycotts & Moral Principles</h1>
            <div className="flex gap-4 text-xs font-mono opacity-50 border-y border-federation-ivory/10 py-3">
              <span>Approved by the inaugural Congress.</span>
              <span>•</span>
              <span>Document Ref: IDF-HB-01</span>
            </div>
          </div>

          <div className="prose prose-invert prose-p:text-federation-ivory/80 prose-li:text-federation-ivory/80 max-w-none">
            
            <h2 className="text-2xl font-bold uppercase tracking-widest border-l-4 border-red-500 pl-4 mb-6">
              Moral Principles of the IDF for Competitions
            </h2>
            
            <div className="space-y-8 pl-4">
              {/* Principle 1 */}
              <div>
                <p className="font-bold text-lg mb-4 flex gap-4">
                  <span className="text-red-500 font-mono">1.</span>
                  The organizers and the athletes must be guided by the highest principles of the Federation's Statutes[span_0](end_span):
                </p>
                <ol className="list-decimal list-outside ml-12 space-y-4 opacity-90 font-serif text-lg leading-relaxed marker:text-federation-ivory/40">
                  <li>The IDF is concerned exclusively with dominoes activities.</li>
                  <li>The IDF rejects discriminatory treatment for national, political, racial, social or religious reasons or on account of sex.</li>
                  <li>The IDF observes a strict neutrality in the internal affairs of the national and provincial dominoes federations.</li>
                </ol>
              </div>

              {/* Principle 2 */}
              <div className="flex gap-4">
                <span className="text-red-500 font-mono font-bold text-lg">2.</span>
                <p className="font-serif text-lg leading-relaxed opacity-90">
                  In accord with its Statutes, the IDF reaffirms its commitment to the right to play dominoes and opposes all organized actions that would hinder that right.
                </p>
              </div>

              {/* Principle 3 */}
              <div>
                <p className="font-bold text-lg mb-4 flex gap-4">
                  <span className="text-red-500 font-mono">3.</span>
                  It is mathematically and ethically understood that:
                </p>
                <ol className="list-decimal list-outside ml-12 space-y-4 opacity-90 font-serif text-lg leading-relaxed marker:text-federation-ivory/40">
                  <li>
                    An organizer of a dominoes competition has the right to invite any player he chooses. Once an invitation has been issued and accepted, it must not be withdrawn.
                  </li>
                  <li>
                    Each player accepts an invitation only on his own free will but in strict accordance with the statutes and resolutions accepted by the IDF.
                  </li>
                </ol>
              </div>
            </div>

          </div>
        </article>

      </main>
    </div>
  );
}
