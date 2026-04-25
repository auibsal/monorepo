'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/i18n/routing';

export default function DigitalRegulationsPage() {
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
    { id: 'preamble', title: '0.0 Formats of Digital Play' },
    { id: 'playing-zone', title: '1.0 The Playing Zone' },
    { id: 'supervision', title: '2.0 Video & Audio Supervision' },
    { id: 'disconnections', title: '3.0 Disconnections & Latency' },
    { id: 'fair-play', title: '4.0 Anti-Cheating & Collusion' },
    { id: 'hybrid', title: '5.0 Hybrid Competitions' },
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
          Digital Play Index
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
            <span className="text-sm font-mono text-federation-ivory/60">IDA-DHP-2026</span>
          </div>
          <h2 className="text-xl md:text-2xl font-medium tracking-wide mb-4 opacity-80" style={{ fontFamily: 'var(--font-ibm-plex-arabic)' }}>

          </h2>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight uppercase leading-none mb-6">
            Digital & Hybrid <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-federation-ivory to-gray-500">
              Play Regulations
            </span>
          </h1>
          <p className="text-lg font-light opacity-80 leading-relaxed max-w-3xl">
            Governing all officially sanctioned dominoes matches played via the Internet. This framework ensures that remote and hybrid competitions maintain the absolute mathematical integrity required for valid ELO rating adjustments.
          </p>
        </header>

        {/* 0.0 Formats */}
        <section id="preamble" className="scroll-mt-32">
          <h2 className="text-3xl font-bold uppercase tracking-wide mb-6">0.0 Formats of Digital Play</h2>
          <div className="bg-federation-ivory/5 p-8 rounded-sm border border-federation-ivory/10 space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p>
              <strong className="text-federation-ivory font-semibold">0.1 Online Play with Supervision:</strong> An event where players compete from their own remote locations (e.g., their homes) but are actively monitored by an Arbiter via a Video Conferencing System (VCS) and screen-sharing technology.
            </p>
            <p>
              <strong className="text-federation-ivory font-semibold">0.2 Hybrid Competitions:</strong> An event where players gather at physically sanctioned IDA Affiliates (cafes, clubs) and are physically supervised by a Local Chief Arbiter (LCA), but execute their moves against remote teams via digital devices connected to the Playing Zone.
            </p>
          </div>
        </section>

        {/* 1.0 Playing Zone */}
        <section id="playing-zone" className="scroll-mt-32">
          <h2 className="text-3xl font-bold uppercase tracking-wide mb-6">1.0 The Playing Zone</h2>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p>
              The "Playing Zone" refers to the official IDA Superapp or authorised web terminal hosting the virtual board.
            </p>
            <p className="font-bold text-federation-ivory mt-4">1.1 Enforced Legality</p>
            <p>
              Unlike physical play, the Playing Zone is programmed to only accept legal moves. If a player attempts to place a tile that does not mathematically match the open board ends, the move will be rejected. This rejection is not broadcast to the opponents and does not incur a technical foul, provided the player completes a legal move before their virtual clock expires.
            </p>
            <p className="font-bold text-federation-ivory mt-4">1.2 Virtual Clocks & Automation</p>
            <p>
              When a player releases a tile onto the virtual board, their clock automatically pauses, and the next player's clock begins. The Playing Zone will automatically declare a "Lock" (Block) or a "Domination" (Win) the exact millisecond the algorithmic conditions are met, overriding any human Arbiter input.
            </p>
          </div>
        </section>

        {/* 2.0 Video Supervision */}
        <section id="supervision" className="scroll-mt-32">
          <h2 className="text-3xl font-bold uppercase tracking-wide mb-6">2.0 Video & Audio Supervision (VCS)</h2>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p>
              For fully remote Online Play, players must connect to the authorised Video Conferencing System specified by the tournament director.
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li><strong className="text-federation-ivory font-semibold">Field of View:</strong> The webcam must provide a full view of the player's face and upper torso. Virtual backgrounds are strictly forbidden.</li>
              <li><strong className="text-federation-ivory font-semibold">Microphone Mandate:</strong> Because dominoes is a 2v2 sport, preventing secret communication between partners is paramount. Microphones must remain <strong>ON</strong> and unmuted at all times. If an Arbiter detects whispering, secondary audio feeds, or suspicious ambient noise, they may immediately pause the game and initiate an investigation.</li>
              <li><strong className="text-federation-ivory font-semibold">Screen Sharing:</strong> Players may be required to share their entire desktop screen (including the taskbar) with the Arbiter to prove no secondary communication apps (Discord, WhatsApp) or algorithmic calculators are running.</li>
            </ul>
          </div>
        </section>

        {/* 3.0 Disconnections */}
        <section id="disconnections" className="scroll-mt-32">
          <h2 className="text-3xl font-bold uppercase tracking-wide mb-6">3.0 Disconnections & Latency</h2>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify bg-federation-obsidian p-8 border border-federation-ivory/20 rounded-sm shadow-xl">
            <p>
              Maintaining a stable internet connection is the sole responsibility of the player. 
            </p>
            <p className="font-bold text-federation-ivory mt-4">3.1 Clock Continuation</p>
            <p>
              If a player loses connection to the Playing Zone, their virtual clock will <strong>continue to run</strong>. The match is not paused. If the player manages to reconnect before their allotted time expires, they may execute their move. 
            </p>
            <p className="font-bold text-federation-ivory mt-4">3.2 Time Forfeiture</p>
            <p>
              If the disconnected player's clock strikes zero before they reconnect, the Playing Zone will automatically award the win to the opposing team, resulting in a standard ELO deduction for the disconnected team.
            </p>
            <p className="font-bold text-federation-ivory mt-4">3.3 VCS Disconnects (Yellow/Red Card)</p>
            <p>
              If a player remains connected to the game but their VCS (Video/Audio) feed drops, they are strictly forbidden from executing a move until their camera feed is restored. Moving a piece while off-camera will result in an immediate forfeiture of the hand.
            </p>
          </div>
        </section>

        {/* 4.0 Anti-Cheating */}
        <section id="fair-play" className="scroll-mt-32">
          <h2 className="text-3xl font-bold uppercase tracking-wide mb-6 border-l-4 border-red-600 pl-6">4.0 Anti-Cheating & Collusion</h2>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p>
              The Fair Play Commission (FPL) actively monitors all sanctioned digital matches using the IDA Game Screening Tool to detect statistical anomalies and impossible calculation speeds.
            </p>
            <p className="font-bold text-red-400 mt-4">4.1 Illicit Partner Collusion</p>
            <p>
              In 2v2 dominoes, partners are strictly forbidden from playing in the same physical room during remote events. If IP tracking or audio feedback suggests partners are co-located without an Arbiter present, both players will face a one-year ban from the Federation.
            </p>
            <p className="font-bold text-red-400 mt-4">4.2 Algorithmic Assistance & Ghosting</p>
            <p>
              The use of background probability calculators, or allowing an unregistered higher-rated player to execute moves on your behalf ("Ghosting"), constitutes severe rating fraud.
            </p>
            <p className="font-bold text-federation-ivory mt-4">4.3 Post-Match Investigations</p>
            <p>
              Prizes and ELO adjustments will not be finalized until the FPL has completed its automated screening. If a team is disqualified post-match for cheating, the mathematical ELO points lost by their opponents will be immediately refunded and the bracket corrected.
            </p>
          </div>
        </section>

        {/* 5.0 Hybrid */}
        <section id="hybrid" className="scroll-mt-32">
          <h2 className="text-3xl font-bold uppercase tracking-wide mb-6">5.0 Hybrid Competitions</h2>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p>
              Hybrid competitions bridge the gap between physical cafe culture and global digital reach. Teams gather at official IDA Host Venues to play on digital tablets against teams located in other cities or governorates.
            </p>
            <p className="font-bold text-federation-ivory mt-4">5.1 Local Chief Arbiter (LCA)</p>
            <p>
              Each hybrid venue is strictly controlled by a physical Local Chief Arbiter. The LCA is responsible for verifying the identity of the players, enforcing the ban on mobile phones in the playing area, and ensuring no physical signaling occurs between the partners sitting at the terminal.
            </p>
            <p className="font-bold text-federation-ivory mt-4">5.2 Technical Infrastructure</p>
            <p>
              In Hybrid mode, the Host Venue is entirely responsible for the stability of the internet connection. If the venue experiences a total network failure, the LCA must immediately contact the central tournament director. The games will be paused globally, and the digital board states will be preserved until the connection is restored.
            </p>
          </div>
        </section>

      </article>
    </div>
  );
}
