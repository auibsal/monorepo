'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/i18n/routing';

export default function AdaptivePlayPage() {
  const [activeSection, setActiveSection] = useState('');

  // Interactive Scroll Spy for the regulations
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
    { id: 'mandate', title: '0.0 The Inclusive Mandate' },
    { id: 'equipment', title: '1.0 Sanctioned Equipment' },
    { id: 'execution', title: '2.0 Execution of Moves' },
    { id: 'clocks', title: '3.0 Match Clocks & Timing' },
    { id: 'assistants', title: '4.0 Authorised Assistants' },
    { id: 'discrepancies', title: '5.0 Discrepancy Resolution' },
  ];

  return (
    <div className="max-w-[90rem] mx-auto py-16 px-6 lg:px-12 w-full flex flex-col lg:flex-row gap-12 relative">
      
      {/* Interactive Sidebar (Table of Contents) */}
      <aside className="w-full lg:w-1/4 lg:sticky lg:top-32 h-fit mb-12 lg:mb-0">
        <Link 
          href="/" 
          className="text-xs font-bold uppercase tracking-widest text-federation-ivory/50 hover:text-federation-ivory transition-colors mb-8 inline-block"
        >
          &larr; Return to Headquarters
        </Link>
        <h3 className="text-sm font-bold uppercase tracking-widest border-b border-federation-ivory/20 pb-4 mb-6">
          Adaptive Play Index
        </h3>
        <nav className="flex flex-col gap-4">
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

      {/* Main Content */}
      <article className="w-full lg:w-3/4 space-y-20">
        
        {/* Header */}
        <header className="border-b-2 border-federation-ivory/30 pb-12">
          <div className="flex items-center gap-4 mb-6">
            <span className="px-3 py-1 bg-federation-ivory text-federation-obsidian text-xs font-bold uppercase tracking-widest rounded-sm">
              Regulatory Supplement
            </span>
            <span className="text-sm font-mono text-federation-ivory/60">IDA-ADA-2026</span>
          </div>
          <h2 className="text-xl md:text-2xl font-medium tracking-wide mb-4 opacity-80" style={{ fontFamily: 'var(--font-ibm-plex-arabic)' }}>

          </h2>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight uppercase leading-none mb-6">
            Adaptive Play & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-federation-ivory to-gray-500">
              Accessibility
            </span>
          </h1>
          <p className="text-lg font-light opacity-80 leading-relaxed max-w-3xl">
            Supplement to the IDA Official Rulebook governing competitive matches involving visually handicapped and physically disabled athletes. Derived from international standard sports practices to ensure absolute parity in mathematical ELO ratings.
          </p>
        </header>

        {/* 0.0 Mandate */}
        <section id="mandate" className="scroll-mt-32">
          <h2 className="text-3xl font-bold uppercase tracking-wide mb-6">0.0 The Inclusive Mandate</h2>
          <div className="bg-federation-ivory/5 p-8 rounded-sm border border-federation-ivory/10 space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p>
              Dominoes is an inherently tactile sport. The Iraqi Dominoes Association mandates that all sanctioned Tier 1 and Tier 2 events must accommodate players with visual or physical disabilities without prejudice. Tournament directors possess the authority to adapt table layouts and provide specialized equipment to ensure a fair competitive environment.
            </p>
          </div>
        </section>

        {/* 1.0 Equipment */}
        <section id="equipment" className="scroll-mt-32">
          <h2 className="text-3xl font-bold uppercase tracking-wide mb-6">1.0 Sanctioned Equipment</h2>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p>
              In competitive dominoes between sighted and visually handicapped players, either player or team may demand the use of specially constructed equipment to facilitate fair play.
            </p>
            <p className="font-bold text-federation-ivory mt-4">1.1 Tactile Tiles</p>
            <p>
              The specially constructed domino sets must feature deeply recessed or raised pips that can be easily identified by touch. Furthermore, the dividing line and spinner must be physically pronounced.
            </p>
            <p className="font-bold text-federation-ivory mt-4">1.2 Securing Racks</p>
            <p>
              To prevent accidental exposure of tiles during tactile scanning, visually handicapped players must be provided with deep-grooved wooden or plastic racks that securely lock the tiles in a face-up position facing only the player.
            </p>
          </div>
        </section>

        {/* 2.0 Execution of Moves */}
        <section id="execution" className="scroll-mt-32">
          <h2 className="text-3xl font-bold uppercase tracking-wide mb-6">2.0 Execution of Moves</h2>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p className="font-bold text-federation-ivory mt-4">2.1 Mandatory Announcements</p>
            <p>
              To ensure absolute clarity, the moves must be announced clearly, repeated by the opponent, and executed on the board. For example, a player must declare: <span className="font-mono text-federation-ivory/80">"Playing the 6-4 on the open 6."</span>
            </p>
            <p className="font-bold text-federation-ivory mt-4">2.2 Definition of a "Touched" Tile</p>
            <p>
              Unlike sighted play where hovering is prohibited, a visually handicapped player's tile shall only be considered "touched" (and therefore committed) when it has been completely lifted out of the securing rack.
            </p>
            <p className="font-bold text-federation-ivory mt-4">2.3 Definition of an "Executed" Move</p>
            <p>
              A move shall be considered fully executed when the tile is physically connected to the open end on the board AND the move has been verbally announced. Only after this sequence is completed may the match clock be pressed.
            </p>
          </div>
        </section>

        {/* 3.0 Clocks */}
        <section id="clocks" className="scroll-mt-32">
          <h2 className="text-3xl font-bold uppercase tracking-wide mb-6">3.0 Match Clocks & Timing</h2>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p>
              When a time control is enforced, a specially constructed audio match clock shall be admissible.
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>It must be capable of announcing the remaining time and the turn state via earpiece to the visually disabled player.</li>
              <li>The physical buttons must be highly tactile, featuring raised indicators to ensure the player can pause the clock without visual confirmation.</li>
              <li>A slip of the tongue during a verbal announcement of a move must be corrected immediately and strictly before the player presses the clock to end their turn.</li>
            </ul>
          </div>
        </section>

        {/* 4.0 Assistants */}
        <section id="assistants" className="scroll-mt-32">
          <h2 className="text-3xl font-bold uppercase tracking-wide mb-6 border-l-4 border-red-600 pl-6">4.0 Authorised Assistants</h2>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify bg-federation-obsidian p-8 border border-federation-ivory/20 rounded-sm shadow-xl">
            <p>
              The visually handicapped player shall have the right to make use of an officially sanctioned assistant. The assistant is strictly neutral and shall have any or all of the following authorized duties:
            </p>
            <ul className="space-y-4 mt-6">
              <li className="flex items-start gap-4">
                <span className="text-red-500 font-bold mt-1">1.</span>
                <span><strong>Physical Placement:</strong> Make the player's declared move on the physical board to ensure the chain remains geometrically stable.</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="text-red-500 font-bold mt-1">2.</span>
                <span><strong>Verbal Relay:</strong> Announce the moves of all other players at the table, specifically identifying which open ends remain available.</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="text-red-500 font-bold mt-1">3.</span>
                <span><strong>Digital Logging:</strong> Keep the official digital game score on the IDA Terminal and operate the match clock on behalf of the player.</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="text-red-500 font-bold mt-1">4.</span>
                <span><strong>Arbiter Communication:</strong> Claim a time-limit violation or technical foul, and inform the Arbiter if an opponent has illegally touched or retracted a tile.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* 5.0 Discrepancies */}
        <section id="discrepancies" className="scroll-mt-32">
          <h2 className="text-3xl font-bold uppercase tracking-wide mb-6">5.0 Discrepancy Resolution</h2>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p>
              If, during a hand, a discrepancy arises between the physical board state and the mental or secondary tracking board of the visually handicapped player, the match clock must be immediately paused.
            </p>
            <p>
              The Arbiter must be summoned. The hand shall be retraced to the point where all players agree on the board state, utilizing the digital IDA Terminal logs as the absolute source of truth. The Arbiter holds the authority to readjust the match clocks to account for the interruption.
            </p>
          </div>
        </section>

      </article>
    </div>
  );
}
