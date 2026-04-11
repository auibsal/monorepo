import Link from 'next/link';

export default function MasterRulebookPage() {
  return (
    <div className="max-w-5xl mx-auto py-16 px-6 sm:px-8 lg:px-12 w-full">
      
      {/* Navigation */}
      <nav className="mb-16">
        <Link 
          href="/" 
          className="text-sm font-medium uppercase tracking-wider text-federation-ivory/60 hover:text-federation-ivory transition-colors flex items-center gap-2"
        >
          <span>&larr;</span> Return to Headquarters
        </Link>
      </nav>

      {/* Dossier Header */}
      <header className="mb-16 border-b-2 border-federation-ivory/30 pb-12">
        <h2 
          className="text-xl md:text-2xl font-medium tracking-wide mb-4 opacity-80 text-federation-ivory" 
          style={{ fontFamily: 'var(--font-ibm-plex-arabic)' }}
        >
          اللائحة الفنية وقواعد اللعب الرسمية
        </h2>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight uppercase leading-none mb-6">
          Official Rulebook &<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-federation-ivory to-gray-500">
            Technical Standards
          </span>
        </h1>
        
        <div className="flex gap-4 mb-8 text-sm uppercase tracking-widest font-semibold opacity-60">
          <span>Edition 1.0</span>
          <span>&bull;</span>
          <span>Master Institutional Dossier</span>
        </div>

        <div className="bg-federation-ivory/5 border border-federation-ivory/10 p-6 sm:p-8 rounded-sm">
          <h3 className="text-lg font-semibold uppercase tracking-wide mb-3">Preamble</h3>
          <p className="font-light opacity-80 leading-relaxed">
            This document serves as the supreme regulatory framework for the Iraqi Dominoes Federation (IDF). The rules codified herein apply to all ranked matches, regional qualifiers, and national championships operating under the IDF mandate. By registering for an official Federation ID, all players, arbiters, and affiliate clubs consent unconditionally to the statutes of this rulebook. Ignorance of these articles shall not be recognized as a valid defense in arbitration.
          </p>
        </div>
      </header>

      {/* Main Dossier Content */}
      <article className="space-y-24">
        
        {/* CHAPTER I */}
        <section>
          <div className="mb-8">
            <p className="text-sm uppercase tracking-widest opacity-60 mb-1">Chapter I</p>
            <h2 className="text-3xl font-bold uppercase tracking-wide text-federation-ivory">
              Definitions and Jurisdiction
            </h2>
          </div>

          <div className="space-y-10 pl-0 sm:pl-6 border-l-0 sm:border-l border-federation-ivory/20">
            {/* Article 1 */}
            <div>
              <h3 className="text-xl font-semibold mb-4 opacity-90">Article 1: Nomenclature and Terminology</h3>
              <ul className="space-y-3 font-light opacity-80 leading-relaxed list-none">
                <li><strong className="font-semibold text-federation-ivory">The Federation:</strong> The Iraqi Dominoes Federation (IDF).</li>
                <li><strong className="font-semibold text-federation-ivory">Arbiter:</strong> An officially certified referee appointed by the IDF to oversee match integrity, resolve disputes, and input final data into the digital platform.</li>
                <li><strong className="font-semibold text-federation-ivory">Hand (Round):</strong> A single cycle of play beginning with the shuffle and ending when a player dominates or the board is locked.</li>
                <li><strong className="font-semibold text-federation-ivory">Match:</strong> A series of Hands played until one team reaches the established mathematical point threshold.</li>
                <li><strong className="font-semibold text-federation-ivory">Domination:</strong> The act of playing the final tile in one's hand, ending the Hand.</li>
                <li><strong className="font-semibold text-federation-ivory">Lock (Block):</strong> A state where both ends of the domino chain cannot be matched by any tile remaining in any player's possession.</li>
              </ul>
            </div>

            {/* Article 2 */}
            <div>
              <h3 className="text-xl font-semibold mb-4 opacity-90">Article 2: Authority of the Arbiter</h3>
              <div className="space-y-4 font-light opacity-80 leading-relaxed">
                <p><strong className="font-semibold text-federation-ivory">Section 2.01:</strong> The Arbiter is the absolute authority on the tournament floor.</p>
                <p><strong className="font-semibold text-federation-ivory">Section 2.02:</strong> Arbiters have the power to pause a match, issue formal warnings, deduct points, or instantly disqualify players for rule infractions.</p>
                <p><strong className="font-semibold text-federation-ivory">Section 2.03:</strong> Players may not argue with an Arbiter. Formal appeals can only be submitted to the Disciplinary Committee after the match concludes.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CHAPTER II */}
        <section>
          <div className="mb-8">
            <p className="text-sm uppercase tracking-widest opacity-60 mb-1">Chapter II</p>
            <h2 className="text-3xl font-bold uppercase tracking-wide text-federation-ivory">
              Equipment and Arena Standards
            </h2>
          </div>

          <div className="space-y-10 pl-0 sm:pl-6 border-l-0 sm:border-l border-federation-ivory/20">
            {/* Article 3 */}
            <div>
              <h3 className="text-xl font-semibold mb-4 opacity-90">Article 3: The Domino Tiles</h3>
              <div className="space-y-4 font-light opacity-80 leading-relaxed">
                <p><strong className="font-semibold text-federation-ivory">Section 3.01 - Composition:</strong> A standard sanctioned set consists of twenty-eight (28) "Double-Six" tiles.</p>
                <p><strong className="font-semibold text-federation-ivory">Section 3.02 - Materiality:</strong> Tiles must be constructed of high-density urea, acrylic, or traditional bone. Wood and lightweight plastics are prohibited in Tier 1 and Tier 2 events.</p>
                <p><strong className="font-semibold text-federation-ivory">Section 3.03 - Uniformity:</strong> The backs of all 28 tiles must be identical, devoid of scratches, discolorations, or manufacturing defects that could act as identifying marks.</p>
                <p><strong className="font-semibold text-federation-ivory">Section 3.04 - The Spinner:</strong> All tiles must feature a central brass or steel spinner (pin) to facilitate randomized shuffling and protect the face of the tile.</p>
              </div>
            </div>

            {/* Article 4 */}
            <div>
              <h3 className="text-xl font-semibold mb-4 opacity-90">Article 4: The Playing Arena</h3>
              <div className="space-y-4 font-light opacity-80 leading-relaxed">
                <p><strong className="font-semibold text-federation-ivory">Section 4.01 - Table Dimensions:</strong> Standard tournament tables must be square, measuring between 30 and 34 inches (76 to 86 cm) per side.</p>
                <p><strong className="font-semibold text-federation-ivory">Section 4.02 - Surface Material:</strong> The table must be covered in a seamless, non-reflective felt or neoprene mat to dampen sound and prevent tiles from sliding off the edge.</p>
                <p><strong className="font-semibold text-federation-ivory">Section 4.03 - Digital Terminals:</strong> Every official tournament table must be equipped with, or have immediate access to, a digital device logged into the IDF Rating Engine for instant score reporting.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CHAPTER III */}
        <section>
          <div className="mb-8">
            <p className="text-sm uppercase tracking-widest opacity-60 mb-1">Chapter III</p>
            <h2 className="text-3xl font-bold uppercase tracking-wide text-federation-ivory">
              Match Execution and Gameplay
            </h2>
          </div>

          <div className="space-y-10 pl-0 sm:pl-6 border-l-0 sm:border-l border-federation-ivory/20">
            {/* Article 5 & 6 */}
            <div>
              <h3 className="text-xl font-semibold mb-4 opacity-90">Article 5 & 6: Protocol and The Shuffle</h3>
              <div className="space-y-4 font-light opacity-80 leading-relaxed">
                <p><strong className="font-semibold text-federation-ivory">Section 5.01 - Seating:</strong> In Pairs format (2v2), teammates must sit directly opposite one another.</p>
                <p><strong className="font-semibold text-federation-ivory">Section 6.01 - Procedure:</strong> All 28 tiles are placed face down. One player is designated to shuffle using flat, circular motions with both hands.</p>
                <p><strong className="font-semibold text-federation-ivory">Section 6.03 - Accidental Exposure:</strong> If a tile is flipped face-up during the shuffle, the shuffle is immediately voided and must be completely restarted by the same player.</p>
              </div>
            </div>

            {/* Article 7 & 8 & 9 */}
            <div>
              <h3 className="text-xl font-semibold mb-4 opacity-90">Article 7, 8, & 9: The Draw and Active Play</h3>
              <div className="space-y-4 font-light opacity-80 leading-relaxed">
                <p><strong className="font-semibold text-federation-ivory">Section 7.01 - Allocation:</strong> Each player draws exactly seven (7) tiles. There is no boneyard (reserve).</p>
                <p><strong className="font-semibold text-federation-ivory">Section 8.01 - The Opening Hand:</strong> The very first hand of a Match is initiated by the player holding the Double-Six [6-6] tile. They must play this tile as the first move.</p>
                <p><strong className="font-semibold text-federation-ivory">Section 9.02 - Placement:</strong> A tile must be played by matching one of its ends to a corresponding open end on the board layout.</p>
                <p><strong className="font-semibold text-federation-ivory">Section 9.03 - Decisiveness:</strong> Once a player releases a tile onto the board, the move is final. Hovering or testing connections is prohibited.</p>
                <p><strong className="font-semibold text-federation-ivory">Section 9.04 - Passing:</strong> If a player possesses no playable tile, they must clearly state "Pass" or firmly tap the table twice.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CHAPTER IV */}
        <section>
          <div className="mb-8">
            <p className="text-sm uppercase tracking-widest opacity-60 mb-1">Chapter IV</p>
            <h2 className="text-3xl font-bold uppercase tracking-wide text-federation-ivory">
              Scoring and Match Resolution
            </h2>
          </div>

          <div className="space-y-10 pl-0 sm:pl-6 border-l-0 sm:border-l border-federation-ivory/20">
            <div>
              <h3 className="text-xl font-semibold mb-4 opacity-90">Article 10: Hand Resolution</h3>
              <div className="space-y-4 font-light opacity-80 leading-relaxed">
                <p><strong className="font-semibold text-federation-ivory">Section 10.02 - Scoring a Domination:</strong> The winning team is awarded points equal to the sum of all pips remaining on the tiles held by the opposing team.</p>
                <p><strong className="font-semibold text-federation-ivory">Section 10.04 - Scoring a Lock:</strong> All players expose their remaining tiles. The team with the lowest combined pip count wins. The winning team scores points equal to the combined pip count of the losing team.</p>
                <p><strong className="font-semibold text-federation-ivory">Section 10.05 - Tied Lock:</strong> If both teams hold an identical combined pip count, the Hand is voided. No points are awarded.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CHAPTER V */}
        <section>
          <div className="mb-8">
            <p className="text-sm uppercase tracking-widest opacity-60 mb-1">Chapter V</p>
            <h2 className="text-3xl font-bold uppercase tracking-wide text-federation-ivory text-red-500">
              Fouls, Infractions, and Disciplinary Code
            </h2>
          </div>

          <div className="space-y-10 pl-0 sm:pl-6 border-l-0 sm:border-l border-red-500/30">
            <div>
              <h3 className="text-xl font-semibold mb-4 opacity-90">Article 12: Technical Fouls</h3>
              <div className="space-y-4 font-light opacity-80 leading-relaxed">
                <p><strong className="font-semibold text-federation-ivory">Section 12.01 - Out of Turn Play:</strong> Warning issued. Second offense results in a 25-point penalty awarded to the opposing team.</p>
                <p><strong className="font-semibold text-red-400">Section 12.02 - The Renege (False Pass):</strong> Passing while holding a mathematically playable tile. Offending team immediately forfeits the Hand, and the opposing team is awarded a maximum penalty score of 50 points (or actual pip count, whichever is higher).</p>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4 opacity-90">Article 13: Behavioral and Integrity Violations</h3>
              <div className="space-y-4 font-light opacity-80 leading-relaxed">
                <p><strong className="font-semibold text-federation-ivory">Section 13.01 - Table Talk:</strong> Strict silence regarding the game state is mandated. Discussing strategy is prohibited.</p>
                <p><strong className="font-semibold text-red-400">Section 13.02 - Non-Verbal Collusion (Signaling):</strong> Any attempt to convey information through coded gestures. Confirmed signaling results in immediate disqualification and a temporary suspension of the player's Federation ID.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CHAPTER VI */}
        <section>
          <div className="mb-8">
            <p className="text-sm uppercase tracking-widest opacity-60 mb-1">Chapter VI</p>
            <h2 className="text-3xl font-bold uppercase tracking-wide text-federation-ivory">
              Tournament Operations & The ELO Engine
            </h2>
          </div>

          <div className="space-y-10 pl-0 sm:pl-6 border-l-0 sm:border-l border-federation-ivory/20">
            <div className="bg-federation-ivory/5 p-6 rounded-sm border border-federation-ivory/10">
              <h3 className="text-xl font-semibold mb-4 opacity-90">Article 14 & 15: Digital Protocol</h3>
              <div className="space-y-4 font-light opacity-80 leading-relaxed">
                <p><strong className="font-semibold text-federation-ivory">Section 14.01 - Algorithmic Seeding:</strong> All tournaments must use the IDF platform to generate brackets. Teams are seeded based on combined mathematical ELO ratings.</p>
                <p><strong className="font-semibold text-federation-ivory">Section 15.01 - The Immutable Ledger:</strong> Once a match result is verified and submitted to the IDF database, ELO calculations are final. Ratings cannot be manually adjusted.</p>
                <p><strong className="font-semibold text-federation-ivory">Section 15.03 - Active Status:</strong> To maintain ranking on the public leaderboard, a player must participate in a minimum of one (1) sanctioned Tier 2 or Tier 1 tournament within a rolling six-month calendar period.</p>
              </div>
            </div>
          </div>
        </section>

      </article>
      
      {/* Footer */}
      <footer className="mt-32 pt-8 border-t border-federation-ivory/20 text-center flex flex-col items-center justify-center opacity-50">
        <p className="text-sm font-light uppercase tracking-widest mb-2">
          Iraqi Dominoes Federation © {new Date().getFullYear()}
        </p>
        <p className="text-xs font-mono">IDF-SYS-DOC-1.0</p>
      </footer>
    </div>
  );
}
