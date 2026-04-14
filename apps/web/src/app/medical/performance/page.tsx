'use client';

import Link from 'next/link';

export default function PerformancePage() {
  return (
    <div className="max-w-6xl mx-auto py-24 px-6 lg:px-12 w-full">
      <Link href="/medical" className="text-xs font-bold uppercase tracking-widest text-federation-ivory/50 hover:text-federation-ivory transition-colors mb-8 inline-block">
        &larr; Medical Directorate
      </Link>
      
      <header className="mb-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-tight mb-6">
          The Cognitive Athlete
        </h1>
        <p className="text-lg font-light opacity-80 max-w-3xl mx-auto leading-relaxed">
          Competitive dominoes is an endurance sport. Executing complex mathematical probabilities for hours on end requires optimal cerebral blood flow and neurological resilience. The Directorate advocates for a comprehensive, high-performance physical lifestyle.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Physical Conditioning */}
        <div className="lg:col-span-2 bg-federation-ivory/5 border border-federation-ivory/10 p-10 rounded-sm">
          <h2 className="text-2xl font-bold uppercase tracking-wide mb-6">Physical Conditioning Protocol</h2>
          <div className="space-y-6 font-light opacity-80 leading-relaxed">
            <p>
              Peak algorithmic calculation cannot be sustained by a sedentary body. Fatigue directly limits a player's ability to track opposing tiles and predict board locks in the late stages of a match.
            </p>
            <p>
              The Medical Directorate recommends a rigorous, mixed-training regimen to maximize capillary density and oxygen transport to the brain. A structured rotation of heavy resistance weightlifting, endurance running, and aquatic training (swimming) is highly advised to build the physical foundation required for elite cognitive stamina.
            </p>
          </div>
        </div>

        {/* Approved Supplementation */}
        <div className="bg-federation-obsidian border border-federation-ivory/20 p-10 rounded-sm">
          <h2 className="text-xl font-bold uppercase tracking-wide mb-6 border-b border-federation-ivory/20 pb-4">
            Safe Supplementation
          </h2>
          <p className="font-light opacity-70 text-sm mb-6 leading-relaxed">
            While pharmaceutical stimulants are strictly banned, optimizing neural recovery through legal supplementation is permitted and encouraged.
          </p>
          <ul className="space-y-4">
            <li className="flex flex-col">
              <span className="font-bold text-sm uppercase tracking-wider text-federation-ivory">Omega-3 (EPA/DHA)</span>
              <span className="font-mono text-xs opacity-60 mt-1">Cognitive maintenance</span>
            </li>
            <li className="flex flex-col">
              <span className="font-bold text-sm uppercase tracking-wider text-federation-ivory">Creatine Monohydrate</span>
              <span className="font-mono text-xs opacity-60 mt-1">Cellular ATP production</span>
            </li>
            <li className="flex flex-col">
              <span className="font-bold text-sm uppercase tracking-wider text-federation-ivory">L-Theanine & Caffeine</span>
              <span className="font-mono text-xs opacity-60 mt-1">Controlled focus without jitter</span>
            </li>
            <li className="flex flex-col">
              <span className="font-bold text-sm uppercase tracking-wider text-federation-ivory">Electrolyte Hydration</span>
              <span className="font-mono text-xs opacity-60 mt-1">Neural transmission efficiency</span>
            </li>
          </ul>
        </div>

        {/* Environmental Ergonomics */}
        <div className="lg:col-span-3 border-t border-federation-ivory/10 pt-16 mt-8">
          <h2 className="text-2xl font-bold uppercase tracking-wide mb-6">Environmental & Ergonomic Factors</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-lg font-bold uppercase mb-3 text-federation-ivory/80">Table Posture</h3>
              <p className="font-light opacity-70 text-sm leading-relaxed">
                Slouching compresses the diaphragm, reducing oxygen intake. IDA sanctioned venues are required to provide seating with structured lumbar support. Players should maintain an upright, neutral spine to preserve energy over multi-hour tournament brackets.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold uppercase mb-3 text-federation-ivory/80">Visual Strain</h3>
              <p className="font-light opacity-70 text-sm leading-relaxed">
                Staring intensely at the high-contrast pips on the board induces ocular fatigue. Utilizing architectural/geometric eyewear with specific anti-reflective or blue-light blocking lenses is recommended to mitigate the harsh lighting conditions often found in competitive arenas.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
