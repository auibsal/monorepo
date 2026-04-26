'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/i18n/routing';

export default function CsrPage() {
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
    { id: 'preamble', title: '0.0 Introduction & Mission' },
    { id: 'inclusion', title: '1.0 Diversity & Inclusion' },
    { id: 'community', title: '2.0 Community & Support' },
    { id: 'environment', title: '3.0 Environmental Protocol' },
    { id: 'conflict', title: '4.0 Conflict of Interest' },
  ];

  return (
    <div className="max-w-[90rem] mx-auto py-16 px-6 lg:px-12 w-full flex flex-col lg:flex-row gap-12 relative">
      
      {/* Interactive Sidebar (Table of Contents) */}
      <aside className="w-full lg:w-1/4 lg:sticky lg:top-32 h-fit mb-12 lg:mb-0 custom-scrollbar overflow-y-auto max-h-[80vh] pr-4">
        <Link 
          href="/" 
          className="text-xs font-bold uppercase tracking-widest text-association-black/50 hover:text-association-black transition-colors mb-8 inline-block"
        >
          &larr; Return to Headquarters
        </Link>
        <h3 className="text-sm font-bold uppercase tracking-widest border-b border-black/20 pb-4 mb-6">
          CSR & Ethics Index
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
                  ? 'text-association-black font-bold translate-x-2'
                  : 'text-association-black/50 hover:text-association-black'
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
        <header className="border-b-2 border-black/30 pb-12">
          <div className="flex items-center gap-4 mb-6">
            <span className="px-3 py-1 bg-association-white text-association-black text-xs font-bold uppercase tracking-widest rounded-sm">
              Official Guidelines
            </span>
            <span className="text-sm font-mono text-association-black/60">IDA-CSR-2026</span>
          </div>
          <h2 className="text-xl md:text-2xl font-medium tracking-wide mb-4 opacity-80">

          </h2>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight uppercase leading-none mb-6">
            Corporate Social <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-association-black to-gray-800">
              Responsibility
            </span>
          </h1>
          <p className="text-lg font-light opacity-80 leading-relaxed max-w-3xl">
            The IDA transcends algorithmic ratings and tournament logistics. We are dedicated to ensuring that the sport of dominoes acts as a catalyst for positive societal impact, adhering to the highest standards of international sporting governance.
          </p>
        </header>

        {/* 0.0 Preamble */}
        <section id="preamble" className="scroll-mt-32">
          <h2 className="text-3xl font-bold uppercase tracking-wide mb-6">0.0 Introduction & Mission</h2>
          <div className="bg-black/5 p-8 rounded-sm border border-black/10 space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p>
              [span_0](start_span)Corporate Social Responsibility (CSR) is a self-regulating operational model that incorporates social and environmental concerns into the Federation's planning and operations[span_0](end_span). [span_1](start_span)The primary goal is to ensure that all of our administrative and competitive activities positively affect Iraqi society as a whole[span_1](end_span). 
            </p>
            <p>
              [span_2](start_span)This management concept goes far beyond our basic legal obligations; it aims at making the Federation socially accountable to itself, its stakeholders, its players, and the general public[span_2](end_span).
            </p>
          </div>
        </section>

        {/* 1.0 Inclusion */}
        <section id="inclusion" className="scroll-mt-32">
          <h2 className="text-3xl font-bold uppercase tracking-wide mb-6">1.0 Diversity & Inclusion</h2>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p className="font-bold text-association-black mt-4">1.1 Anti-Discrimination Policy</p>
            <p>
              [span_3](start_span)Our stance on this matter includes a strict, zero-tolerance policy for any kind of discrimination based on age, ethnicity, origin, political belief, race, religion, sex, gender, sexual orientation, disability, language, or cultural grounds[span_3](end_span). 
            </p>
            <p className="font-bold text-association-black mt-4">1.2 Gender Equality and Equity</p>
            <p>
              [span_4](start_span)The IDA works tirelessly to increase the number of women in all aspects of dominoes life[span_4](end_span). [span_5](start_span)This involves not only developing specific programs to increase female participation in competitive brackets, but actively seeking their participation in leading institutional roles[span_5](end_span). [span_6](start_span)We encourage women to pursue careers as elite players, national arbiters, trainers, and Federation officers[span_6](end_span).
            </p>
            <p className="font-bold text-association-black mt-4">1.3 Rehabilitation & Accessibility</p>
            <p>
              [span_7](start_span)Dominoes has proven to be an effective tool to help rehabilitate individuals facing life difficulties, ranging from criminality to substance abuse[span_7](end_span). [span_8](start_span)The Federation encourages the development of programs that utilize the strategic focus of the game to provide individuals an opportunity to transform their lives[span_8](end_span).
            </p>
          </div>
        </section>

        {/* 2.0 Community */}
        <section id="community" className="scroll-mt-32">
          <h2 className="text-3xl font-bold uppercase tracking-wide mb-6">2.0 Community & Support</h2>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p className="font-bold text-association-black mt-4">2.1 Protecting Our Seniors</p>
            <p>
              [span_9](start_span)The IDA strives to protect senior players who, after having devoted their lives to the sport and cafe culture, find themselves in an unstable financial situation[span_9](end_span). [span_10](start_span)We seek to build support programs and seek external funding to honor their legacy[span_10](end_span).
            </p>
            <p className="font-bold text-association-black mt-4">2.2 Supporting Host Venues and Affiliates</p>
            <p>
              [span_11](start_span)We are committed to helping all local Affiliates promote the sport by providing technical infrastructure and, in the future, financial assistance via Federation Development Funds[span_11](end_span). [span_12](start_span)We strongly urge our Affiliates to engage in their own local CSR activities and partner with institutions sharing similar objectives[span_12](end_span).
            </p>
          </div>
        </section>

        {/* 3.0 Environment */}
        <section id="environment" className="scroll-mt-32">
          <h2 className="text-3xl font-bold uppercase tracking-wide mb-6">3.0 Environmental Protocol</h2>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify">
            <p>
              [span_13](start_span)The Federation stays focused on adopting environmental solutions that lessen our footprint[span_13](end_span). [span_14](start_span)By transitioning exclusively to the digital IDA Terminal for scoring and ELO calculations, we commit to minimizing physical waste generation and paper pollution, integrating these clean efforts into our day-to-day tournament operations[span_14](end_span).
            </p>
            <p>
              [span_15](start_span)Furthermore, in order to minimize atmospheric emissions, we strive to reduce unnecessary travel by making full use of our advanced Video Conferencing Systems (VCS) to replace physical face-to-face administrative meetings whenever possible[span_15](end_span).
            </p>
          </div>
        </section>

        {/* 4.0 Conflict of Interest */}
        <section id="conflict" className="scroll-mt-32">
          <h2 className="text-3xl font-bold uppercase tracking-wide mb-6 border-l-4 border-red-600 pl-6">4.0 Conflict of Interest & Employment</h2>
          <div className="space-y-4 font-light opacity-80 leading-relaxed text-justify bg-white p-8 border border-black/20 rounded-sm shadow-xl">
            <p>
              [span_16](start_span)To maintain the integrity of the Federation, these guidelines are enacted to avoid conflicts of interest and loyalty associated with employment and official appointments[span_16](end_span).
            </p>
            <ul className="space-y-4 mt-6">
              <li className="flex items-start gap-4">
                <span className="text-red-500 font-bold mt-1">1.</span>
                [span_17](start_span)<span><strong>Nepotism & Favoritism:</strong> No IDA official or employee may make, participate in, or attempt to influence Employment Decisions or Business Decisions involving a Relative[span_17](end_span).</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="text-red-500 font-bold mt-1">2.</span>
                [span_18](start_span)<span><strong>Chain of Command:</strong> There can be no direct reporting relationship between Relatives within the Federation's administrative structure[span_18](end_span).</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="text-red-500 font-bold mt-1">3.</span>
                [span_19](start_span)<span><strong>Auditing Restrictions:</strong> No Relative of any Federation official or executive may serve in an auditing function, either internally or as a member of an external auditing team[span_19](end_span).</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="text-red-500 font-bold mt-1">4.</span>
                [span_20](start_span)<span><strong>Disciplinary Action:</strong> Concerns or complaints about possible violations of these Guidelines must be submitted to the Federation President[span_20](end_span). [span_21](start_span)Confirmed violations shall be treated as severe breaches of the Ethics Code and may result in disciplinary actions up to and including immediate dismissal[span_21](end_span).</span>
              </li>
            </ul>
          </div>
        </section>

      </article>
    </div>
  );
}
