import Link from 'next/link';

export const Footer = () => {
  return (
    <footer className="bg-[#020202] border-t border-white/10 text-white font-mono text-xs uppercase tracking-widest relative overflow-hidden">
      
      {/* Background Grid for texture */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          
          {/* BRAND COLUMN */}
          <div className="col-span-1 md:col-span-2">
            <h2 className="text-white text-3xl font-black tracking-tighter mb-4">I.D.A.</h2>
            <p className="text-white/40 leading-relaxed max-w-sm normal-case text-sm tracking-normal">
              The official digital infrastructure for competitive Iraqi Dominoes. 
              Powered by deterministic Rust logic, real-time multiplayer telemetry, and IS-MCTS simulation.
            </p>
          </div>

          {/* LINK COLUMN 1 */}
          <div className="flex flex-col gap-4">
            <h3 className="text-white/30 mb-2 border-b border-white/10 pb-2">Federation</h3>
            <Link href="/arena" className="text-white/60 hover:text-red-500 transition-colors">Sanctioned Play</Link>
            <Link href="/leaderboard" className="text-white/60 hover:text-red-500 transition-colors">Global Standings</Link>
            <Link href="/tournaments" className="text-white/60 hover:text-red-500 transition-colors">Tournaments</Link>
          </div>

          {/* LINK COLUMN 2 */}
          <div className="flex flex-col gap-4">
            <h3 className="text-white/30 mb-2 border-b border-white/10 pb-2">Technical</h3>
            <Link href="/rules" className="text-white/60 hover:text-white transition-colors">Rulebook</Link>
            <Link href="/dev" className="text-white/60 hover:text-white transition-colors">Engine Architecture</Link>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="text-white/60 hover:text-white transition-colors">GitHub Repository</a>
          </div>

        </div>

        {/* BOTTOM BAR (Telemetry & Copyright) */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-t border-white/10 pt-8">
          <div className="text-white/30 text-center md:text-left">
            © 2026 Iraqi Department of Entertainment Affairs.<br/>
            ALL RIGHTS RESERVED.
          </div>
          
          {/* Server Status Indicator */}
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
            <span className="text-white/70">SYS.STATUS: <span className="text-green-400 font-bold">OPERATIONAL</span></span>
          </div>
        </div>
      </div>
    </footer>
  );
};
