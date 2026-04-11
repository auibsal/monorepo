import Link from 'next/link';

export default function RulebookPage() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6 sm:px-8 lg:px-12 w-full">
      
      {/* Navigation */}
      <nav className="mb-12">
        <Link 
          href="/" 
          className="text-sm font-medium uppercase tracking-wider text-federation-ivory/60 hover:text-federation-ivory transition-colors flex items-center gap-2"
        >
          <span>&larr;</span> Back to Home
        </Link>
      </nav>

      {/* Header */}
      <header className="mb-16">
        <h2 
          className="text-xl md:text-2xl font-medium tracking-wide mb-4 opacity-80" 
          style={{ fontFamily: 'var(--font-ibm-plex-arabic)' }}
        >
          اللائحة الفنية وقواعد اللعب الرسمية
        </h2>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight uppercase">
          Official Rulebook
        </h1>
        <p className="mt-4 text-lg font-light opacity-70 leading-relaxed">
          The rules contained within this document constitute the sole, official regulations for all ranked and sanctioned dominoes matches under the jurisdiction of the Iraqi Dominoes Federation (IDF).
        </p>
      </header>

      {/* Content Body */}
      <article className="space-y-16">
        
        {/* Article I */}
        <section>
          <h2 className="text-2xl font-semibold uppercase tracking-wide border-b border-federation-ivory/20 pb-4 mb-6">
            Article I: Equipment and Venue Standards
          </h2>
          <div className="space-y-6 font-light opacity-80 leading-relaxed text-lg">
            <div>
              <strong className="font-semibold text-federation-ivory opacity-100">Section 1.01 - The Domino Set:</strong> All sanctioned matches must utilize a standard "Double-Six" set, consisting of 28 tiles.
            </div>
            <div>
              <strong className="font-semibold text-federation-ivory opacity-100">Section 1.02 - Tile Specifications:</strong> Tiles must be opaque and possess a center spinner (pin) to facilitate shuffling. The back of the tiles must be completely blank, uniform, and unmarked.
            </div>
            <div>
              <strong className="font-semibold text-federation-ivory opacity-100">Section 1.03 - The Playing Surface:</strong> Matches must be played on a square table, covered in felt or a similar dampening material to prevent tile damage and minimize noise during shuffling.
            </div>
          </div>
        </section>

        {/* Article II */}
        <section>
          <h2 className="text-2xl font-semibold uppercase tracking-wide border-b border-federation-ivory/20 pb-4 mb-6">
            Article II: Match Structure and The Draw
          </h2>
          <div className="space-y-6 font-light opacity-80 leading-relaxed text-lg">
            <div>
              <strong className="font-semibold text-federation-ivory opacity-100">Section 2.01 - Formats of Play:</strong> The primary recognized format for competitive IDF play is "Pairs" (2 vs. 2). Teammates must sit directly opposite each other.
            </div>
            <div>
              <strong className="font-semibold text-federation-ivory opacity-100">Section 2.02 - The Shuffle:</strong> Tiles must be placed face down and shuffled thoroughly by one player. All four players must keep their hands off the table during the shuffle.
            </div>
            <div>
              <strong className="font-semibold text-federation-ivory opacity-100">Section 2.03 - The Draw:</strong> Each player draws exactly seven (7) tiles. There is no boneyard; all 28 tiles are distributed.
            </div>
          </div>
        </section>

        {/* Article III */}
        <section>
          <h2 className="text-2xl font-semibold uppercase tracking-wide border-b border-federation-ivory/20 pb-4 mb-6">
            Article III: Gameplay and Execution
          </h2>
          <div className="space-y-6 font-light opacity-80 leading-relaxed text-lg">
            <div>
              <strong className="font-semibold text-federation-ivory opacity-100">Section 3.01 - Opening the Match:</strong> The first hand of a newly commenced match is started by the player holding the Double-Six tile. In subsequent hands, the turn to start rotates anti-clockwise.
            </div>
            <div>
              <strong className="font-semibold text-federation-ivory opacity-100">Section 3.02 - Playing a Tile:</strong> A player must connect a tile matching one of the exposed ends on the board. The tile must be placed decisively; hovering or "testing" connections is prohibited.
            </div>
            <div>
              <strong className="font-semibold text-federation-ivory opacity-100">Section 3.03 - Passing (Knocking):</strong> If a player cannot play, they must declare "Pass" or knock the table lightly. Passing when holding a playable tile is a severe technical foul.
            </div>
          </div>
        </section>

        {/* Article IV */}
        <section>
          <h2 className="text-2xl font-semibold uppercase tracking-wide border-b border-federation-ivory/20 pb-4 mb-6">
            Article IV: Scoring and Winning
          </h2>
          <div className="space-y-6 font-light opacity-80 leading-relaxed text-lg">
            <div>
              <strong className="font-semibold text-federation-ivory opacity-100">Section 4.01 - Dominating a Hand:</strong> A hand ends immediately when a player plays their final tile. The winning pair scores the sum of the pip values remaining in the opposing pair's hands.
            </div>
            <div>
              <strong className="font-semibold text-federation-ivory opacity-100">Section 4.02 - Locked Board:</strong> If the board is blocked, players expose their tiles. The pair with the lowest combined total of pips wins, scoring the sum of the opponent's pips. In an exact tie, the hand is voided.
            </div>
            <div>
              <strong className="font-semibold text-federation-ivory opacity-100">Section 4.03 - Match Threshold:</strong> A competitive match is played to 100 or 200 points. The first pair to reach this threshold wins.
            </div>
          </div>
        </section>

        {/* Article V */}
        <section>
          <h2 className="text-2xl font-semibold uppercase tracking-wide border-b border-federation-ivory/20 pb-4 mb-6">
            Article V: Digital Platform Integration
          </h2>
          <div className="space-y-6 font-light opacity-80 leading-relaxed text-lg bg-federation-ivory/5 p-6 rounded-sm border border-federation-ivory/10">
            <div>
              <strong className="font-semibold text-federation-ivory opacity-100">Section 5.01 - Mandatory Recording:</strong> For a match to be officially sanctioned and affect player rankings, the match must be initialized and concluded via the official IDF digital platform.
            </div>
            <div>
              <strong className="font-semibold text-federation-ivory opacity-100">Section 5.02 - The Rating Algorithm:</strong> The IDF utilizes a proprietary mathematical rating system. Player ranks are dynamic and adjust automatically based on match outcomes and the mathematical ELO disparity between opposing teams.
            </div>
            <div>
              <strong className="font-semibold text-federation-ivory opacity-100">Section 5.03 - Result Verification:</strong> At the conclusion of a match, both teams must digitally sign off on the final score submitted to the platform. Falsifying data is grounds for immediate expulsion.
            </div>
          </div>
        </section>

      </article>
      
      {/* Footer Divider */}
      <div className="mt-20 pt-8 border-t border-federation-ivory/20 text-center opacity-50 text-sm font-light uppercase tracking-widest">
        Iraqi Dominoes Federation © {new Date().getFullYear()}
      </div>
    </div>
  );
}
