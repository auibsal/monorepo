import { Link } from '@/i18n/routing';

export const Footer = () => {
  return (
    <footer className="bg-white border-t-4 border-[#0a0a0a] text-[#0a0a0a] font-mono relative overflow-hidden z-20">
      
      {/* Background Architectural Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none"></div>

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 py-24 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-20">
          
          {/* THE ASSOCIATION */}
          <div className="col-span-1 md:col-span-5 pr-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-8 h-8 bg-black text-white flex flex-col justify-between p-1 rounded-sm">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                <div className="w-full h-[1px] bg-white/50"></div>
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full self-end"></div>
              </div>
              <h2 className="text-[#0a0a0a] text-2xl font-black tracking-tighter uppercase">Iraqi Domino<br/>Association</h2>
            </div>
            <p className="text-black/50 leading-relaxed normal-case text-sm tracking-normal font-sans border-l-2 border-red-600 pl-4 bg-gray-50 p-4">
              The supreme authority and international governing body for the sport of Iraqi Dominoes. Dedicated to the preservation of café heritage and the advancement of absolute mathematical strategy.
            </p>
          </div>

          {/* COLUMNS */}
          <div className="col-span-1 md:col-span-2 flex flex-col gap-5">
            <h3 className="text-black/40 font-bold text-xs tracking-[0.2em] mb-2 uppercase border-b border-black/10 pb-2">The Registry</h3>
            <Link href="/arena" className="text-sm font-bold text-black/70 hover:text-red-600 hover:translate-x-1 transition-all">Sanctioned Arenas</Link>
            <Link href="/leaderboard" className="text-sm font-bold text-black/70 hover:text-red-600 hover:translate-x-1 transition-all">World Rankings</Link>
            <Link href="/tournaments" className="text-sm font-bold text-black/70 hover:text-red-600 hover:translate-x-1 transition-all">Championships</Link>
          </div>

          <div className="col-span-1 md:col-span-2 flex flex-col gap-5">
            <h3 className="text-black/40 font-bold text-xs tracking-[0.2em] mb-2 uppercase border-b border-black/10 pb-2">Committees</h3>
            <Link href="/rules" className="text-sm font-bold text-black/70 hover:text-red-600 hover:translate-x-1 transition-all">Rules & Regulations</Link>
            <Link href="/disputes" className="text-sm font-bold text-black/70 hover:text-red-600 hover:translate-x-1 transition-all">Match Disputes</Link>
            <Link href="/membership" className="text-sm font-bold text-black/70 hover:text-red-600 hover:translate-x-1 transition-all">Club Membership</Link>
          </div>

          <div className="col-span-1 md:col-span-3 flex flex-col gap-5 bg-[#fafafa] border border-black/10 p-6 shadow-sm">
            <h3 className="text-black/40 font-bold text-xs tracking-[0.2em] mb-2 uppercase">The Engine Oracle</h3>
            <Link href="/dev" className="text-sm font-bold text-red-600 hover:text-black hover:translate-x-1 transition-all">Access Dev Terminal →</Link>
            <p className="text-xs text-black/40 normal-case font-sans mt-2">
              Powered by IS-MCTS and Rust WebAssembly. Real-time telemetry actively monitored.
            </p>
          </div>

        </div>

        {/* BOTTOM FEDERATION STAMP */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-t border-black/10 pt-10">
          <div className="text-black/40 font-bold text-xs uppercase tracking-[0.2em]">
            © {new Date().getFullYear()} I.D.A.<br/>
            BAGHDAD, IRAQ. ALL RIGHTS RESERVED.
          </div>
          
          <div className="flex items-center gap-4 bg-white border border-black/20 shadow-sm px-6 py-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
            <span className="text-black/60 font-bold text-[10px] tracking-[0.3em]">FEDERATION SERVERS: <span className="text-green-600">ONLINE</span></span>
          </div>
        </div>
      </div>
    </footer>
  );
};
