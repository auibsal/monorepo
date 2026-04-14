'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function EnginePlayPage() {
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
    { id: 'preamble', title: '0.0 Preamble & Scope' },
    { id: 'proxy', title: '1.0 The Human Proxy' },
    { id: 'clocks', title: '2.0 Time Controls' },
    { id: 'duties', title: '3.0 Proxy Duties & Rights' },
    { id: 'prizes', title: '4.0 Prizes & ELO Rating' },
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
          Engine Play Index
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
            <span className="text-sm font-mono text-federation-ivory/60">IDA-ALG-2026</span>
          </div>
          <h2 className="text-xl md:text-2xl font-medium tracking-wide mb-4 opacity-80" style={{ fontFamily: 'var(--font-ibm-plex-arabic)' }}>

          </h2>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight uppercase leading-none mb-6">
            Algorithmic Entities <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-federation-ivory to-gray-500">
              & Engine Play
            </span>
          </h1>
          <p className="text-lg font-light opacity-80 leading-relaxed max-w-3xl">
            As the mathematical framework of dominoes evolves, artificial intelligence engines are increasingly utilized to test absolute probability models. This supplement governs the protocols for sanctioned human-vs-engine exhibition matches.
          </p>
        </header>

        {/* 0.0 Preamble */}
        <section id="preamble" className="scroll-mt-32">
          <h2 className="text-3xl font-bold uppercase tracking-wide mb-6">0.0 Preamble & Scope</h2>
          <div className="bg-federation-ivory/5 p-8 rounded-sm border border-federation-ivory/10 space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p>
              [span_0](start_span)The game shall be played according to the official IDA Laws of Dominoes on a physical tournament board, utilizing a standard match clock[span_0](end_span). In 2v2 exhibition formats, an Algorithmic Entity (Engine) may be paired with a human partner, or two Engines may operate as a single team against a human pair.
            </p>
          </div>
        </section>

        {/* 1.0 The Proxy */}
        <section id="proxy" className="scroll-mt-32">
          <h2 className="text-3xl font-bold uppercase tracking-wide mb-6">1.0 The Human Proxy (Operator)</h2>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p>
              Because dominoes is a physical sport, an Engine must be represented at the table by a human Proxy, referred to as the Operator.
            </p>
            <p className="font-bold text-federation-ivory mt-4">1.1 Exemption from 'Touched Tile' Penalties</p>
            <p>
              The Operator is regarded solely as the Engine's physical conduit. [span_1](start_span)Therefore, strict technical fouls regarding the "touched piece" rules do not apply to the Operator if they fumble a tile while executing the Engine's command[span_1](end_span). However, once the tile is released on the board, the move is finalized.
            </p>
            <p className="font-bold text-federation-ivory mt-4">1.2 Move Execution Sequence</p>
            <p>
              [span_2](start_span)After a human opponent makes a move, the Operator must key the board state into the Engine's terminal[span_2](end_span). [span_3](start_span)Once the Engine calculates and outputs its decision, the Operator will physically play the designated tile on the tournament board, press the match clock, and record the move on the official scoresheet[span_3](end_span).
            </p>
          </div>
        </section>

        {/* 2.0 Clocks */}
        <section id="clocks" className="scroll-mt-32">
          <h2 className="text-3xl font-bold uppercase tracking-wide mb-6">2.0 Match Clocks & Time Controls</h2>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p>
              [span_4](start_span)The official physical tournament clock takes absolute precedence over any internal clock built into the Engine[span_4](end_span). 
            </p>
            <p className="font-bold text-federation-ivory mt-4">2.1 Accounting for Physical Delay</p>
            <p>
              The 20-second time control parameter set on the match clock must account for the physical delay introduced by the Operator. [span_5](start_span)The time taken by the Operator to transfer the human's move into the terminal, and the Engine's move back to the physical board, consumes the Engine's allotted time[span_5](end_span).
            </p>
            <p className="font-bold text-federation-ivory mt-4">2.2 Prohibition of Forced Moves</p>
            <p>
              [span_6](start_span)The Operator is strictly forbidden from bypassing the Engine's calculation phase or forcing the Engine to execute a specific move, even if the match clock is critically low[span_6](end_span).
            </p>
          </div>
        </section>

        {/* 3.0 Duties */}
        <section id="duties" className="scroll-mt-32">
          <h2 className="text-3xl font-bold uppercase tracking-wide mb-6 border-l-4 border-red-600 pl-6">3.0 Proxy Duties & Rights</h2>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify bg-federation-obsidian p-8 border border-federation-ivory/20 rounded-sm shadow-xl">
            <p>
              [span_7](start_span)The Operator acts as a neutral mechanism and must obey each instruction provided by the Engine with absolute precision[span_7](end_span).
            </p>
            <ul className="space-y-4 mt-6">
              <li className="flex items-start gap-4">
                <span className="text-red-500 font-bold mt-1">1.</span>
                [span_8](start_span)<span><strong>Hardware Restrictions:</strong> The Operator may only change cartridges, memory, or adjust hardware parameters if explicitly instructed by the Engine's diagnostic output[span_8](end_span).</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="text-red-500 font-bold mt-1">2.</span>
                [span_9](start_span)<span><strong>Draw Conditions:</strong> The Operator may only claim a Dead Heat (Tie) or a mathematical draw if the Engine itself outputs the instruction to do so[span_9](end_span).</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="text-red-500 font-bold mt-1">3.</span>
                <span><strong>Resignation:</strong> If the Engine's win-probability drops to an inescapable zero, the human opponent may suggest the Engine resign. The Operator possesses the authority to resign on behalf of the Engine. [span_10](start_span)Before doing so, the Operator may consult an Arbiter or an authorized technical expert to verify the mathematical impossibility of a win[span_10](end_span).</span>
              </li>
            </ul>
          </div>
        </section>

        {/* 4.0 Prizes */}
        <section id="prizes" className="scroll-mt-32">
          <h2 className="text-3xl font-bold uppercase tracking-wide mb-6">4.0 Prizes & ELO Rating</h2>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p>
              [span_11](start_span)Engines and their development teams taking part in exhibition matches alongside human tournaments are only eligible to receive special "Algorithmic Division" prizes, if any are offered by the host venue[span_11](end_span). 
            </p>
            <p>
              Algorithmic Entities cannot claim financial prize pools reserved for human athletes, nor can they hold a standard National ELO rank. Matches played against an Engine do not impact a human player's official IDA rating.
            </p>
          </div>
        </section>

      </article>
    </div>
  );
}
