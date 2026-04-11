'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LawsOfDominoes() {
  const [activeSection, setActiveSection] = useState('');

  // Interactive Scroll Spy for the massive rulebook
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('section[id]');
      let currentSectionId = '';

      sections.forEach((section) => {
        const sectionTop = section.getBoundingClientRect().top;
        if (sectionTop <= 180) {
          currentSectionId = section.getAttribute('id') || '';
        }
      });

      setActiveSection(currentSectionId);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toc = [
    { id: 'preface', title: '0.0 Preface & Intro' },
    { id: 'part-1', title: '1.0 Basic Rules of Play' },
    { id: 'art-1', title: 'Art 1: Nature & Objectives' },
    { id: 'art-2', title: 'Art 2: Initial Position' },
    { id: 'art-3', title: 'Art 3: The Moves' },
    { id: 'art-4', title: 'Art 4: Act of Moving' },
    { id: 'art-5', title: 'Art 5: Completion of the Hand' },
    { id: 'part-2', title: '2.0 Competitive Rules' },
    { id: 'art-6', title: 'Art 6: The Match Clock' },
    { id: 'art-7', title: 'Art 7: Irregularities' },
    { id: 'art-8', title: 'Art 8: Digital Recording' },
    { id: 'art-9', title: 'Art 9: The Drawn Game' },
    { id: 'art-10', title: 'Art 10: Points & Scoring' },
    { id: 'art-11', title: 'Art 11: Player Conduct' },
    { id: 'art-12', title: 'Art 12: Role of the Arbiter' },
    { id: 'appendices', title: '3.0 Appendices & Glossary' },
  ];

  return (
    <div className="max-w-[90rem] mx-auto py-16 px-6 lg:px-12 w-full flex flex-col lg:flex-row gap-12 relative">
      
      {/* Interactive Sidebar (Table of Contents) */}
      <aside className="w-full lg:w-1/4 lg:sticky lg:top-32 h-fit mb-12 lg:mb-0 custom-scrollbar overflow-y-auto max-h-[80vh] pr-4">
        <Link 
          href="/" 
          className="text-xs font-bold uppercase tracking-widest text-federation-ivory/50 hover:text-federation-ivory transition-colors mb-8 inline-block"
        >
          &larr; Return to Headquarters
        </Link>
        <h3 className="text-sm font-bold uppercase tracking-widest border-b border-federation-ivory/20 pb-4 mb-6">
          Index of Laws
        </h3>
        <nav className="flex flex-col gap-3">
          {toc.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`text-left text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 ${
                activeSection === item.id 
                  ? 'text-federation-ivory font-bold translate-x-2' 
                  : 'text-federation-ivory/50 hover:text-federation-ivory'
              }`}
            >
              {item.title}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Rulebook Content */}
      <article className="w-full lg:w-3/4 space-y-20">
        
        {/* Header */}
        <header className="border-b-2 border-federation-ivory/30 pb-12">
          <div className="flex items-center gap-4 mb-6">
            <span className="px-3 py-1 bg-federation-ivory text-federation-obsidian text-xs font-bold uppercase tracking-widest rounded-sm">
              Current Edition
            </span>
            <span className="text-sm font-mono text-federation-ivory/60">EFFECTIVE JAN 2026</span>
          </div>
          <h2 className="text-xl md:text-2xl font-medium tracking-wide mb-4 opacity-80" style={{ fontFamily: 'var(--font-ibm-plex-arabic)' }}>
            قوانين اللعبة الرسمية
          </h2>
          <h1 className="text-4xl md:text-7xl font-bold tracking-tight uppercase leading-none mb-6">
            The Laws of <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-federation-ivory to-gray-500">
              Iraqi Dominoes
            </span>
          </h1>
          <p className="text-lg font-light opacity-80 leading-relaxed max-w-3xl">
            Approved by the IDF Executive Council. The English text is the authentic version of the Laws of Dominoes covering over-the-table play for all sanctioned, mathematically rated events within the Republic of Iraq.
          </p>
        </header>

        {/* PREFACE */}
        <section id="preface" className="scroll-mt-32 bg-federation-ivory/5 p-8 rounded-sm border border-federation-ivory/10">
          <h2 className="text-2xl font-bold uppercase tracking-wide mb-4">0.0 Preface</h2>
          <div className="space-y-4 font-light opacity-80 leading-relaxed">
            <p>
              The Laws of Dominoes cannot cover all possible situations that may arise during a game, nor can they regulate all administrative questions. Where cases are not precisely regulated by an Article of the Laws, it should be possible to reach a correct decision by studying analogous situations which are regulated in the Laws.
            </p>
            <p>
              The Laws assume that Arbiters have the necessary competence, sound judgement, and absolute objectivity. Too detailed a rule might deprive the Arbiter of his/her freedom of judgement and thus prevent him/her from finding a solution to a problem dictated by fairness, logic, and special factors. 
            </p>
            <p>
              A necessary condition for a match to be rated by the IDF mathematical ELO system is that it shall be played strictly according to these Laws.
            </p>
          </div>
        </section>

        <div className="w-full h-px bg-federation-ivory/20 my-16"></div>

        {/* PART 1: BASIC RULES */}
        <section id="part-1" className="scroll-mt-32">
          <h2 className="text-4xl font-bold uppercase tracking-wide mb-2 text-transparent bg-clip-text bg-gradient-to-r from-federation-ivory to-gray-500">
            1.0 Basic Rules of Play
          </h2>
        </section>

        <section id="art-1" className="scroll-mt-32">
          <h3 className="text-2xl font-bold uppercase tracking-wide mb-6">Article 1: The Nature and Objectives of the Game</h3>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p><strong className="text-federation-ivory font-semibold">1.1</strong> The competitive game of dominoes is played between two pairs of opponents (2 vs 2 format) who place their tiles on a flat surface called the 'board'.</p>
            <p><strong className="text-federation-ivory font-semibold">1.2</strong> Teammates must sit directly opposite each other across the board.</p>
            <p><strong className="text-federation-ivory font-semibold">1.3</strong> The objective of each player is to connect the pips (dots) on their tiles with the exposed open ends on the board, systematically emptying their hand while attempting to restrict the opponents' ability to do the same.</p>
            <p><strong className="text-federation-ivory font-semibold">1.4</strong> The pair who successfully plays all their tiles, or holds the lowest mathematical pip count when the board is locked, wins the hand.</p>
          </div>
        </section>

        <section id="art-2" className="scroll-mt-32">
          <h3 className="text-2xl font-bold uppercase tracking-wide mb-6">Article 2: The Initial Position and The Draw</h3>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p><strong className="text-federation-ivory font-semibold">2.1</strong> A standard "Double-Six" set is utilized, comprising exactly 28 tiles.</p>
            <p><strong className="text-federation-ivory font-semibold">2.2 The Shuffle (Washing):</strong> At the beginning of a hand, all 28 tiles are placed face down. The designated player must mix the tiles using flat, circular motions with both hands.</p>
            <p className="pl-6 border-l-2 border-federation-ivory/30 text-sm">
              <strong className="text-federation-ivory">2.2.1</strong> During the shuffle, the other three players must keep their hands off the table and in plain sight.
            </p>
            <p><strong className="text-federation-ivory font-semibold">2.3 The Draw:</strong> Beginning with the player to the right of the shuffler, each player draws exactly seven (7) tiles. There is no boneyard (reserve tiles) left over in sanctioned 2v2 play; all 28 tiles are distributed.</p>
          </div>
        </section>

        <section id="art-3" className="scroll-mt-32">
          <h3 className="text-2xl font-bold uppercase tracking-wide mb-6">Article 3: The Moves</h3>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p><strong className="text-federation-ivory font-semibold">3.1</strong> It is only permitted to play a tile if one of its numerical halves matches an exposed, open end of the domino chain on the board.</p>
            <p><strong className="text-federation-ivory font-semibold">3.2 The Spinner:</strong> A "Double" tile (a tile with identical numbers on both halves, e.g., 6-6) must be placed perpendicularly across the line of play. Singles are placed parallel to the line of play.</p>
            <p><strong className="text-federation-ivory font-semibold">3.3 Passing:</strong> If a player does not possess a matching tile, they must clearly declare "Pass" or knock the table lightly.</p>
            <p className="pl-6 border-l-2 border-red-500/50 text-sm">
              <strong className="text-red-400">3.3.1 The Renege (False Pass):</strong> Passing when holding a legally playable tile is the most severe infraction in the sport. It results in immediate forfeiture of the hand and a maximum point penalty applied to the offending team.
            </p>
          </div>
        </section>

        <section id="art-4" className="scroll-mt-32">
          <h3 className="text-2xl font-bold uppercase tracking-wide mb-6">Article 4: The Act of Moving the Tiles</h3>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p><strong className="text-federation-ivory font-semibold">4.1</strong> Each move must be played with one hand only.</p>
            <p><strong className="text-federation-ivory font-semibold">4.2</strong> A player may not hover their tile over the board to "test" connections. The move must be swift and decisive.</p>
            <p><strong className="text-federation-ivory font-semibold">4.3 Finality of Move:</strong> When, as a legal move, a tile has been released onto the board and the player's fingertips have broken physical contact with it, the move is considered completed. It cannot be retracted or moved to the other exposed end of the chain.</p>
          </div>
        </section>

        <section id="art-5" className="scroll-mt-32">
          <h3 className="text-2xl font-bold uppercase tracking-wide mb-6">Article 5: The Completion of the Hand</h3>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p><strong className="text-federation-ivory font-semibold">5.1 Domination:</strong> The hand is won immediately when a player places their final tile onto the board, emptying their hand. This concludes the hand.</p>
            <p><strong className="text-federation-ivory font-semibold">5.2 The Lock (Block):</strong> The hand is drawn/locked when neither of the exposed ends on the board can be matched by any tile remaining in any player's possession.</p>
            <p className="pl-6 border-l-2 border-federation-ivory/30 text-sm">
              <strong className="text-federation-ivory">5.2.1</strong> Upon a Lock, all players must expose their remaining tiles. The team with the lowest combined total of pips (dots) wins the hand.
            </p>
          </div>
        </section>

        <div className="w-full h-px bg-federation-ivory/20 my-16"></div>

        {/* PART 2: COMPETITIVE RULES */}
        <section id="part-2" className="scroll-mt-32">
          <h2 className="text-4xl font-bold uppercase tracking-wide mb-2 text-transparent bg-clip-text bg-gradient-to-r from-federation-ivory to-gray-500">
            2.0 Competitive Rules of Play
          </h2>
        </section>

        <section id="art-6" className="scroll-mt-32">
          <h3 className="text-2xl font-bold uppercase tracking-wide mb-6">Article 6: The Match Clock & Pace of Play</h3>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p><strong className="text-federation-ivory font-semibold">6.1</strong> In Tier 1 and Tier 2 rated events, a central match clock or digital timer may be utilized to govern the pace of play.</p>
            <p><strong className="text-federation-ivory font-semibold">6.2 Time Control:</strong> Unless otherwise specified by the tournament regulations, a player has a maximum of twenty (20) seconds to execute their move or declare a pass.</p>
            <p><strong className="text-federation-ivory font-semibold">6.3 Stalling:</strong> Intentional slow-play designed to disrupt the rhythm of the game or annoy opponents is forbidden and subject to point deductions by the Arbiter.</p>
          </div>
        </section>

        <section id="art-7" className="scroll-mt-32">
          <h3 className="text-2xl font-bold uppercase tracking-wide mb-6">Article 7: Irregularities</h3>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p><strong className="text-federation-ivory font-semibold">7.1 Exposed Tiles During Shuffle:</strong> If a tile is accidentally flipped face-up during the shuffle, the shuffle is immediately voided and must be completely restarted by the same player.</p>
            <p><strong className="text-federation-ivory font-semibold">7.2 Overdrawing:</strong> If a player draws eight (8) tiles instead of seven, the Arbiter must be summoned immediately. The Arbiter will blindly select one tile from the offending player's rack to return to the board for the short-handed player to draw.</p>
            <p><strong className="text-federation-ivory font-semibold">7.3 Out of Turn Play:</strong> If a player exposes or plays a tile when it is not their turn, the tile is returned to their rack, and the Arbiter shall issue a formal warning. A second offense yields a 25-point penalty.</p>
          </div>
        </section>

        <section id="art-8" className="scroll-mt-32">
          <h3 className="text-2xl font-bold uppercase tracking-wide mb-6">Article 8: Digital Recording & Match Submission</h3>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p><strong className="text-federation-ivory font-semibold">8.1 The IDF Platform:</strong> Paper scoresheets are strictly prohibited for official ELO calculations. All match scores must be recorded on the official digital terminal provided at the table.</p>
            <p><strong className="text-federation-ivory font-semibold">8.2 Live Entry:</strong> At the conclusion of each hand, the winning team dictates the opposing team's remaining pip count to the Arbiter or inputs it directly into the terminal.</p>
            <p><strong className="text-federation-ivory font-semibold">8.3 Verification:</strong> At the conclusion of the Match (reaching 100 or 200 points), both teams must physically or digitally verify the terminal's score before it is transmitted to the IDF mathematical rating engine. Once verified, the algorithm's calculation is absolute and irreversible.</p>
          </div>
        </section>

        <section id="art-9" className="scroll-mt-32">
          <h3 className="text-2xl font-bold uppercase tracking-wide mb-6">Article 9: The Drawn/Voided Hand</h3>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p><strong className="text-federation-ivory font-semibold">9.1 Tied Lock:</strong> If a Lock occurs (per Article 5.2) and both opposing teams hold an identical combined pip count, the hand is declared a Dead Heat (Void).</p>
            <p><strong className="text-federation-ivory font-semibold">9.2</strong> In the event of a Tied Lock, no points are awarded to either team. The hand is effectively erased, and the turn to shuffle and open the next hand rotates counter-clockwise to the next player in sequence.</p>
          </div>
        </section>

        <section id="art-10" className="scroll-mt-32">
          <h3 className="text-2xl font-bold uppercase tracking-wide mb-6">Article 10: Points & Match Thresholds</h3>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p><strong className="text-federation-ivory font-semibold">10.1 Scoring Domination:</strong> The winning team scores the sum total of all pips remaining on the tiles held by the opposing team.</p>
            <p><strong className="text-federation-ivory font-semibold">10.2 Scoring a Lock:</strong> The team with the lowest combined pip count wins, and scores the combined pip count of the losing team.</p>
            <p><strong className="text-federation-ivory font-semibold">10.3 Match Victory:</strong> A standard competitive match is played to a fixed threshold of exactly 100 points (Rapid Format) or 200 points (Championship Format). The first team to reach or exceed this threshold wins the Match, triggering the ELO update.</p>
          </div>
        </section>

        <section id="art-11" className="scroll-mt-32">
          <h3 className="text-2xl font-bold uppercase tracking-wide mb-6">Article 11: The Conduct of the Players</h3>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p><strong className="text-federation-ivory font-semibold">11.1</strong> The players shall take no action that will bring the sport of dominoes into disrepute.</p>
            <p><strong className="text-federation-ivory font-semibold">11.2 Silence During Play:</strong> From the moment the draw begins until the hand concludes, strict silence regarding the game state is mandated. "Table talk," including discussing strategy or remaining tiles, is strictly prohibited.</p>
            <p className="pl-6 border-l-2 border-red-500/50 text-sm">
              <strong className="text-red-400">11.2.1 Signaling (Collusion):</strong> Any form of non-verbal communication between partners—including eye gestures, tapping, coughing, or specific placement of tiles on the rack—designed to convey information about a hand is considered cheating. Confirmed signaling results in immediate tournament disqualification and referral to the Disciplinary Committee.
            </p>
            <p><strong className="text-federation-ivory font-semibold">11.3 Devices:</strong> Players are forbidden to use mobile phones or electronic devices in the playing area. Devices must be powered off and stored in bags.</p>
          </div>
        </section>

        <section id="art-12" className="scroll-mt-32">
          <h3 className="text-2xl font-bold uppercase tracking-wide mb-6">Article 12: The Role of the Arbiter</h3>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p><strong className="text-federation-ivory font-semibold">12.1</strong> The Arbiter shall see that the Laws of Dominoes are observed with absolute strictness.</p>
            <p><strong className="text-federation-ivory font-semibold">12.2</strong> The Arbiter shall act in the best interest of the competition, ensuring a professional playing environment free from external disturbance.</p>
            <p><strong className="text-federation-ivory font-semibold">12.3 Penalties:</strong> The Arbiter possesses the unilateral power to impose penalties, including warnings, point deductions, immediate forfeiture of a hand, or expulsion from the competition venue.</p>
          </div>
        </section>

        <div className="w-full h-px bg-federation-ivory/20 my-16"></div>

        {/* APPENDICES */}
        <section id="appendices" className="scroll-mt-32">
          <h2 className="text-4xl font-bold uppercase tracking-wide mb-8 text-transparent bg-clip-text bg-gradient-to-r from-federation-ivory to-gray-500">
            3.0 Appendices & Glossary
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-federation-ivory/5 p-6 rounded-sm border border-federation-ivory/10">
              <h4 className="font-bold uppercase tracking-widest text-sm text-federation-ivory/60 mb-2">Appendix A</h4>
              <h3 className="text-xl font-bold mb-4">Visually Disabled Players</h3>
              <p className="font-light opacity-80 text-sm">
                Tactile "Braille" domino tiles are permitted in specific sanctioned divisions. The player must announce their move verbally before placing the tile to ensure clarity for sighted and visually impaired opponents alike.
              </p>
            </div>

            <div className="bg-federation-ivory/5 p-6 rounded-sm border border-federation-ivory/10">
              <h4 className="font-bold uppercase tracking-widest text-sm text-federation-ivory/60 mb-2">Appendix B</h4>
              <h3 className="text-xl font-bold mb-4">The Mathematical Engine</h3>
              <p className="font-light opacity-80 text-sm">
                The IDF utilizes a dynamic ELO system. The mathematical formula calculates the average rating of Team A against Team B to determine the expected outcome, adjusting the rank volatility (K-Factor) based on the players' experience levels.
              </p>
            </div>
          </div>

          {/* Glossary */}
          <div className="mt-12">
            <h3 className="text-2xl font-bold uppercase tracking-wide mb-6">Glossary of Terms</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b border-federation-ivory/10 pb-4">
                <div className="font-bold text-federation-ivory">Boneyard</div>
                <div className="md:col-span-3 font-light opacity-80">The reserve pile of tiles not drawn. Note: Standard IDF 2v2 play utilizes all 28 tiles, leaving no boneyard.</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b border-federation-ivory/10 pb-4">
                <div className="font-bold text-federation-ivory">Pip</div>
                <div className="md:col-span-3 font-light opacity-80">The circular dots printed on the face of the domino tile representing its numerical value.</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b border-federation-ivory/10 pb-4">
                <div className="font-bold text-federation-ivory">Spinner</div>
                <div className="md:col-span-3 font-light opacity-80">The metal pin located in the center of the dividing line on a standard tile, facilitating easier shuffling and preventing excessive wear on the tile face.</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b border-federation-ivory/10 pb-4">
                <div className="font-bold text-federation-ivory">Double</div>
                <div className="md:col-span-3 font-light opacity-80">A tile bearing the same number of pips on both halves (e.g., the 6-6, the 0-0). Played perpendicularly on the board.</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b border-federation-ivory/10 pb-4">
                <div className="font-bold text-federation-ivory">ELO</div>
                <div className="md:col-span-3 font-light opacity-80">The mathematical rating system employed by the IDF digital platform to rank players nationally based on relative skill levels and match outcomes.</div>
              </div>
            </div>
          </div>
        </section>

      </article>
    </div>
  );
}
