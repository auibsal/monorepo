import Link from 'next/link';
import { Map, History, Coffee, AlertTriangle, ScrollText } from 'lucide-react';

export default function HandbookVariationsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white/90 font-sans selection:bg-red-500/30">
      
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
            <li>
              <Link href="/handbook/06-variations" className="text-red-400 font-bold flex items-center gap-3">
                <span>06.</span> Heritage Variations
              </Link>
            </li>
          </ul>
        </aside>

        {/* Official Document Content */}
        <article className="flex-1 max-w-4xl">
          <div className="mb-12">
            <p className="text-red-500 font-mono text-sm mb-4 uppercase tracking-widest">Handbook / 06. Heritage Variations</p>
            <h1 className="text-5xl font-bold uppercase tracking-tight mb-6">Archive of Regional Variations</h1>
            <p className="text-lg opacity-80 font-serif leading-relaxed">
              The Chaykhanas (traditional cafes) of Iraq have cultivated a rich tapestry of rule sets over generations. While the IDA enforces a strict mathematical standard for rated tournaments, this archive documents the most prominent regional and cultural formats. These rules are available for selection in unrated custom lobbies.
            </p>
          </div>

          <div className="space-y-16">
            
            {/* CATEGORY 1: OPENING PROTOCOLS */}
            <section>
              <div className="flex items-center gap-4 border-b border-white/20 pb-4 mb-8">
                <ScrollText className="text-red-500" size={28} />
                <h2 className="text-3xl font-bold uppercase tracking-widest">I. Opening Protocols (Al-Bidayah)</h2>
              </div>
              
              <div className="grid gap-6">
                <div className="bg-white/5 border border-white/10 p-6 rounded-sm">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-bold uppercase tracking-widest">The Victor's Privilege</h3>
                    <span className="text-xs font-mono bg-white/10 px-3 py-1 rounded-full text-white/60">Common in Baghdad</span>
                  </div>
                  <p className="opacity-80 font-serif mb-4 text-sm leading-relaxed">
                    Unlike the IDA Standard where the absolute highest double drawn opens the game, this variation dictates that the winning team of the previous round earns the right to play the first tile of the next round. Furthermore, the opening player is not restricted to a double; they may open with any tile in their hand.
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 p-6 rounded-sm">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-bold uppercase tracking-widest">The Ascending Double (Al-Dosh)</h3>
                    <span className="text-xs font-mono bg-white/10 px-3 py-1 rounded-full text-white/60">Southern Variant</span>
                  </div>
                  <p className="opacity-80 font-serif mb-4 text-sm leading-relaxed">
                    If no player holds the 6-6, the requirement to open drops to the 5-5, then 4-4, and so on. If no doubles exist in any hand, the hands are washed (shuffled). The IDA Standard strictly requires the 6-6 for the opening of the very first match of a series, but allows ascending doubles for subsequent rounds.
                  </p>
                </div>
              </div>
            </section>

            {/* CATEGORY 2: THE LOCK (QUFIL) */}
            <section>
              <div className="flex items-center gap-4 border-b border-white/20 pb-4 mb-8">
                <AlertTriangle className="text-red-500" size={28} />
                <h2 className="text-3xl font-bold uppercase tracking-widest">II. The Lock Mechanics (Qufil)</h2>
              </div>
              
              <div className="grid gap-6">
                <div className="bg-white/5 border border-white/10 p-6 border-l-4 border-l-red-500">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-bold uppercase tracking-widest">The Locker's Penalty</h3>
                    <span className="text-xs font-mono bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded-full">High Stakes</span>
                  </div>
                  <p className="opacity-80 font-serif text-sm leading-relaxed">
                    When a player intentionally plays a tile that locks the board (making it impossible for anyone to play), the remaining pips in all hands are counted. If the team that locked the board has a *higher* or *equal* pip count to the opposing team, the locker's team suffers an immediate, amplified loss (often double the standard points) for executing a failed trap.
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-bold uppercase tracking-widest">The Draw (At-Ta'adul)</h3>
                    <span className="text-xs font-mono bg-white/10 px-3 py-1 rounded-full text-white/60">Classic Cafe Rule</span>
                  </div>
                  <p className="opacity-80 font-serif text-sm leading-relaxed">
                    In the event of a board lock where both teams hold the exact same pip count in their unplayed hands, the round is declared a void. No points are awarded to either team, and the player who originally opened the locked round retains the right to open the re-match.
                  </p>
                </div>
              </div>
            </section>

            {/* CATEGORY 3: SCORING MATRICES */}
            <section>
              <div className="flex items-center gap-4 border-b border-white/20 pb-4 mb-8">
                <Map className="text-red-500" size={28} />
                <h2 className="text-3xl font-bold uppercase tracking-widest">III. Traditional Scoring Systems</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-black border border-white/10 p-6 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <h3 className="text-xl font-bold uppercase tracking-widest mb-4">The 101 Threshold</h3>
                  <p className="opacity-70 text-sm font-serif leading-relaxed">
                    Instead of playing "Best of 7" rounds, teams accumulate the pip count of the losing team's remaining tiles. The first team to force their opponents to accumulate 101 points wins the match. This deeply alters endgame strategy, as players will actively try to strand their opponents with high-value tiles (like the 6-6) before dominating.
                  </p>
                </div>

                <div className="bg-black border border-white/10 p-6 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <h3 className="text-xl font-bold uppercase tracking-widest mb-4">The Skunk (Ghasil)</h3>
                  <p className="opacity-70 text-sm font-serif leading-relaxed">
                    If a team wins a series (e.g., 7 consecutive rounds) without the opposing team securing a single round, it is considered a "Wash" or "Skunk." In heritage play, this often comes with severe social bragging rights and requires the losing team to cover the cafe tab.
                  </p>
                </div>
              </div>
            </section>

            {/* CATEGORY 4: CHAYKHANA ETIQUETTE */}
            <section>
              <div className="flex items-center gap-4 border-b border-white/20 pb-4 mb-8 mt-12">
                <Coffee className="text-white/50" size={28} />
                <h2 className="text-3xl font-bold uppercase tracking-widest text-white/70">IV. Unsanctioned Etiquette (Table Talk)</h2>
              </div>
              
              <div className="bg-white/5 border border-white/10 p-8 rounded-sm">
                <p className="opacity-80 font-serif mb-8 max-w-3xl leading-relaxed">
                  The IDA strictly forbids communication in rated play. However, in heritage formats, psychological warfare is an integral mechanic of the game. The following actions, while penalized in tournaments, are customary in casual environments:
                </p>

                <ul className="space-y-6">
                  <li className="flex gap-4">
                    <span className="text-red-500 font-bold font-mono">01.</span>
                    <div>
                      <h4 className="font-bold text-lg mb-1 uppercase tracking-widest">The Slam (Darba)</h4>
                      <p className="opacity-60 text-sm font-serif leading-relaxed">
                        Emphatically slamming a tile onto the table to intimidate opponents or signal absolute confidence to a partner.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="text-red-500 font-bold font-mono">02.</span>
                    <div>
                      <h4 className="font-bold text-lg mb-1 uppercase tracking-widest">Baiting the Pass</h4>
                      <p className="opacity-60 text-sm font-serif leading-relaxed">
                        Verbally taunting an opponent when they are forced to pass (knock), specifically calling out the suit they are void in to ensure the partner capitalizes on the weakness.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="text-red-500 font-bold font-mono">03.</span>
                    <div>
                      <h4 className="font-bold text-lg mb-1 uppercase tracking-widest">The Silent Read</h4>
                      <p className="opacity-60 text-sm font-serif leading-relaxed">
                        Reading a partner's hesitation. In unrated play, if a player takes a long time to play but has obvious options, it is often a permitted (though debated) signal to the partner about the composition of their hand.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </section>

          </div>
        </article>

      </main>
    </div>
  );
}
